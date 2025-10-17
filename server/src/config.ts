import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'local-secret-key',
  jwtExpiresIn: '7d',
  cookieName: 'family_connect_session',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  dataDir: process.env.DATA_DIR ?? 'data/store.json',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
