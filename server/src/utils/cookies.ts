import { CookieOptions } from 'express';
import { config } from '../config';

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: config.cookieMaxAgeMs,
  };
}
