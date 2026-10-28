import { Request, Response, NextFunction } from 'express';
import {
  createOrder,
  getOrderById,
  submitPaymentProof,
  confirmOrder,
  rejectOrder,
  cancelOrder,
  getMyOrders,
} from './order.service.js';

export const createOrderHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const result = await createOrder(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getOrderHandler = async (
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
    const result = await getOrderById(id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const submitProofHandler = async (
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
    const order = await submitPaymentProof(id, req.user.id, req.body);
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

export const confirmOrderHandler = async (
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
    const order = await confirmOrder(id, req.user.id);
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

export const rejectOrderHandler = async (
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
    const order = await rejectOrder(id, req.user.id, req.body);
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

export const cancelOrderHandler = async (
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
    const order = await cancelOrder(id, req.user.id);
    res.json({ order });
  } catch (err) {
    next(err);
  }
};

export const getMyOrdersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const role = (req.query.role as 'buyer' | 'seller') || 'buyer';
    const orders = await getMyOrders(req.user.id, role);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
};
