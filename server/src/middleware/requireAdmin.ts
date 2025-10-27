import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return next(
      new AppError('Admin privileges are required', {
        status: 403,
        code: 'ADMIN_REQUIRED',
      })
    );
  }

  return next();
}
