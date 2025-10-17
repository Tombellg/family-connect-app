import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

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

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'local-secret-key',
  jwtExpiresIn: resolveExpiresIn(),
  cookieName: 'family_connect_session',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  dataDir: process.env.DATA_DIR ?? 'data/store.json',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
