import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { generalRateLimiter } from '../../middleware/rateLimit.js';
import { validateRequest } from '../../middleware/validate.js';
import { describeHandler, suggestHandler } from './nlp.controller.js';
import { describeSchema, suggestSchema } from './nlp.schema.js';

export const nlpRouter = Router();

nlpRouter.post(
  '/describe',
  requireAuth,
  generalRateLimiter,
  validateRequest(describeSchema),
  describeHandler
);
nlpRouter.post(
  '/suggest',
  requireAuth,
  generalRateLimiter,
  validateRequest(suggestSchema),
  suggestHandler
);
