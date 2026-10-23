import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import type { AppConfig } from '../config/env';
import type { ApiErrorBody } from '../types/api';

/** Basic per-IP rate limit for the chat endpoint (in-memory; fine for a single instance). */
export function createChatRateLimiter(config: AppConfig): RequestHandler {
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      const body: ApiErrorBody = {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        },
      };
      res.status(429).json(body);
    },
  });
}
