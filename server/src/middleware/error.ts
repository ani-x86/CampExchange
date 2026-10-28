import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const fields = err.fields || undefined;
  const retryAfterSeconds = err.retryAfterSeconds;

  res.status(status).json({
    error: {
      code,
      message,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      ...(fields ? { fields } : {}),
    },
  });
};
