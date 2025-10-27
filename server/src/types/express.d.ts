import 'express-serve-static-core';
import type { PublicUser } from '../utils/sanitize';
import type { UserRole } from '../types';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    userRole?: UserRole;
    authUser?: PublicUser;
    requestId?: string;
  }

  interface Response {
    locals: {
      requestId?: string;
      authUser?: PublicUser;
      [key: string]: unknown;
    };
  }
}
