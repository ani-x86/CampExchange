import { z } from 'zod';

export const describeSchema = z.object({
  text: z.string().min(5).max(1500),
  title: z.string().max(100).optional(),
  category: z.string().max(100).nullable().optional(),
  price: z.number().nonnegative().optional(),
  tone: z.enum(['friendly', 'neutral', 'concise']).optional(),
});

export const suggestSchema = z.object({
  title: z.string().max(200),
});
