import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { createListingSchema, updateListingSchema } from './listing.schema.js';
import {
  getListingsHandler,
  getListingDetailHandler,
  createListingHandler,
  updateListingHandler,
  deleteListingHandler,
  saveListingHandler,
  getMyListingsHandler,
  getMySavedHandler,
} from './listing.controller.js';

export const listingRouter = Router();

// Public / optional auth listings feed
listingRouter.get('/', getListingsHandler);
listingRouter.get('/:id', getListingDetailHandler);

// Protected routes
listingRouter.post('/', requireAuth, validateRequest(createListingSchema), createListingHandler);
listingRouter.patch('/:id', requireAuth, validateRequest(updateListingSchema), updateListingHandler);
listingRouter.delete('/:id', requireAuth, deleteListingHandler);
listingRouter.post('/:id/save', requireAuth, saveListingHandler);
listingRouter.delete('/:id/save', requireAuth, saveListingHandler);

// Router for /api/me listings & saved
export const meRouter = Router();
meRouter.get('/listings', requireAuth, getMyListingsHandler);
meRouter.get('/saved', requireAuth, getMySavedHandler);
