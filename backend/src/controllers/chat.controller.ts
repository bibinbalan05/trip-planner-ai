import type { RequestHandler } from 'express';
import type { ChatRequestBody } from '../schemas/chat.schema';
import type { ChatReply, ChatService } from '../types/chat';

/**
 * Handles POST /api/chat. The body has already been validated by `validateBody`.
 * The controller only knows the ChatService contract, not Gemini or any future tool layer.
 */
export function createChatController(chatService: ChatService): RequestHandler {
  return async (req, res, next) => {
    try {
      const { message, history } = req.body as ChatRequestBody;
      const reply = await chatService.generateReply(message, history);
      const body: ChatReply = { reply, role: 'model' };
      res.status(200).json(body);
    } catch (error) {
      next(error);
    }
  };
}
