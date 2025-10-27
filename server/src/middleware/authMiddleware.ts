import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sessionCookieOptions } from '../utils/cookies';
import { dataStore } from '../storage/dataStore';
import { AppError } from '../utils/errors';
import { toPublicUser } from '../utils/sanitize';

interface AuthTokenPayload {
  userId: string;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[config.cookieName];
  if (!token) {
    return next(
      new AppError('Authentication required', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      })
    );
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    const user = await dataStore.findUserById(payload.userId);

    if (!user) {
      res.clearCookie(config.cookieName, sessionCookieOptions({ maxAge: undefined }));
      return next(
        new AppError('Authentication required', {
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
        })
      );
    }

    if (user.status !== 'active') {
      res.clearCookie(config.cookieName, sessionCookieOptions({ maxAge: undefined }));
      return next(
        new AppError('Account is not active', {
          status: 403,
          code: 'ACCOUNT_INACTIVE',
          details: { status: user.status },
        })
      );
    }

    req.userId = user.id;
    req.userRole = user.role;
    req.authUser = toPublicUser(user);
    res.locals.authUser = req.authUser;
    return next();
  } catch (error) {
    res.clearCookie(config.cookieName, sessionCookieOptions({ maxAge: undefined }));
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new AppError('Session expired', {
          status: 401,
          code: 'SESSION_EXPIRED',
        })
      );
    }

    return next(
      new AppError('Invalid session', {
        status: 401,
        code: 'INVALID_SESSION',
      })
    );
  }
}
