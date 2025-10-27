import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

interface SerializedError {
  error: {
    message: string;
    code?: string;
    details?: unknown;
    requestId?: string;
  };
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (res.headersSent) {
    return;
  }

  const requestId = req.requestId;

  const appError =
    err instanceof AppError
      ? err
      : new AppError(err instanceof Error ? err.message : 'Internal server error');

  const payload: SerializedError = {
    error: {
      message: appError.message,
      code: appError.code,
      details: appError.details,
      requestId,
    },
  };

  const status = appError.status;
  const log = status >= 500 ? console.error : console.warn;
  log('Request failed', {
    requestId,
    status,
    message: appError.message,
    code: appError.code,
    details: appError.details,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(status).json(payload);
};
