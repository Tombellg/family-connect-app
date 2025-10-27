import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      userId?: string;
    }
  }
}

export const requestContext = (req: Request, _res: Response, next: NextFunction): void => {
  req.requestId = req.headers['x-request-id']?.toString() ?? randomUUID();
  next();
};
