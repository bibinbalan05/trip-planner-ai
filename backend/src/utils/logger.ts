type Level = 'info' | 'warn' | 'error';

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  // Keep test output clean.
  if (process.env['NODE_ENV'] === 'test') return;

  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...meta });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Minimal structured logger.
 * Only pass metadata such as status codes or error names. Do not pass API keys
 * or user message content.
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
