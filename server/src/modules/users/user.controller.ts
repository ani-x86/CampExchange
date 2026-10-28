import { Request, Response, NextFunction } from 'express';
import { getPublicProfile, updateProfile } from './user.service.js';

export const getProfileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await getPublicProfile(id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const updateMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }
    const user = await updateProfile(req.user.id, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};
