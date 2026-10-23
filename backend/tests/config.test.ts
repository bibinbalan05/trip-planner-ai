import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config/env';

describe('loadConfig', () => {
  it('applies defaults when only the API key is provided', () => {
    const config = loadConfig({ GEMINI_API_KEY: 'k' });

    expect(config).toMatchObject({
      geminiApiKey: 'k',
      geminiModel: 'gemini-flash-latest',
      port: 3000,
      nodeEnv: 'development',
      isProduction: false,
      allowedOrigins: ['http://localhost:4200'],
    });
  });

  it('refuses to load without GEMINI_API_KEY', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/GEMINI_API_KEY/);
  });

  it('treats an empty GEMINI_API_KEY as missing', () => {
    expect(() => loadConfig({ GEMINI_API_KEY: '   ' })).toThrow(/GEMINI_API_KEY/);
  });

  it('treats empty optional values as unset and uses the defaults', () => {
    const config = loadConfig({ GEMINI_API_KEY: 'k', GEMINI_MODEL: '', PORT: '' });

    expect(config.geminiModel).toBe('gemini-flash-latest');
    expect(config.port).toBe(3000);
  });

  it('parses several comma-separated origins and strips trailing slashes', () => {
    const config = loadConfig({
      GEMINI_API_KEY: 'k',
      FRONTEND_ORIGIN: 'http://localhost:4200, https://app.example.com/',
    });

    expect(config.allowedOrigins).toEqual(['http://localhost:4200', 'https://app.example.com']);
  });

  it('rejects origins that contain a path or are not URLs', () => {
    expect(() =>
      loadConfig({ GEMINI_API_KEY: 'k', FRONTEND_ORIGIN: 'https://example.com/app' }),
    ).toThrow(/FRONTEND_ORIGIN/);
    expect(() => loadConfig({ GEMINI_API_KEY: 'k', FRONTEND_ORIGIN: 'not a url' })).toThrow(
      /FRONTEND_ORIGIN/,
    );
  });

  it('rejects an invalid PORT and NODE_ENV', () => {
    expect(() => loadConfig({ GEMINI_API_KEY: 'k', PORT: 'abc' })).toThrow(ConfigError);
    expect(() => loadConfig({ GEMINI_API_KEY: 'k', NODE_ENV: 'staging' })).toThrow(ConfigError);
  });

  it('flags production mode', () => {
    expect(loadConfig({ GEMINI_API_KEY: 'k', NODE_ENV: 'production' }).isProduction).toBe(true);
  });
});
