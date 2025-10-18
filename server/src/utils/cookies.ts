import { CookieOptions } from 'express';
import { config } from '../config';

export function sessionCookieOptions(overrides: Partial<CookieOptions> = {}): CookieOptions {
  const base: CookieOptions = {
    httpOnly: true,
    sameSite: config.cookieSameSite,
    secure: config.cookieSecure,
    maxAge: config.cookieMaxAgeMs,
    path: '/',
  };

  return { ...base, ...overrides };
}
