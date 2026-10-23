import { z } from 'zod';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_ITEMS = 40;
export const MAX_HISTORY_TEXT_LENGTH = 4000;

const historyItemSchema = z.object({
  role: z.enum(['user', 'model'], {
    errorMap: () => ({ message: "role must be either 'user' or 'model'" }),
  }),
  text: z
    .string({ required_error: 'text is required', invalid_type_error: 'text must be a string' })
    .trim()
    .min(1, 'text must not be empty')
    .max(MAX_HISTORY_TEXT_LENGTH, `text must be at most ${MAX_HISTORY_TEXT_LENGTH} characters`),
});

export const chatRequestSchema = z.object({
  message: z
    .string({
      required_error: 'message is required',
      invalid_type_error: 'message must be a string',
    })
    .trim()
    .min(1, 'message must not be empty')
    .max(MAX_MESSAGE_LENGTH, `message must be at most ${MAX_MESSAGE_LENGTH} characters`),
  history: z
    .array(historyItemSchema)
    .max(MAX_HISTORY_ITEMS, `history can contain at most ${MAX_HISTORY_ITEMS} items`)
    .default([]),
});

export type ChatRequestBody = z.infer<typeof chatRequestSchema>;
