import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../errors/AppError';

/** Validates `req.body` with a Zod schema and replaces it with the parsed (typed, defaulted) data. */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', details));
      return;
    }

    req.body = result.data;
    next();
  };
}
