import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from './config';
import router from './routes';
import { dataStore } from './storage/dataStore';
import { serializeError } from './utils/errors';
import { requestContext } from './middleware/requestContext';

async function bootstrap() {
  await dataStore.initialize();

  const app = express();

  const allowAllOrigins = config.corsOrigins.includes('*');

  app.use(requestContext);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (allowAllOrigins) {
          return callback(null, true);
        }

        if (!origin) {
          return callback(null, true);
        }

        if (config.corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
    })
  );
  app.use(cookieParser());
  app.use(bodyParser.json());

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', router);

  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = req.requestId;
    const { status, payload } = serializeError(err, { requestId });
    const log = status >= 500 ? console.error : console.warn;
    log('Request failed', {
      requestId,
      status,
      message: err?.message,
      code: (err && typeof err === 'object' && 'code' in err) ? (err as any).code : undefined,
      details: payload.error.details,
      stack: err?.stack,
    });
    res.status(status).json(payload);
  });

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});
