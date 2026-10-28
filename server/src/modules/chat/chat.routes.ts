import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import { chatRateLimiter } from '../../middleware/rateLimit.js';
import { startConversationSchema, sendMessageSchema } from './chat.schema.js';
import {
  startConversationHandler,
  getInboxHandler,
  getMessagesHandler,
  sendMessageHandler,
  markReadHandler,
} from './chat.controller.js';

export const chatRouter = Router();

chatRouter.post('/', requireAuth, validateRequest(startConversationSchema), startConversationHandler);
chatRouter.get('/', requireAuth, getInboxHandler);
chatRouter.get('/:id/messages', requireAuth, getMessagesHandler);
chatRouter.post(
  '/:id/messages',
  requireAuth,
  chatRateLimiter,
  validateRequest(sendMessageSchema),
  sendMessageHandler
);
chatRouter.post('/:id/read', requireAuth, markReadHandler);
