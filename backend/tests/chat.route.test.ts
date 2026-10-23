import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { AppError } from '../src/errors/AppError';
import { MAX_HISTORY_ITEMS, MAX_MESSAGE_LENGTH } from '../src/schemas/chat.schema';
import { makeFakeChatService, makeTestConfig } from './helpers';

function buildApp(reply?: string) {
  const fake = makeFakeChatService(reply);
  const app = createApp({ config: makeTestConfig(), chatService: fake.service });
  return { app, ...fake };
}

describe('POST /api/chat: success', () => {
  it('returns the reply and defaults history to an empty array', async () => {
    const { app, generateReply } = buildApp('Day 1: Rome');

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Plan a 5-day trip to Italy' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reply: 'Day 1: Rome', role: 'model' });
    expect(generateReply).toHaveBeenCalledWith('Plan a 5-day trip to Italy', []);
  });

  it('passes validated history to the service', async () => {
    const { app, generateReply } = buildApp();
    const history = [
      { role: 'user', text: 'I want to visit Italy' },
      { role: 'model', text: 'What kind of trip do you prefer?' },
    ];

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Food and museums', history });

    expect(response.status).toBe(200);
    expect(generateReply).toHaveBeenCalledWith('Food and museums', history);
  });

  it('trims whitespace around the message', async () => {
    const { app, generateReply } = buildApp();

    await request(app).post('/api/chat').send({ message: '   Hello   ' });

    expect(generateReply).toHaveBeenCalledWith('Hello', []);
  });
});

describe('POST /api/chat: invalid requests', () => {
  const invalidBodies: Array<[string, unknown]> = [
    ['missing message', {}],
    ['non-string message', { message: 42 }],
    ['empty message', { message: '' }],
    ['whitespace-only message', { message: '    ' }],
    ['message that is too long', { message: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) }],
    ['invalid history role', { message: 'Hi', history: [{ role: 'assistant', text: 'x' }] }],
    ['history item without text', { message: 'Hi', history: [{ role: 'user' }] }],
    ['history that is not an array', { message: 'Hi', history: 'nope' }],
    [
      'history with too many items',
      {
        message: 'Hi',
        history: Array.from({ length: MAX_HISTORY_ITEMS + 1 }, () => ({ role: 'user', text: 'x' })),
      },
    ],
  ];

  it.each(invalidBodies)('rejects %s with 400 VALIDATION_ERROR', async (_name, body) => {
    const { app, generateReply } = buildApp();

    const response = await request(app).post('/api/chat').send(body as object);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(generateReply).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400 INVALID_JSON', async () => {
    const { app, generateReply } = buildApp();

    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send('{"message": "unterminated');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
    expect(generateReply).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies with 413', async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'Hi', padding: 'x'.repeat(300_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('POST /api/chat: service failures', () => {
  it('passes through safe AppErrors from the service', async () => {
    const { app, generateReply } = buildApp();
    generateReply.mockRejectedValueOnce(
      new AppError(504, 'AI_TIMEOUT', 'The assistant took too long to respond. Please try again.'),
    );

    const response = await request(app).post('/api/chat').send({ message: 'Hello' });

    expect(response.status).toBe(504);
    expect(response.body.error.code).toBe('AI_TIMEOUT');
  });

  it('hides the details of unexpected errors', async () => {
    const { app, generateReply } = buildApp();
    generateReply.mockRejectedValueOnce(new Error('boom: secret-internal-detail'));

    const response = await request(app).post('/api/chat').send({ message: 'Hello' });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('secret-internal-detail');
  });

  it('never includes a stack trace, even outside production', async () => {
    const { app, generateReply } = buildApp();
    generateReply.mockRejectedValueOnce(new Error('boom'));

    const response = await request(app).post('/api/chat').send({ message: 'Hello' });

    expect(JSON.stringify(response.body)).not.toContain('stack');
    expect(JSON.stringify(response.body)).not.toContain('node_modules');
  });
});

describe('POST /api/chat: rate limiting', () => {
  it('returns 429 after the configured number of requests', async () => {
    const fake = makeFakeChatService();
    const app = createApp({
      config: makeTestConfig({ rateLimit: { max: 2, windowMs: 60_000 } }),
      chatService: fake.service,
    });

    await request(app).post('/api/chat').send({ message: 'one' }).expect(200);
    await request(app).post('/api/chat').send({ message: 'two' }).expect(200);
    const limited = await request(app).post('/api/chat').send({ message: 'three' });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('CORS', () => {
  it('allows the configured frontend origin', async () => {
    const { app } = buildApp();

    const response = await request(app).get('/api/health').set('Origin', 'http://localhost:4200');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:4200');
  });

  it('does not allow other origins', async () => {
    const { app } = buildApp();

    const response = await request(app).get('/api/health').set('Origin', 'https://evil.example');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
