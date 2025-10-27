import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import router from './routes';
import { requestContext } from './middleware/requestContext';
import { errorHandler } from './middleware/errorHandler';

export const createApp = () => {
  const app = express();

  const allowAllOrigins = config.corsOrigins.includes('*');

  app.use(requestContext);
  app.use(helmet());
  app.use(compression());

  app.use(
    cors({
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
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', router);

  app.use(errorHandler);

  return app;
};
