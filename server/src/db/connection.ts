import { Pool, PoolClient, Client, ClientConfig } from 'pg';
import { config } from '../config';

const buildClientConfig = (options?: { unpooled?: boolean }): ClientConfig => {
  if (options?.unpooled) {
    if (config.database.unpooledConnectionString) {
      return {
        connectionString: config.database.unpooledConnectionString,
        ssl: { rejectUnauthorized: false },
        application_name: config.database.applicationName,
      };
    }

    return {
      host: config.database.hostUnpooled ?? config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      application_name: config.database.applicationName,
    };
  }

  if (config.database.connectionString) {
    return {
      connectionString: config.database.connectionString,
      ssl: { rejectUnauthorized: false },
      application_name: config.database.applicationName,
    };
  }

  return {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
    application_name: config.database.applicationName,
  };
};

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (!pool) {
    const clientConfig = buildClientConfig();
    pool = new Pool({
      ...clientConfig,
      max: config.database.pool.max,
      min: config.database.pool.min,
      idleTimeoutMillis: config.database.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.pool.connectionTimeoutMillis,
    });
  }

  return pool;
};

export const getPoolClient = async (): Promise<PoolClient> => {
  return getPool().connect();
};

export const getUnpooledClient = async (): Promise<Client> => {
  const client = new Client(buildClientConfig({ unpooled: true }));
  await client.connect();
  return client;
};
