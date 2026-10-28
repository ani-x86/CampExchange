import { prisma } from '../../prisma/client.js';
import { CreateOrderInput, SubmitProofInput, RejectOrderInput } from './order.schema.js';
import { io } from '../../index.js';
import { resendEnabled } from '../../config/env.js';

export const buildUpiUri = ({
  pa,
  pn,
  am,
  tn,
}: {
  pa: string;
  pn: string;
  am: number;
  tn: string;
}): string => {
  const params = new URLSearchParams();
  params.set('pa', pa);
  params.set('pn', pn);
  params.set('am', am.toFixed(2));
  params.set('cu', 'INR');
  params.set('tn', tn);
  return `upi://pay?${params.toString()}`;
};

export const createOrder = async (buyerId: string, input: CreateOrderInput) => {
  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { seller: true },
  });

  if (!listing) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Listing not found' };
  }

  if (listing.sellerId === buyerId) {
    throw { status: 400, code: 'SELF_PURCHASE', message: 'You cannot buy your own item' };
  }

  if (listing.status !== 'ACTIVE') {
    throw {
      status: 400,
      code: 'LISTING_UNAVAILABLE',
      message: `Listing is ${listing.status.toLowerCase()}`,
    };
  }

  if (!listing.seller.upiId) {
    throw {
      status: 400,
      code: 'NO_PAYMENT_SETUP',
      message: "Seller hasn't set up payments – chat instead",
    };
  }

  // Ensure no existing active order for this listing
  const activeOrder = await prisma.order.findFirst({
    where: {
      listingId: listing.id,
      status: { in: ['PENDING_PAYMENT', 'PROOF_SUBMITTED'] },
    },
  });

  if (activeOrder) {
    throw {
      status: 409,
      code: 'ORDER_EXISTS',
      message: 'This item is already reserved by another student',
    };
  }

  // Create order and reserve listing in a transaction
  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
        amount: listing.price,
        status: 'PENDING_PAYMENT',
      },
      include: {
        listing: true,
        seller: {
          select: { id: true, name: true, upiId: true, upiName: true },
        },
        buyer: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.listing.update({
      where: { id: listing.id },
      data: { status: 'RESERVED' },
    }),
  ]);

  // Ensure conversation exists and post SYSTEM message
  let conversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
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
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: buyerId,
      type: 'SYSTEM',
      body: `Order #${order.id.slice(-6)} created for ₹${order.amount}. Listing reserved.`,
      orderId: order.id,
    },
  });

  if (io) {
    io.to(`user:${listing.sellerId}`).emit('inbox:update', { conversationId: conversation.id });
    io.to(`user:${listing.sellerId}`).emit('order:update', { orderId: order.id, status: 'PENDING_PAYMENT' });
  }

  const upiUri = buildUpiUri({
    pa: listing.seller.upiId!,
    pn: listing.seller.upiName || listing.seller.name,
    am: order.amount,
    tn: `CampExchange-${order.id.slice(-6)}`,
  });

  return {
    order,
    payee: {
      upiId: listing.seller.upiId,
      upiName: listing.seller.upiName || listing.seller.name,
    },
    upiUri,
  };
};

export const getOrderById = async (orderId: string, userId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: {
        include: {
          seller: {
            select: { id: true, name: true, upiId: true, upiName: true, branch: true, year: true },
          },
        },
      },
      buyer: {
        select: { id: true, name: true, email: true, branch: true, year: true, avatarUrl: true },
      },
      seller: {
        select: { id: true, name: true, email: true, upiId: true, upiName: true },
      },
    },
  });

  if (!order) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
  }

  if (order.buyerId !== userId && order.sellerId !== userId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Not authorized to view this order' };
  }

  const upiUri =
    order.seller.upiId
      ? buildUpiUri({
          pa: order.seller.upiId,
          pn: order.seller.upiName || order.seller.name,
          am: order.amount,
          tn: `CampExchange-${order.id.slice(-6)}`,
        })
      : '';

  return {
    order: {
      ...order,
      listing: order.listing,
    },
    payee: {
      upiId: order.seller.upiId,
      upiName: order.seller.upiName || order.seller.name,
    },
    upiUri,
  };
};

