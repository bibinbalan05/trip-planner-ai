import type { ChatMessage, ChatRole } from '../types/chat';

/** Structural match for the SDK's `Content` type, so this file stays SDK-independent. */
export interface GeminiContent {
  role: ChatRole;
  parts: Array<{ text: string }>;
}

/**
 * Converts application history plus the new message into Gemini `contents`.
 *
 * Normalisation rules:
 * - Gemini expects a conversation to begin with a user turn, so leading 'model'
 *   messages (for example a client-side welcome message) are dropped.
 * - Consecutive turns from the same role (for example after a failed request that the
 *   user retried) are merged into one turn.
 */
export function toGeminiContents(history: ChatMessage[], message: string): GeminiContent[] {
  const turns: ChatMessage[] = [...history, { role: 'user', text: message }];

  const firstUserIndex = turns.findIndex((turn) => turn.role === 'user');
  const usable = firstUserIndex === -1 ? [] : turns.slice(firstUserIndex);

  const merged: ChatMessage[] = [];
  for (const turn of usable) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.text = `${last.text}\n\n${turn.text}`;
    } else {
      merged.push({ role: turn.role, text: turn.text });
    }
  }

  return merged.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] }));
}
