import { z } from 'zod';

/** Thrown when environment variables are missing or invalid. */
export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

const rawEnvSchema = z.object({
  GEMINI_API_KEY: z
    .string({ required_error: 'GEMINI_API_KEY is required (see backend/.env.example)' })
    .min(1, 'GEMINI_API_KEY is required (see backend/.env.example)'),
  GEMINI_MODEL: z.string().min(1).default('gemini-flash-latest'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:4200'),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
});

/** Validated, typed configuration used across the backend. */
export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  geminiApiKey: string;
  geminiModel: string;
  geminiTimeoutMs: number;
  allowedOrigins: string[];
  rateLimit: {
    max: number;
    windowMs: number;
  };
}

function parseOrigins(value: string): { origins: string[]; errors: string[] } {
  const origins: string[] = [];
  const errors: string[] = [];

  for (const part of value.split(',')) {
    const candidate = part.trim().replace(/\/+$/, '');
    if (!candidate) continue;

    try {
      const url = new URL(candidate);
      if (url.origin !== candidate) {
        errors.push(
          `FRONTEND_ORIGIN: "${candidate}" must be an origin only (e.g. https://example.com), without a path`,
        );
        continue;
      }
      origins.push(url.origin);
    } catch {
      errors.push(`FRONTEND_ORIGIN: "${candidate}" is not a valid URL`);
    }
  }

  if (origins.length === 0 && errors.length === 0) {
    errors.push('FRONTEND_ORIGIN: at least one origin is required');
  }

  return { origins, errors };
}

/**
 * Reads and validates configuration from environment variables.
 * Empty values (e.g. `GEMINI_API_KEY=`) are treated as "not set".
 * Throws ConfigError so the server can refuse to start with a clear message.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string' && value.trim() !== '') {
      cleaned[key] = value.trim();
    }
  }

  const parsed = rawEnvSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`),
    );
  }

  const values = parsed.data;
  const { origins, errors } = parseOrigins(values.FRONTEND_ORIGIN);
  if (errors.length > 0) {
    throw new ConfigError(errors);
  }

  return {
    nodeEnv: values.NODE_ENV,
    isProduction: values.NODE_ENV === 'production',
    port: values.PORT,
    geminiApiKey: values.GEMINI_API_KEY,
    geminiModel: values.GEMINI_MODEL,
    geminiTimeoutMs: values.GEMINI_TIMEOUT_MS,
    allowedOrigins: origins,
    rateLimit: {
      max: values.RATE_LIMIT_MAX,
      windowMs: values.RATE_LIMIT_WINDOW_MS,
    },
  };
}