export const submitPaymentProof = async (
  orderId: string,
  buyerId: string,
  input: SubmitProofInput
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true },
  });

  if (!order) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
  }

  if (order.buyerId !== buyerId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Only the buyer can submit payment proof' };
  }

  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PROOF_SUBMITTED') {
    throw {
      status: 400,
      code: 'INVALID_STATUS',
      message: `Cannot submit proof for order in status ${order.status}`,
    };
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PROOF_SUBMITTED',
      proofUrl: input.proofUrl,
      proofCloudinaryId: input.proofCloudinaryId ?? null,
      utr: input.utr || null,
    },
  });

  // Find conversation and post PAYMENT_PROOF card
  const conversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: order.listingId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
    },
  });

  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: buyerId,
        type: 'PAYMENT_PROOF',
        body: `Payment proof submitted for ₹${order.amount}${input.utr ? ` (UTR: ${input.utr})` : ''}`,
        imageUrl: input.proofUrl,
        orderId: order.id,
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (io) {
      io.to(`conv:${conversation.id}`).emit('chat:message');
      io.to(`user:${order.sellerId}`).emit('inbox:update', { conversationId: conversation.id });
      io.to(`user:${order.sellerId}`).emit('order:update', {
        orderId: order.id,
        status: 'PROOF_SUBMITTED',
      });
    }
  }

  // Queue email notification to seller (non-fatal)
  if (resendEnabled) {
    import('../email/email.service.js').then(({ sendProofReceivedEmail }) => {
      prisma.user.findUnique({ where: { id: order.sellerId }, select: { email: true, name: true } })
        .then((seller) => {
          if (seller?.email) {
            sendProofReceivedEmail(seller.email, seller.name, order.listing.title, order.amount, order.id).catch(() => {});
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }

  return updatedOrder;
};

export const confirmOrder = async (orderId: string, sellerId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true },
  });

  if (!order) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
  }

  if (order.sellerId !== sellerId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Only the seller can confirm receipt' };
  }

  if (order.status !== 'PROOF_SUBMITTED') {
    throw {
      status: 400,
      code: 'INVALID_STATUS',
      message: 'Can only confirm order after proof has been submitted',
    };
  }

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED' },
    }),
    prisma.listing.update({
      where: { id: order.listingId },
      data: { status: 'SOLD' },
    }),
  ]);

  // Post confirmation message to conversation
  const conversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: order.listingId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
    },
  });

  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sellerId,
        type: 'SYSTEM',
        body: `Seller confirmed payment receipt. Transaction completed! Item marked as SOLD.`,
        orderId: order.id,
      },
    });

    if (io) {
      io.to(`conv:${conversation.id}`).emit('chat:message');
      io.to(`user:${order.buyerId}`).emit('inbox:update', { conversationId: conversation.id });
      io.to(`user:${order.buyerId}`).emit('order:update', { orderId: order.id, status: 'CONFIRMED' });
    }
  }

  // Email buyer on confirmation (non-fatal)
  if (resendEnabled) {
    import('../email/email.service.js').then(({ sendOrderConfirmedEmail }) => {
      prisma.user.findUnique({ where: { id: order.buyerId }, select: { email: true, name: true } })
        .then((buyer) => {
          if (buyer?.email) {
            sendOrderConfirmedEmail(buyer.email, buyer.name, order.listing.title, order.amount).catch(() => {});
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }

  return updatedOrder;
};

export const rejectOrder = async (
  orderId: string,
  sellerId: string,
  input: RejectOrderInput
) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true },
  });

  if (!order) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
  }

  if (order.sellerId !== sellerId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Only the seller can reject payment' };
  }

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REJECTED',
        rejectReason: input.reason,
      },
    }),
    prisma.listing.update({
      where: { id: order.listingId },
      data: { status: 'ACTIVE' },
    }),
  ]);

  const conversation = await prisma.conversation.findUnique({
    where: {
      listingId_buyerId_sellerId: {
        listingId: order.listingId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
      },
    },
  });

  if (conversation) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: sellerId,
        type: 'SYSTEM',
        body: `Seller rejected payment proof. Reason: "${input.reason}". Listing returned to ACTIVE.`,
        orderId: order.id,
      },
    });

    if (io) {
      io.to(`conv:${conversation.id}`).emit('chat:message');
      io.to(`user:${order.buyerId}`).emit('inbox:update', { conversationId: conversation.id });
      io.to(`user:${order.buyerId}`).emit('order:update', { orderId: order.id, status: 'REJECTED' });
    }
  }

  // Email buyer on rejection (non-fatal)
  if (resendEnabled) {
    import('../email/email.service.js').then(({ sendOrderRejectedEmail }) => {
      prisma.user.findUnique({ where: { id: order.buyerId }, select: { email: true, name: true } })
        .then((buyer) => {
          if (buyer?.email) {
            sendOrderRejectedEmail(buyer.email, buyer.name, order.listing.title, input.reason).catch(() => {});
          }
        })
        .catch(() => {});
    }).catch(() => {});
  }

  return updatedOrder;
};

export const cancelOrder = async (orderId: string, buyerId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { listing: true },
  });

  if (!order) {
    throw { status: 404, code: 'NOT_FOUND', message: 'Order not found' };
  }

  if (order.buyerId !== buyerId) {
    throw { status: 403, code: 'FORBIDDEN', message: 'Only the buyer can cancel this order' };
  }

  if (order.status !== 'PENDING_PAYMENT') {
    throw {
      status: 400,
      code: 'CANNOT_CANCEL',
      message: 'Order can only be cancelled before submitting proof',
    };
  }

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    }),
    prisma.listing.update({
      where: { id: order.listingId },
      data: { status: 'ACTIVE' },
    }),
  ]);

  return updatedOrder;
};

export const getMyOrders = async (userId: string, role: 'buyer' | 'seller' = 'buyer') => {
  const where = role === 'buyer' ? { buyerId: userId } : { sellerId: userId };

  const orders = await prisma.order.findMany({
    where,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          price: true,
          images: true,
          status: true,
          category: true,
        },
      },
      buyer: { select: { id: true, name: true, avatarUrl: true } },
      seller: { select: { id: true, name: true, avatarUrl: true, upiId: true, upiName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return orders;
};

// 30-minute auto-cancel background cleaner
export const cancelStaleOrders = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      createdAt: { lt: thirtyMinutesAgo },
    },
  });

  for (const order of staleOrders) {
    try {
      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        }),
        prisma.listing.update({
          where: { id: order.listingId },
          data: { status: 'ACTIVE' },
        }),
      ]);
    } catch {
      // ignore
    }
  }
};

// Run stale check every 5 minutes
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    cancelStaleOrders().catch(() => {});
  }, 5 * 60 * 1000);
}
