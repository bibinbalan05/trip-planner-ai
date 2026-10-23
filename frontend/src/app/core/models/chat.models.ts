export type ChatRole = 'user' | 'model';

/** A message shown in the conversation UI. */
export interface ChatMessage {
  /** Unique id used by `@for` tracking. */
  id: number;
  role: ChatRole;
  text: string;
}

/** One turn of history as the backend expects it. */
export interface ChatHistoryItem {
  role: ChatRole;
  text: string;
}

/** Body of POST /api/chat. */
export interface ChatRequest {
  message: string;
  history: ChatHistoryItem[];
}

/** Successful response of POST /api/chat. */
export interface ChatResponse {
  reply: string;
  role: 'model';
}

/** Error body returned by the backend for every failure. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
