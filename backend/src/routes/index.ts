import { Router } from 'express';
import { createChatRouter, type ChatRouterDeps } from './chat.routes';
import { createHealthRouter } from './health.routes';

/** All API routes, mounted under `/api` by app.ts. */
export function createApiRouter(deps: ChatRouterDeps): Router {
  const router = Router();
  router.use('/health', createHealthRouter());
  router.use('/chat', createChatRouter(deps));
  return router;
}
