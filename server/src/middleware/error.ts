import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = typeof err.status === 'number' ? err.status : 500;
  const isServerError = status >= 500;
  const code = isServerError ? 'INTERNAL_SERVER_ERROR' : err.code || 'INTERNAL_SERVER_ERROR';
  const message = isServerError ? 'An unexpected error occurred' : err.message || 'An unexpected error occurred';
  const fields = err.fields || undefined;
  const retryAfterSeconds = err.retryAfterSeconds;

  if (isServerError) {
    const errorName = err instanceof Error ? err.name : 'UnknownError';
    const errorCode = typeof err.code === 'string' ? err.code : 'unknown';
    console.error(`[api] ${req.method} ${req.path} failed (${errorName}, ${errorCode})`);
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      ...(fields ? { fields } : {}),
    },
  });
};
