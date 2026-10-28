import { Request, Response, NextFunction } from 'express';
import {
  getOrCreateConversation,
  getInbox,
  getMessages,
  sendMessage,
  markRead,
} from './chat.service.js';

export const startConversationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const conversation = await getOrCreateConversation(req.user.id, req.body);
    res.status(201).json({ conversation });
  } catch (err) {
    next(err);
  }
};

export const getInboxHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED' } });
      return;
    }
    const filter = (req.query.filter as 'all' | 'buying' | 'selling' | 'unread') || 'all';
    const conversations = await getInbox(req.user.id, filter);
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
};

export const getMessagesHandler = async (
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
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
    const result = await getMessages(id, req.user.id, cursor, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const sendMessageHandler = async (
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
    const message = await sendMessage(id, req.user.id, req.body);
    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
};

export const markReadHandler = async (
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
    const result = await markRead(id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
