import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { AppConfig } from '../config/env';
import { AppError } from '../errors/AppError';
import type { ApiErrorBody } from '../types/api';
import { logger } from '../utils/logger';

/** Errors raised by Express' body parser carry `status` and `type`. */
function isBodyParserError(error: unknown): error is { status: number; type: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number' &&
    typeof (error as { type?: unknown }).type === 'string'
  );
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
  };
  res.status(404).json(body);
};

/** Central error handler: every failure leaves the API in the same safe shape. */
export function createErrorHandler(config: AppConfig): ErrorRequestHandler {
  return (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof AppError) {
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      };
      res.status(error.statusCode).json(body);
      return;
    }

    if (isBodyParserError(error)) {
      if (error.type === 'entity.too.large') {
        res.status(413).json({
          error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.' },
        } satisfies ApiErrorBody);
        return;
      }
      if (error.type === 'entity.parse.failed') {
        res.status(400).json({
          error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' },
        } satisfies ApiErrorBody);
        return;
      }
    }

    // Unknown failure: log the details on the server, send nothing sensitive to the client.
    logger.error('Unhandled error', {
      errorName: error instanceof Error ? error.name : typeof error,
      detail: error instanceof Error ? error.message.slice(0, 200) : undefined,
    });

    const body: ApiErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our side. Please try again.',
        ...(config.isProduction || !(error instanceof Error)
          ? {}
          : { details: { debug: error.message } }),
      },
    };
    res.status(500).json(body);
  };
}
