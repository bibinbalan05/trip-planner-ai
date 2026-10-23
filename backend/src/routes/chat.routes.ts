import { Router } from 'express';
import type { AppConfig } from '../config/env';
import { createChatController } from '../controllers/chat.controller';
import { createChatRateLimiter } from '../middleware/rateLimiter';
import { validateBody } from '../middleware/validate';
import { chatRequestSchema } from '../schemas/chat.schema';
import type { ChatService } from '../types/chat';

export interface ChatRouterDeps {
  chatService: ChatService;
  config: AppConfig;
}

export function createChatRouter({ chatService, config }: ChatRouterDeps): Router {
  const router = Router();
  // Order matters: throttle first, then validate, then do the (costly) AI call.
  router.post(
    '/',
    createChatRateLimiter(config),
    validateBody(chatRequestSchema),
    createChatController(chatService),
  );
  return router;
}
