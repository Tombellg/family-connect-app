import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { getSessionCookieName } from '../utils/cookies';
import { verifySessionToken } from '../utils/jwt';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = req.cookies?.[getSessionCookieName()];

  if (!token) {
    return next(
      new AppError('Not authenticated', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      })
    );
  }

  try {
    const payload = verifySessionToken(token);
    req.userId = payload.sub;
    next();
  } catch (error) {
    return next(
      new AppError('Invalid session', {
        status: 401,
        code: 'INVALID_SESSION',
        details: error instanceof Error ? error.message : undefined,
      })
    );
  }
};
