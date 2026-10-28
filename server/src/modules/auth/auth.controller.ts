import type { Request, Response, NextFunction } from 'express';
import { io } from '../../index.js';
import {
  changePassword,
  clearAuthCookie,
  getCurrentUser,
  loginUser,
  registerUser,
  setAuthCookie,
} from './auth.service.js';
import { createAndSendOtp, verifyOtpCode } from './otp.service.js';
import { prisma } from '../../prisma/client.js';

export const loginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, token, mustChangePassword } = await loginUser(req.body);
    setAuthCookie(res, token);
    res.json({ user, mustChangePassword });
  } catch (error) {
    next(error);
  }
};

export const registerHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const verifyOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, token } = await verifyOtpCode(req.body.email, req.body.code);
    setAuthCookie(res, token);
    res.json({ user, ok: true });
  } catch (error) {
    next(error);
  }
};

export const resendOtpHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const email = req.body.email.toLowerCase().trim();
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'No account found with this email.' } });
      return;
    }
    if (user.emailVerified) {
      res.status(400).json({ error: { code: 'ALREADY_VERIFIED', message: 'This account is already verified.' } });
      return;
    }
    await createAndSendOtp(user.id, user.email ?? email, user.name);
    res.json({ ok: true, message: 'New verification code sent.' });
  } catch (error) {
    next(error);
  }
};

export const changePasswordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }
    const { user, token } = await changePassword(req.user.id, req.body);
    io.in(`user:${req.user.id}`).disconnectSockets(true);
    setAuthCookie(res, token);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.json({ ok: true });
};

export const meHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }
    const user = await getCurrentUser(req.user.id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
