import { Server, Socket } from 'socket.io';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tokenVersion?: number;
}

export const registerChatSocket = (io: Server) => {
  // Authentication middleware via cookie handshake
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: Missing cookies'));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.cx_token;

      if (!token) {
        return next(new Error('Authentication error: Missing token'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; tokenVersion: number };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { tokenVersion: true, isActive: true, mustChangePassword: true },
      });
      if (
        !user ||
        !user.isActive ||
        user.mustChangePassword ||
        user.tokenVersion !== payload.tokenVersion
      ) {
        return next(new Error('Authentication error: Invalid session'));
      }
      socket.userId = payload.userId;
      socket.tokenVersion = payload.tokenVersion;
      next();
    } catch {
      next(new Error('Authentication error: Invalid session'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Join personal user notification room
    socket.join(`user:${userId}`);

    // Join conversation room
    socket.on('chat:join', async (data: { conversationId: string }) => {
      const { conversationId } = data;
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (conversation && (conversation.buyerId === userId || conversation.sellerId === userId)) {
        socket.join(`conv:${conversationId}`);
      }
    });

    // Realtime chat message send
    socket.on(
      'chat:send',
      async (data: {
        conversationId: string;
        body?: string;
        imageUrl?: string;
        tempId?: string;
      }) => {
        try {
          const { conversationId, body, imageUrl, tempId } = data;

          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (
            !conversation ||
            (conversation.buyerId !== userId && conversation.sellerId !== userId)
          ) {
            socket.emit('chat:error', { message: 'Unauthorized for this conversation' });
            return;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: userId,
              type: imageUrl ? 'IMAGE' : 'TEXT',
              body: body || null,
              imageUrl: imageUrl || null,
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
            conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

          // Broadcast to conversation room
          io.to(`conv:${conversationId}`).emit('chat:message', {
            ...message,
            tempId,
          });

          // Notify recipient inbox
          io.to(`user:${recipientId}`).emit('inbox:update', {
            conversationId,
            message: {
              id: message.id,
              body: message.body,
              type: message.type,
              createdAt: message.createdAt,
            },
          });

          // Email recipient if they're offline (not in the conversation room)
          // Throttled to 1 per conversation per 15 min via email.service
          const { resendEnabled } = await import('../config/env.js');
          if (resendEnabled && message.body) {
            const recipientSockets = await io.in(`conv:${conversationId}`).fetchSockets();
            const recipientOnline = recipientSockets.some((s) => (s as any).userId === recipientId);

            if (!recipientOnline) {
              import('./chat-email.helper.js')
                .then(({ notifyOfflineRecipient }) => {
                  notifyOfflineRecipient(
                    recipientId,
                    message.sender.name,
                    conversationId,
                    message.body ?? ''
                  ).catch(() => {});
                })
                .catch(() => {});
            }
          }
        } catch {
          socket.emit('chat:error', { message: 'Failed to send message' });
        }
      }
    );


    // Typing indicator
    socket.on('chat:typing', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('chat:typing', {
        conversationId: data.conversationId,
        userId,
      });
    });

    // Read receipt
    socket.on('chat:read', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data;
        const now = new Date();

        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) return;

        const isBuyer = conversation.buyerId === userId;
        await prisma.conversation.update({
          where: { id: conversationId },
          data: isBuyer ? { buyerLastReadAt: now } : { sellerLastReadAt: now },
        });

        socket.to(`conv:${conversationId}`).emit('chat:read', {
          conversationId,
          userId,
          readAt: now.toISOString(),
        });
      } catch {
        // ignore
      }
    });

    socket.on('disconnect', () => {
      // clean up
    });
  });
};
