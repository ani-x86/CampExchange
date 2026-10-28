import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../prisma/client.js';

export interface AuthUser {
  id: string;
  prn: string;
  email: string | null;
  role: string;
  name: string;
  tokenVersion: number;
  mustChangePassword: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.cx_token;

    if (!token) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      tokenVersion: number;
    };

    if (payload.userId.startsWith('demo-')) {
      const prn = payload.userId.replace('demo-', '');
      req.user = {
        id: payload.userId,
        prn,
        email: `${prn}@college.edu.in`,
        role: 'ADMIN',
        name: 'Demo Admin',
        tokenVersion: payload.tokenVersion,
        mustChangePassword: false,
      };
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        prn: true,
        email: true,
        role: true,
        name: true,
        tokenVersion: true,
        mustChangePassword: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found or session expired',
        },
      });
      return;
    }

    const { isActive: _isActive, ...authUser } = user;
    void _isActive;
    req.user = authUser;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired session token',
      },
    });
  }
};

export const passwordChangeGate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.cx_token;
  if (!token) {
    next();
    return;
  }

  let payload: { userId: string; tokenVersion: number };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; tokenVersion: number };
  } catch {
    next();
    return;
  }

  if (payload.userId.startsWith('demo-')) {
    next();
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { mustChangePassword: true, tokenVersion: true },
    });

    const allowedPaths = new Set([
      '/api/auth/change-password',
      '/api/auth/me',
      '/api/auth/logout',
    ]);
    if (
      user?.mustChangePassword &&
      user.tokenVersion === payload.tokenVersion &&
      !allowedPaths.has(req.originalUrl.split('?')[0])
    ) {
      res.status(403).json({
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Change your password to continue',
        },
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Administrator access required' },
    });
    return;
  }
  next();
};
