import { prisma } from '../../prisma/client.js';
import { StartConversationInput, SendMessageInput } from './chat.schema.js';
import { io } from '../../index.js';

export const getOrCreateConversation = async (
  buyerId: string,
  input: StartConversationInput
) => {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: {
      seller: {
        select: { id: true, name: true, branch: true, year: true, avatarUrl: true },
      },
    },
  });

  if (!listing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Listing not found' };
  }

  if (listing.sellerId === buyerId) {
    throw { status: 400, code: 'SELF_CHAT', message: 'You cannot chat on your own listing' };
  }

  let conversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
      },
    },
    include: {
      listing: {
        select: { id: true, title: true, price: true, images: true, status: true },
      },
      seller: {
        select: { id: true, name: true, avatarUrl: true, branch: true, year: true },
      },
      buyer: {
        select: { id: true, name: true, avatarUrl: true, branch: true, year: true },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
      },
      include: {
        listing: {
          select: { id: true, title: true, price: true, images: true, status: true },
        },
        seller: {
          select: { id: true, name: true, avatarUrl: true, branch: true, year: true },
        },
        buyer: {
          select: { id: true, name: true, avatarUrl: true, branch: true, year: true },
        },
      },
    });
  }

  return conversation;
};

export const getInbox = async (
  userId: string,
  filter: 'all' | 'buying' | 'selling' | 'unread' = 'all'
) => {
  const where: any = {};

  if (filter === 'buying') {
    where.buyerId = userId;
  } else if (filter === 'selling') {
    where.sellerId = userId;
  } else {
    where.OR = [{ buyerId: userId }, { sellerId: userId }];
  }

  const conversations = await prisma.conversation.findMany({
    where,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          status: true,
        },
      },
      buyer: {
        select: { id: true, name: true, avatarUrl: true, branch: true, year: true },
      },
      seller: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          branch: true,
          year: true,
          upiId: true,
          upiName: true,
        },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  });

  // Calculate unread count per thread
  const formatted = await Promise.all(
    conversations.map(async (conv: (typeof conversations)[number]) => {
      const isBuyer = conv.buyerId === userId;
      const otherUser = isBuyer ? conv.seller : conv.buyer;
      const lastReadAt = isBuyer ? conv.buyerLastReadAt : conv.sellerLastReadAt;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: lastReadAt ? { gt: lastReadAt } : undefined,
        },
      });

      return {
        id: conv.id,
        listingId: conv.listingId,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        otherUser,
        isBuyer,
        lastMessage: conv.messages[0] || null,
        listing: conv.listing,
      };
    })
  );

  if (filter === 'unread') {
    return formatted.filter((c: (typeof formatted)[number]) => c.unreadCount > 0);
  }

  return formatted;
};

export const getMessages = async (
  conversationId: string,
  userId: string,
  cursor?: string,
  limit: number = 50
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      listing: {
        include: {
          seller: { select: { id: true, name: true, upiId: true, upiName: true } },
          orders: {
            where: {
              status: { in: ['PENDING_PAYMENT', 'PROOF_SUBMITTED', 'CONFIRMED'] },
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      buyer: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, avatarUrl: true, upiId: true, upiName: true } },
    },
  });

  if (
    !conversation ||
    (conversation.buyerId !== userId && conversation.sellerId !== userId)
  ) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Not authorized for this conversation' };
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    take: limit,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'asc' },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  // Automatically mark as read
  const now = new Date();
  const isBuyer = conversation.buyerId === userId;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now },
  });

  return {
    conversation: {
      ...conversation,
      listing: {
        ...conversation.listing,
        activeOrder: conversation.listing.orders[0] || null,
      },
    },
    messages,
  };
};

export const sendMessage = async (
  conversationId: string,
  senderId: string,
  input: SendMessageInput
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (
    !conversation ||
    (conversation.buyerId !== senderId && conversation.sellerId !== senderId)
  ) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Not authorized for this conversation' };
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      type: input.type || 'TEXT',
      body: input.body || null,
      imageUrl: input.imageUrl || null,
    },
    include: {
      sender: {
        select: { id: true, name: true, avatarUrl: true },
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  const recipientId =
    conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;

  if (io) {
    io.to(`conv:${conversationId}`).emit('chat:message', {
      ...message,
      tempId: input.tempId,
    });
    io.to(`user:${recipientId}`).emit('inbox:update', { conversationId });
  }

  return message;
};

export const markRead = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Conversation not found' };
  }

  const now = new Date();
  const isBuyer = conversation.buyerId === userId;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now },
  });

  return { ok: true, readAt: now.toISOString() };
};
