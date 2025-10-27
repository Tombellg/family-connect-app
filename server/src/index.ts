import { createApp } from './app';
import { config } from './config';
import { getPool } from './db/connection';
import { runMigrations } from './db/migrations';
import { seedDatabase } from './db/seeds';

const bootstrap = async () => {
  await runMigrations();
  await seedDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });

  const pool = getPool();
  server.on('close', () => {
    void pool.end();
  });
};

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
