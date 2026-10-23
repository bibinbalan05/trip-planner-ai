# Trip Planner: Backend (Express + Gemini)

```bash
cp .env.example .env     # then add your GEMINI_API_KEY
npm install
npm run dev              # http://localhost:3000, restarts on change
npm test                 # unit and route tests (Gemini is mocked)
npm run typecheck
npm run build && npm start
```

## Layout

```
src/
├── config/        env.ts: Zod-validated environment (server refuses to start if invalid)
├── controllers/   thin request handlers
├── errors/        AppError (safe-to-show errors)
├── mcp/           future MCP / tool extension point (see mcp/README.md)
├── middleware/    validation, rate limiting, central error handler
├── routes/        route definitions
├── schemas/       Zod request schemas
├── services/      GeminiService, SDK adapter, system prompt, history conversion
├── types/         shared types, including the ChatService contract
├── utils/         logger
├── app.ts         builds the Express app (dependencies injected)
└── server.ts      composition root: loads config, wires services, starts listening
tests/             vitest + supertest
```

## Endpoints

- `GET /api/health`
- `POST /api/chat` with `{ "message": string, "history"?: [{ "role": "user" | "model", "text": string }] }`

Errors always look like `{ "error": { "code": "...", "message": "..." } }`.
