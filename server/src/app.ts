import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { config } from './config';
import router from './routes';
import { dataStore } from './storage/dataStore';
import { requestContext } from './middleware/requestContext';
import { serializeError } from './utils/errors';

let initializationPromise: Promise<void> | null = null;

async function ensureDataStoreInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = dataStore.initialize().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}

export async function createApp(): Promise<express.Express> {
  await ensureDataStoreInitialized();

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

  return app;
}

export async function ensureInitialized(): Promise<void> {
  await ensureDataStoreInitialized();
}
