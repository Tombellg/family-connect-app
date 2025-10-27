export class AppError extends Error {
  constructor(
    message: string,
    public readonly options: { status?: number; code?: string; details?: unknown } = {}
  ) {
    super(message);
    this.name = 'AppError';
  }

  get status(): number {
    return this.options.status ?? 500;
  }

  get code(): string | undefined {
    return this.options.code;
  }

  get details(): unknown {
    return this.options.details;
  }
}
