export type ChatRole = 'user' | 'model';

/** One turn of the conversation, as sent by the frontend. */
export interface ChatMessage {
  role: ChatRole;
  text: string;
}

/** Body returned by POST /api/chat. */
export interface ChatReply {
  reply: string;
  role: 'model';
}

/**
 * The contract the chat controller depends on.
 *
 * GeminiService implements it today. A future tool-aware implementation (for example one
 * that runs MCP tools) can wrap or replace it without touching the controller.
 */
export interface ChatService {
  generateReply(message: string, history: ChatMessage[]): Promise<string>;
}
