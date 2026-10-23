import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { createApiRouter } from './routes';
import type { ChatService } from './types/chat';

export interface AppDependencies {
  config: AppConfig;
  chatService: ChatService;
}

/**
 * Builds the Express app. Dependencies are passed in (instead of imported) so tests can
 * supply a fake ChatService and a test config without touching the network.
 */
export function createApp({ config, chatService }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');

  // On Render the app sits behind a proxy; trust one hop so rate limiting sees real client IPs.
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());

  const allowedOrigins = new Set(config.allowedOrigins);
  app.use(
    cors({
      // Requests without an Origin header (curl, health checks) are not browser cross-origin calls.
      origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '200kb' }));

  app.use('/api', createApiRouter({ chatService, config }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(config));

  return app;
}
