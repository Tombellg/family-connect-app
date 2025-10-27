import { config } from './config';
import { createApp } from './app';

async function bootstrap() {
  const app = await createApp();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
