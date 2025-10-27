import type { CookieOptions } from 'express';
import { config } from '../config';

export const sessionCookieOptions = (overrides: CookieOptions = {}): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.env === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
  ...overrides,
});

export const getSessionCookieName = (): string => config.cookieName;
