import type { Request, Response, NextFunction } from 'express';
import { registerSchema, loginSchema } from './auth.validators';
import { register, login, getProfile } from './auth.service';
import { getSessionCookieName, sessionCookieOptions } from '../../utils/cookies';

export const registerHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = registerSchema.parse(req.body);
    const { user, token } = await register(payload);
    res.cookie(getSessionCookieName(), token, sessionCookieOptions());
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = loginSchema.parse(req.body);
    const { user, token } = await login(payload);
    res.cookie(getSessionCookieName(), token, sessionCookieOptions());
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const logoutHandler = (req: Request, res: Response) => {
  res.clearCookie(getSessionCookieName(), sessionCookieOptions({ maxAge: undefined }));
  res.json({ success: true });
};

export const meHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await getProfile(req.userId);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};
