import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validate.js';
import {
  createOrderSchema,
  submitProofSchema,
  rejectOrderSchema,
} from './order.schema.js';
import {
  createOrderHandler,
  getOrderHandler,
  submitProofHandler,
  confirmOrderHandler,
  rejectOrderHandler,
  cancelOrderHandler,
  getMyOrdersHandler,
} from './order.controller.js';

export const orderRouter = Router();

orderRouter.post('/', requireAuth, validateRequest(createOrderSchema), createOrderHandler);
orderRouter.get('/:id', requireAuth, getOrderHandler);
orderRouter.post('/:id/proof', requireAuth, validateRequest(submitProofSchema), submitProofHandler);
orderRouter.post('/:id/confirm', requireAuth, confirmOrderHandler);
orderRouter.post('/:id/reject', requireAuth, validateRequest(rejectOrderSchema), rejectOrderHandler);
orderRouter.post('/:id/cancel', requireAuth, cancelOrderHandler);

// Subrouter or mount for /api/me/orders
export const meOrdersHandler = getMyOrdersHandler;
