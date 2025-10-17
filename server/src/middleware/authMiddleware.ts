import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AuthTokenPayload {
  userId: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[config.cookieName];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax' });
    return res.status(401).json({ error: 'Invalid session' });
  }
}
