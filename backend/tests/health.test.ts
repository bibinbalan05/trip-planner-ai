import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { makeFakeChatService, makeTestConfig } from './helpers';

describe('GET /api/health', () => {
  const app = createApp({ config: makeTestConfig(), chatService: makeFakeChatService().service });

  it('reports that the backend is running', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'trip-planner-backend' });
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns a consistent 404 body for unknown routes', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
    });
  });
});
