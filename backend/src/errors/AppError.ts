/**
 * An error that is safe to describe to API clients.
 * `message` is shown to users, so never put secrets or internals in it.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
