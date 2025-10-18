import { ZodError } from 'zod';

export interface SerializedError {
  message: string;
  code: string;
  details?: unknown;
}

interface AppErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  cause?: unknown;
}

export class AppError extends Error {
  public readonly status: number;

  public readonly code: string;

  public readonly details?: unknown;

  public readonly cause?: unknown;

  constructor(message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.status = options.status ?? 400;
    this.code = options.code ?? 'APP_ERROR';
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
    Error.captureStackTrace?.(this, AppError);
  }
}

export function serializeError(error: unknown): { status: number; payload: { error: SerializedError } } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      payload: {
        error: {
          message: error.message,
          code: error.code,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      payload: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.') || undefined,
            message: issue.message,
            code: issue.code,
          })),
        },
      },
    };
  }

  if (error instanceof Error) {
    const status = typeof (error as any).status === 'number' ? (error as any).status : 400;
    const code = typeof (error as any).code === 'string' ? (error as any).code : 'UNEXPECTED_ERROR';
    const details = (error as any).details;

    return {
      status,
      payload: {
        error: {
          message: error.message,
          code,
          ...(details !== undefined ? { details } : {}),
        },
      },
    };
  }

  return {
    status: 500,
    payload: {
      error: {
        message: 'Unknown error',
        code: 'UNKNOWN_ERROR',
        details: error,
      },
    },
  };
}
