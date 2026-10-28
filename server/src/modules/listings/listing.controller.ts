import { Request, Response, NextFunction } from 'express';
import {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  toggleSaveListing,
  getMyListings,
  getMySavedListings,
} from './listing.service.js';

import { listingQuerySchema } from './listing.schema.js';

export const getListingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = listingQuerySchema.parse(req.query);
    const result = await getListings(validatedQuery, req.user?.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getListingDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const listing = await getListingById(id, req.user?.id);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

export const createListingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const result = await createListing(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const updateListingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const listing = await updateListing(id, req.user.id, req.body);
    res.json({ listing });
  } catch (err) {
    next(err);
  }
};

export const deleteListingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await deleteListing(id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const saveListingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await toggleSaveListing(id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getMyListingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const listings = await getMyListings(req.user.id);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};

export const getMySavedHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const listings = await getMySavedListings(req.user.id);
    res.json({ listings });
  } catch (err) {
    next(err);
  }
};
