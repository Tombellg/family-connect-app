import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config';
import router from './routes';
import { dataStore } from './storage/dataStore';

async function bootstrap() {
  await dataStore.initialize();

  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(bodyParser.json());

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', router);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
