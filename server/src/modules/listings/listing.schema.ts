import { z } from 'zod';

export const conditions = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;

export const createListingSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(3000),
  category: z.string().min(2, 'Category is required'),
  condition: z.enum(conditions),
  price: z.coerce.number().int().min(1, 'Price must be at least ₹1'),
  negotiable: z.boolean().default(false),
  images: z.array(z.string().url()).min(1, 'At least 1 image is required').max(6, 'Maximum 6 images allowed'),
  tags: z.array(z.string()).optional(),
});

export const updateListingSchema = createListingSchema.partial().extend({
  status: z.enum(['ACTIVE', 'RESERVED', 'SOLD', 'REMOVED']).optional(),
});

export const listingQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  condition: z.enum(conditions).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['new', 'price_asc', 'price_desc']).default('new'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingQueryInput = z.infer<typeof listingQuerySchema>;
