import { z } from 'zod';

export const createOrderSchema = z.object({
  listingId: z.string().min(1, 'Listing ID is required'),
});

export const submitProofSchema = z.object({
  proofUrl: z.string().min(1, 'Payment proof screenshot URL is required'),
  proofCloudinaryId: z.string().optional(),
  utr: z
    .string()
    .regex(/^\d{12}$/, 'UTR / Transaction Reference must be 12 digits')
    .optional()
    .or(z.literal('')),
});

export const rejectOrderSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters').max(200),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type SubmitProofInput = z.infer<typeof submitProofSchema>;
export type RejectOrderInput = z.infer<typeof rejectOrderSchema>;
