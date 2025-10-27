import { env } from './env';

const DEFAULT_NEON_DATABASE_URL =
  'postgresql://neondb_owner:npg_MpQBUN7bFzl6@ep-shy-dream-abcslgpk-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';

const DEFAULT_NEON_DATABASE_URL_UNPOOLED =
  'postgresql://neondb_owner:npg_MpQBUN7bFzl6@ep-shy-dream-abcslgpk.eu-west-2.aws.neon.tech/neondb?sslmode=require';

export const config = {
  env: env.NODE_ENV,
  port: env.PORT ?? 4000,
  cookieName: env.COOKIE_NAME,
  jwtSecret: env.JWT_SECRET,
  corsOrigins: env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? ['*'],
  database: {
    connectionString: env.DATABASE_URL ?? DEFAULT_NEON_DATABASE_URL,
    unpooledConnectionString: env.DATABASE_URL_UNPOOLED ?? DEFAULT_NEON_DATABASE_URL_UNPOOLED,
    host: env.PGHOST ?? 'ep-shy-dream-abcslgpk-pooler.eu-west-2.aws.neon.tech',
    hostUnpooled: env.PGHOST_UNPOOLED ?? 'ep-shy-dream-abcslgpk.eu-west-2.aws.neon.tech',
    port: env.PGPORT ?? 5432,
    database: env.PGDATABASE ?? 'neondb',
    user: env.PGUSER ?? 'neondb_owner',
    password: env.PGPASSWORD ?? 'npg_MpQBUN7bFzl6',
    ssl: true,
    applicationName: 'reynard-backend',
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    },
  },
};

export type AppConfig = typeof config;
