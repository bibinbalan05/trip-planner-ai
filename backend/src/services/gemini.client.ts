import { GoogleGenAI } from '@google/genai';
import type { GeminiContent } from './geminiContents';

export interface GenerationRequest {
  model: string;
  contents: GeminiContent[];
  systemInstruction: string;
  signal: AbortSignal;
}

export interface GenerationResult {
  /** Generated text, if any. */
  text: string | undefined;
  /** Set when the prompt was blocked by the model's safety filters. */
  blockReason?: string;
}

/**
 * Thin seam around the Gemini SDK. GeminiService depends on this interface,
 * which lets tests supply a fake and keeps SDK details in one place.
 */
export interface TextGenerationClient {
  generate(request: GenerationRequest): Promise<GenerationResult>;
}

/** Real implementation backed by the official `@google/genai` SDK. */
export class GoogleGenAiTextClient implements TextGenerationClient {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const response = await this.ai.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        abortSignal: request.signal,
      },
    });

    const blockReason = response.promptFeedback?.blockReason;
    return {
      text: response.text,
      ...(blockReason ? { blockReason: String(blockReason) } : {}),
    };
  }
}
