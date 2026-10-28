/**
 * chat-email.helper.ts
 * Looks up recipient info and delegates to the email service.
 * Kept separate to avoid circular imports with chat.socket.ts.
 */
import { prisma } from '../prisma/client.js';
import { sendChatNotificationEmail } from '../modules/email/email.service.js';

export const notifyOfflineRecipient = async (
  recipientId: string,
  senderName: string,
  conversationId: string,
  previewText: string
): Promise<void> => {
  const [recipient, conversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, name: true },
    }),
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { listing: { select: { title: true } } },
    }),
  ]);

  if (!recipient?.email || !conversation) return;

  await sendChatNotificationEmail(
    recipient.email,
    recipient.name,
    senderName,
    conversation.listing.title,
    conversationId,
    previewText
  );
};
