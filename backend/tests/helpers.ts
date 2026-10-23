import { vi } from 'vitest';
import type { AppConfig } from '../src/config/env';
import type { ChatService } from '../src/types/chat';

export function makeTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    isProduction: false,
    port: 0,
    geminiApiKey: 'test-key-not-real',
    geminiModel: 'test-model',
    geminiTimeoutMs: 1000,
    allowedOrigins: ['http://localhost:4200'],
    rateLimit: { max: 100, windowMs: 60_000 },
    ...overrides,
  };
}

/** A fake ChatService so route tests never touch Gemini. */
export function makeFakeChatService(reply = 'Here is your itinerary.') {
  const generateReply = vi.fn<ChatService['generateReply']>().mockResolvedValue(reply);
  const service: ChatService = { generateReply };
  return { service, generateReply };
}
