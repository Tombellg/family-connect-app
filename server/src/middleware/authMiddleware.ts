import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { sessionCookieOptions } from '../utils/cookies';

interface AuthTokenPayload {
  userId: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[config.cookieName];
  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' } });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.clearCookie(config.cookieName, sessionCookieOptions({ maxAge: undefined }));
    return res.status(401).json({ error: { message: 'Invalid session', code: 'INVALID_SESSION' } });
  }
}
