// Must be the first import: it loads backend/.env into process.env.
import 'dotenv/config';

import { createApp } from './app';
import { ConfigError, loadConfig, type AppConfig } from './config/env';
import { initializeMcp } from './mcp';
import { GoogleGenAiTextClient } from './services/gemini.client';
import { GeminiService } from './services/gemini.service';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`\n${error.message}\n\nSee backend/.env.example for the required variables.\n`);
    } else {
      console.error('Failed to load configuration.');
    }
    process.exit(1);
  }

  // Extension point: returns an empty tool registry until MCP support is implemented.
  const toolRegistry = await initializeMcp();

  const chatService = new GeminiService({
    client: new GoogleGenAiTextClient(config.geminiApiKey),
    model: config.geminiModel,
    timeoutMs: config.geminiTimeoutMs,
    secretsToRedact: [config.geminiApiKey],
  });

  const app = createApp({ config, chatService });

  const server = app.listen(config.port, () => {
    logger.info('Trip planner backend listening', {
      port: config.port,
      env: config.nodeEnv,
      model: config.geminiModel,
      allowedOrigins: config.allowedOrigins,
      mcpTools: toolRegistry.list().length,
    });
  });

  const shutdown = (signal: string): void => {
    logger.info('Shutting down', { signal });
    server.close(() => process.exit(0));
    // Force exit if connections do not close in time.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error('Fatal error during startup:', error instanceof Error ? error.message : 'unknown');
  process.exit(1);
});
