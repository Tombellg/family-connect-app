import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

type SameSiteOption = 'lax' | 'strict' | 'none';

const resolveExpiresIn = (): SignOptions['expiresIn'] => {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw || raw.trim().length === 0) {
    return '7d';
  }
  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber)) {
    return asNumber;
  }
  return raw as SignOptions['expiresIn'];
};

const resolveCorsOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGIN;
  if (raw && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
};

const resolveCookieSameSite = (): SameSiteOption => {
  const raw = process.env.COOKIE_SAME_SITE?.toLowerCase();
  if (raw === 'lax' || raw === 'strict' || raw === 'none') {
    return raw;
  }
  return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
};

const resolveCookieSecure = (): boolean => {
  const raw = process.env.COOKIE_SECURE;
  if (!raw) {
    return process.env.NODE_ENV === 'production';
  }

  const normalized = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }

  return process.env.NODE_ENV === 'production';
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'local-secret-key',
  jwtExpiresIn: resolveExpiresIn(),
  cookieName: 'family_connect_session',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  dataDir: process.env.DATA_DIR ?? 'data/store.json',
  corsOrigins: resolveCorsOrigins(),
  cookieSameSite: resolveCookieSameSite(),
  cookieSecure: resolveCookieSecure(),
};
