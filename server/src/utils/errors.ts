import { ZodError } from 'zod';

export interface SerializedError {
  message: string;
  code: string;
  details?: unknown;
  status: number;
  timestamp: string;
  requestId?: string;
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

const mergeDetails = (details: unknown, cause: unknown): unknown => {
  if (!cause) {
    return details;
  }

  const normalizedCause = cause instanceof Error
    ? { name: cause.name, message: cause.message }
    : cause;

  if (details === undefined || details === null) {
    return { cause: normalizedCause };
  }

  if (Array.isArray(details)) {
    return [...details, { cause: normalizedCause }];
  }

  if (typeof details === 'object') {
    return { ...(details as Record<string, unknown>), cause: normalizedCause };
  }

  return { value: details, cause: normalizedCause };
};

export function serializeError(
  error: unknown,
  context: { requestId?: string } = {}
): { status: number; payload: { error: SerializedError } } {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    const status = error.status;
    const cause = error.cause;
    return {
      status,
      payload: {
        error: {
          message: error.message,
          code: error.code,
          ...(error.details !== undefined || cause
            ? { details: mergeDetails(error.details, cause) }
            : {}),
          status,
          timestamp,
          ...(context.requestId ? { requestId: context.requestId } : {}),
        },
      },
    };
  }

  if (error instanceof ZodError) {
    const status = 422;
    return {
      status,
      payload: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.') || undefined,
            message: issue.message,
            code: issue.code,
          })),
          status,
          timestamp,
          ...(context.requestId ? { requestId: context.requestId } : {}),
        },
      },
    };
  }

  if (error instanceof Error) {
    const status = typeof (error as any).status === 'number' ? (error as any).status : 400;
    const code = typeof (error as any).code === 'string' ? (error as any).code : 'UNEXPECTED_ERROR';
    const details = (error as any).details;
    const cause = (error as Error & { cause?: unknown }).cause;

    return {
      status,
      payload: {
        error: {
          message: error.message,
          code,
          ...(details !== undefined || cause
            ? { details: mergeDetails(details, cause) }
            : {}),
          status,
          timestamp,
          ...(context.requestId ? { requestId: context.requestId } : {}),
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
        status: 500,
        timestamp,
        ...(context.requestId ? { requestId: context.requestId } : {}),
      },
    },
  };
}
