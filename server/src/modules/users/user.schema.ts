import { z } from 'zod';

export const updateProfileSchema = z.object({
  email: z.string().email().max(254).optional().nullable().or(z.literal('')),
  hostel: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  upiId: z
    .string()
    .regex(/^[\w.\-]{2,}@[\w]{2,}$/, 'Invalid UPI ID format (e.g. yourname@okbank)')
    .optional()
    .nullable()
    .or(z.literal('')),
  upiName: z.string().max(100).optional().nullable().or(z.literal('')),
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
}).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
