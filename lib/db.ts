import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var cachedPool: Pool | undefined;
}

export const pool = global.cachedPool || new Pool({
  connectionString: process.env.DATABASE_URL
});

if (process.env.NODE_ENV !== "production") {
  global.cachedPool = pool;
}
