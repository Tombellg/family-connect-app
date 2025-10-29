import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var cachedPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var cachedDbInit: Promise<void> | undefined;
}

const connectionString = process.env.DATABASE_URL;
const sslConfig = connectionString?.includes("sslmode=require")
  ? { rejectUnauthorized: false }
  : undefined;

export const pool = global.cachedPool ||
  new Pool({
    connectionString,
    ssl: sslConfig
  });

const initialiseAuthTables = async () => {
  if (!connectionString) {
    console.warn("DATABASE_URL manquant : les tables NextAuth ne peuvent pas être créées.");
    return;
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      "emailVerified" TIMESTAMP,
      image TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      oauth_token_secret TEXT,
      oauth_token TEXT,
      refresh_token_expires_in INTEGER
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS accounts_provider_account_id
      ON accounts("provider", "providerAccountId")`,
    `CREATE INDEX IF NOT EXISTS accounts_user_id ON accounts("userId")`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      "sessionToken" TEXT UNIQUE NOT NULL,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions("userId")`,
    `CREATE TABLE IF NOT EXISTS verification_token (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMP NOT NULL,
      PRIMARY KEY(identifier, token)
    )`,
    `CREATE TABLE IF NOT EXISTS authenticators (
      "credentialID" TEXT PRIMARY KEY,
      "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      "credentialPublicKey" TEXT NOT NULL,
      counter BIGINT NOT NULL,
      "credentialDeviceType" TEXT NOT NULL,
      "credentialBackedUp" BOOLEAN NOT NULL,
      transports TEXT
    )`
  ];

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error("Impossible de créer une table NextAuth", { statement, error });
      throw error;
    }
  }
};

export const dbReady = global.cachedDbInit || initialiseAuthTables();

if (process.env.NODE_ENV !== "production") {
  global.cachedPool = pool;
  global.cachedDbInit = dbReady;
}
