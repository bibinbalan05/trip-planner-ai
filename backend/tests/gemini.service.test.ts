import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../src/errors/AppError';
import type {
  GenerationRequest,
  GenerationResult,
  TextGenerationClient,
} from '../src/services/gemini.client';
import { GeminiService } from '../src/services/gemini.service';
import { toGeminiContents } from '../src/services/geminiContents';
import { TRAVEL_ASSISTANT_SYSTEM_INSTRUCTION } from '../src/services/systemPrompt';

const API_KEY = 'AIza-fake-key-for-tests';

function makeService(generate: (request: GenerationRequest) => Promise<GenerationResult>, timeoutMs = 500) {
  const client: TextGenerationClient = { generate: vi.fn(generate) };
  const service = new GeminiService({
    client,
    model: 'test-model',
    timeoutMs,
    secretsToRedact: [API_KEY],
  });
  return { service, client };
}

describe('GeminiService.generateReply', () => {
  it('returns trimmed text and sends model, system instruction and history', async () => {
    const { service, client } = makeService(async () => ({ text: '  Day 1: Rome  ' }));

    const reply = await service.generateReply('Food ideas?', [
      { role: 'user', text: 'Trip to Italy' },
      { role: 'model', text: 'Which region?' },
    ]);

    expect(reply).toBe('Day 1: Rome');
    expect(client.generate).toHaveBeenCalledTimes(1);
    const request = vi.mocked(client.generate).mock.calls[0]![0];
    expect(request.model).toBe('test-model');
    expect(request.systemInstruction).toBe(TRAVEL_ASSISTANT_SYSTEM_INSTRUCTION);
    expect(request.contents.map((content) => content.role)).toEqual(['user', 'model', 'user']);
  });

  it('maps an empty response to 502 AI_EMPTY_RESPONSE', async () => {
    const { service } = makeService(async () => ({ text: '   ' }));

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      statusCode: 502,
      code: 'AI_EMPTY_RESPONSE',
    });
  });

  it('maps a missing text field to 502 AI_EMPTY_RESPONSE', async () => {
    const { service } = makeService(async () => ({ text: undefined }));

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      code: 'AI_EMPTY_RESPONSE',
    });
  });

  it('maps a blocked prompt to 422 AI_RESPONSE_BLOCKED', async () => {
    const { service } = makeService(async () => ({ text: undefined, blockReason: 'SAFETY' }));

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      statusCode: 422,
      code: 'AI_RESPONSE_BLOCKED',
    });
  });

  it('maps upstream 429 to AI_RATE_LIMITED', async () => {
    const { service } = makeService(async () => {
      throw Object.assign(new Error('quota exceeded'), { status: 429 });
    });

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      statusCode: 429,
      code: 'AI_RATE_LIMITED',
    });
  });

  it('maps other upstream failures to a generic 502 without leaking details or the key', async () => {
    const { service } = makeService(async () => {
      throw Object.assign(new Error(`bad request for key ${API_KEY}`), { status: 400 });
    });

    const error = await service.generateReply('Hi', []).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.statusCode).toBe(502);
    expect(appError.code).toBe('AI_SERVICE_ERROR');
    expect(appError.message).not.toContain(API_KEY);
    expect(appError.message).not.toContain('bad request');
  });

  it('handles non-Error rejections', async () => {
    const { service } = makeService(async () => {
      throw 'plain string failure';
    });

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      code: 'AI_SERVICE_ERROR',
    });
  });

  it('times out with 504 AI_TIMEOUT and aborts the request', async () => {
    let capturedSignal: AbortSignal | undefined;
    const { service } = makeService((request) => {
      capturedSignal = request.signal;
      return new Promise<GenerationResult>(() => {
        // Never resolves: simulates a stalled upstream call.
      });
    }, 20);

    await expect(service.generateReply('Hi', [])).rejects.toMatchObject({
      statusCode: 504,
      code: 'AI_TIMEOUT',
    });
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('toGeminiContents', () => {
  it('appends the new message as a user turn', () => {
    expect(toGeminiContents([], 'Hello')).toEqual([{ role: 'user', parts: [{ text: 'Hello' }] }]);
  });

  it('drops leading model messages', () => {
    const contents = toGeminiContents(
      [
        { role: 'model', text: 'Welcome!' },
        { role: 'user', text: 'Italy' },
        { role: 'model', text: 'Great choice' },
      ],
      'Rome',
    );

    expect(contents.map((content) => content.role)).toEqual(['user', 'model', 'user']);
    expect(contents[0]?.parts[0]?.text).toBe('Italy');
  });

  it('merges consecutive messages from the same role', () => {
    const contents = toGeminiContents([{ role: 'user', text: 'First try' }], 'Second try');

    expect(contents).toHaveLength(1);
    expect(contents[0]?.parts[0]?.text).toBe('First try\n\nSecond try');
  });

  it('does not mutate the history it receives', () => {
    const history = [{ role: 'user' as const, text: 'First try' }];

    toGeminiContents(history, 'Second try');

    expect(history).toEqual([{ role: 'user', text: 'First try' }]);
  });
});
