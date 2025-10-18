import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  if (!req.requestId) {
    const id = nanoid(12);
    req.requestId = id;
    res.locals.requestId = id;
  }
  next();
}
