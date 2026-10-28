import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { updateProfileSchema } from './user.schema.js';
import { getProfileHandler, updateMeHandler } from './user.controller.js';

export const userRouter = Router();

userRouter.get('/me', requireAuth, (req, res, next) => {
  // redirect or handle current profile
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
    return;
  }
  req.params.id = req.user.id;
  getProfileHandler(req, res, next);
});
userRouter.patch('/me', requireAuth, validateRequest(updateProfileSchema), updateMeHandler);
userRouter.get('/:id', getProfileHandler);
