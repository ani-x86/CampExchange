import { z } from 'zod';

export const startConversationSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
});

export const sendMessageSchema = z.object({
  type: z.enum(['TEXT', 'IMAGE', 'PAYMENT_PROOF', 'SYSTEM']).default('TEXT'),
  body: z.string().max(2000, 'Message cannot exceed 2000 characters').optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  tempId: z.string().optional(),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
