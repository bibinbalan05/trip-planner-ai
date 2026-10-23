import { AppError } from '../errors/AppError';
import type { ChatMessage, ChatService } from '../types/chat';
import { logger } from '../utils/logger';
import type { TextGenerationClient } from './gemini.client';
import { toGeminiContents } from './geminiContents';
import { TRAVEL_ASSISTANT_SYSTEM_INSTRUCTION } from './systemPrompt';

export interface GeminiServiceOptions {
  client: TextGenerationClient;
  model: string;
  timeoutMs: number;
  /** Values (such as the API key) that must never appear in logs. */
  secretsToRedact?: string[];
}

class GenerationTimeoutError extends Error {
  constructor() {
    super('Gemini request timed out');
    this.name = 'GenerationTimeoutError';
  }
}

function readStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

/** Generates travel-assistant replies with Gemini. Implements the ChatService contract. */
export class GeminiService implements ChatService {
  private readonly client: TextGenerationClient;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly secretsToRedact: string[];

  constructor(options: GeminiServiceOptions) {
    this.client = options.client;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs;
    this.secretsToRedact = (options.secretsToRedact ?? []).filter(Boolean);
  }

  async generateReply(message: string, history: ChatMessage[]): Promise<string> {
    const contents = toGeminiContents(history, message);
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;

    // Race the call against a timer so a stalled request can never hang the response,
    // even if the SDK were to ignore the abort signal.
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new GenerationTimeoutError());
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([
        this.client.generate({
          model: this.model,
          contents,
          systemInstruction: TRAVEL_ASSISTANT_SYSTEM_INSTRUCTION,
          signal: controller.signal,
        }),
        timeout,
      ]);

      if (result.blockReason) {
        logger.warn('Gemini blocked the prompt', { blockReason: result.blockReason });
        throw new AppError(
          422,
          'AI_RESPONSE_BLOCKED',
          'The assistant could not respond to that request. Try rephrasing it.',
        );
      }

      const text = result.text?.trim();
      if (!text) {
        logger.warn('Gemini returned an empty response');
        throw new AppError(
          502,
          'AI_EMPTY_RESPONSE',
          'The assistant returned an empty response. Please try again.',
        );
      }

      return text;
    } catch (error) {
      throw this.toAppError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  private toAppError(error: unknown): AppError {
    if (error instanceof AppError) return error;

    if (error instanceof GenerationTimeoutError) {
      logger.warn('Gemini request timed out', { timeoutMs: this.timeoutMs });
      return new AppError(
        504,
        'AI_TIMEOUT',
        'The assistant took too long to respond. Please try again.',
      );
    }

    const status = readStatus(error);
    logger.error('Gemini request failed', {
      errorName: error instanceof Error ? error.name : typeof error,
      status,
      detail: this.safeDetail(error),
    });

    if (status === 429) {
      return new AppError(
        429,
        'AI_RATE_LIMITED',
        'The assistant is receiving too many requests right now. Please try again shortly.',
      );
    }

    return new AppError(
      502,
      'AI_SERVICE_ERROR',
      'The assistant is temporarily unavailable. Please try again later.',
    );
  }

  /** Short, redacted description of an upstream error for server logs only. */
  private safeDetail(error: unknown): string {
    let detail = error instanceof Error ? error.message : String(error);
    for (const secret of this.secretsToRedact) {
      detail = detail.split(secret).join('[redacted]');
    }
    return detail.slice(0, 200);
  }
}
