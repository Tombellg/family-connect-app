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

const pickEnv = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const resolveDbSsl = (): boolean => {
  const raw = pickEnv('NETLIFY_DB_SSLMODE', 'PGSSLMODE', 'DB_SSL');
  if (!raw) {
    return true;
  }

  const normalized = raw.toLowerCase();
  if (['disable', 'off', 'false', '0', 'no'].includes(normalized)) {
    return false;
  }
  return true;
};

const resolveDatabaseConfig = () => {
  const connectionString = pickEnv('NETLIFY_DB_CONNECTION_STRING', 'DATABASE_URL');
  const host = pickEnv('NETLIFY_DB_HOST', 'PGHOST');
  const port = pickEnv('NETLIFY_DB_PORT', 'PGPORT');
  const database = pickEnv('NETLIFY_DB_DATABASE', 'NETLIFY_DB_NAME', 'PGDATABASE');
  const user = pickEnv('NETLIFY_DB_USERNAME', 'NETLIFY_DB_USER', 'PGUSER');
  const password = pickEnv('NETLIFY_DB_PASSWORD', 'PGPASSWORD');

  return {
    connectionString,
    host,
    port: port ? Number(port) : undefined,
    database,
    user,
    password,
    ssl: resolveDbSsl(),
  };
};

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'local-secret-key',
  jwtExpiresIn: resolveExpiresIn(),
  cookieName: 'family_connect_session',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  corsOrigins: resolveCorsOrigins(),
  cookieSameSite: resolveCookieSameSite(),
  cookieSecure: resolveCookieSecure(),
  database: resolveDatabaseConfig(),
};
