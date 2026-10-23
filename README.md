# Trip Planner AI

A chat web app where you plan trips with an AI travel assistant powered by Google Gemini.

- **Frontend:** Angular (standalone components, strict TypeScript, signals, reactive forms, plain CSS)
- **Backend:** Node.js, Express, TypeScript, `@google/genai`, Zod, Helmet, CORS, rate limiting
- **Deployment:** Render (backend Web Service + frontend Static Site) via `render.yaml`
- **MVP scope:** no database, no authentication, no external travel APIs. Extension points for PostgreSQL and MCP are documented below.

> **Status note:** this project was written without being able to run `npm install`, builds, or tests (the authoring
> environment blocked the npm registry). Before relying on it, run the commands in [Run the checks](#9-tests-and-builds)
> once on your machine. See [Troubleshooting](#10-troubleshooting) if a version-related error appears.

---

## 1. Overview

Users chat with a travel assistant that can suggest destinations, build day-by-day itineraries, recommend activities and
food, and give budget-conscious advice. Follow-up questions work because the browser keeps the conversation and sends the
recent history with every request. The backend is stateless.

The Gemini API key exists **only** on the backend. The browser never sees it.

## 2. Architecture and directory structure

```
Browser (Angular)  ──POST /api/chat {message, history}──▶  Express  ──▶  Gemini API
        ◀────────────── {reply, role:"model"} ──────────────┘
```

```
trip-planner/
├── frontend/                     Angular app
│   ├── src/app/
│   │   ├── core/models/          typed chat models
│   │   ├── core/services/        ChatService (HttpClient)
│   │   ├── features/chat/        chat UI
│   │   ├── app.component.*       shell (header + router outlet)
│   │   ├── app.config.ts         providers (router, HttpClient)
│   │   └── app.routes.ts         lazy-loaded chat route
│   ├── src/environments/         backend URL per environment
│   ├── scripts/set-api-url.mjs   writes the production API URL at build time
│   └── angular.json
├── backend/
│   ├── src/{config,controllers,errors,mcp,middleware,routes,schemas,services,types,utils}
│   ├── src/app.ts                Express app factory
│   ├── src/server.ts             startup / composition root
│   ├── tests/                    vitest + supertest (Gemini mocked)
│   └── .env.example
├── render.yaml                   Render Blueprint
├── package.json                  root scripts
└── .gitignore
```

Key decisions:

- **Stateless backend, history in the browser.** Simplest thing that works for an MVP; the request/response shapes already
  match what a database-backed version would need.
- **`ChatService` interface.** The controller depends on an interface; `GeminiService` implements it. Adding MCP tools later
  means adding another implementation, not rewriting the controller.
- **`TextGenerationClient` seam.** The only file that imports the Gemini SDK is `services/gemini.client.ts`, so tests use a
  fake and never need an API key.
- **Validation at the edges.** Environment variables (on startup) and request bodies (per request) are validated with Zod.
  The server refuses to start with missing configuration.
- **Consistent, safe errors.** Every failure is `{ "error": { "code", "message" } }`. Unexpected errors are logged on the server
  and return a generic message, never a stack trace.
- **Honest assistant.** The system prompt forbids claiming verified live prices, availability, opening hours, visa rules or bookings.

## 3. Prerequisites

- Node.js 20 or newer (22 recommended; Render is configured for 22) and npm 10+
- A Google Gemini API key (free tier available), see [section 6](#6-get-a-gemini-api-key)

Angular CLI does not need to be installed globally; it is a project dependency.

## 4. Installation

From the repository root:

```bash
npm run install:all
```

This installs the root tooling (`concurrently`), then the backend and frontend dependencies.

## 5. Environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | **yes** | none | Your Gemini API key |
| `GEMINI_MODEL` | no | `gemini-flash-latest` | Model name |
| `PORT` | no | `3000` | HTTP port (Render sets this itself) |
| `NODE_ENV` | no | `development` | `development`, `test` or `production` |
| `FRONTEND_ORIGIN` | no | `http://localhost:4200` | Allowed CORS origin(s), comma-separated, origin only (no path) |
| `GEMINI_TIMEOUT_MS` | no | `30000` | Timeout for a Gemini call |
| `RATE_LIMIT_MAX` | no | `20` | Chat requests per IP per window |
| `RATE_LIMIT_WINDOW_MS` | no | `60000` | Rate-limit window |

`backend/.env` is git-ignored. Only `.env.example` (placeholders) is committed.

The frontend has no secrets. Its only setting is the backend URL (`frontend/src/environments/`).

## 6. Get a Gemini API key

1. Sign in at <https://aistudio.google.com/apikey> with a Google account.
2. Choose **Create API key** (create or select a Google Cloud project if asked).
3. Copy the key into `backend/.env` as `GEMINI_API_KEY=...`.
4. Never paste the key into Angular code, commit it, or share it. If it leaks, delete it in AI Studio and create a new one.

Check Google's current pricing and free-tier limits in AI Studio; they change over time.

## 7. Run locally

Both apps together (from the repo root):

```bash
npm run dev
```

- Frontend: <http://localhost:4200>
- Backend: <http://localhost:3000> (health check: <http://localhost:3000/api/health>)

Or separately, in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

## 8. API examples

Health check:

```bash
curl http://localhost:3000/api/health
```

```json
{ "status": "ok", "service": "trip-planner-backend", "timestamp": "2026-01-01T12:00:00.000Z" }
```

Chat (history is optional and defaults to `[]`):

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Plan a 5-day trip to Italy",
    "history": [
      { "role": "user", "text": "I want to visit Italy" },
      { "role": "model", "text": "What kind of trip do you prefer?" }
    ]
  }'
```

```json
{ "reply": "Here is a suggested 5-day itinerary...", "role": "model" }
```

Limits: `message` 1–2000 characters, `history` up to 40 items of up to 4000 characters each, request body up to 200 KB.

Error responses:

| Status | `code` | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Missing or invalid fields (`details` lists each problem) |
| 400 | `INVALID_JSON` | Malformed JSON body |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 200 KB |
| 422 | `AI_RESPONSE_BLOCKED` | Gemini blocked the prompt |
| 429 | `RATE_LIMITED` / `AI_RATE_LIMITED` | Too many requests to this API / to Gemini |
| 502 | `AI_SERVICE_ERROR` / `AI_EMPTY_RESPONSE` | Gemini failed or returned nothing |
| 504 | `AI_TIMEOUT` | Gemini took longer than `GEMINI_TIMEOUT_MS` |
| 500 | `INTERNAL_ERROR` | Unexpected error (details only in server logs) |

## 9. Tests and builds

```bash
npm test               # backend tests (Gemini is mocked: no API key or cost)
npm run typecheck      # backend type check, including tests
npm run build:backend  # compiles to backend/dist
npm run build:frontend # production build to frontend/dist/frontend/browser
npm run build          # both
```

Backend tests cover: health endpoint, invalid and missing/malformed `message`, malformed JSON, oversized bodies, history
validation, rate limiting, CORS, Gemini service error handling (empty response, blocked prompt, 429, upstream failure,
timeout), history conversion, configuration validation, and the MCP registry.

There are no frontend tests yet.

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| Backend exits with `Invalid configuration: GEMINI_API_KEY is required` | Create `backend/.env` from `.env.example` and set the key. Run commands from the repo root or `backend/`. |
| Browser shows a CORS error | `FRONTEND_ORIGIN` must exactly match the page origin (scheme + host + port, no trailing path). Restart the backend after editing `.env`. |
| "Cannot reach the server" in the chat | Backend not running, or the URL in `frontend/src/environments/environment.ts` is wrong. |
| `502 AI_SERVICE_ERROR` | Check the backend logs for the upstream status. Typical causes: invalid API key, unknown model name, quota exceeded. |
| `404` or model-not-found errors | Set `GEMINI_MODEL` to a model your key can use (see AI Studio). |
| `429 RATE_LIMITED` | You hit the per-IP limit; wait a minute or raise `RATE_LIMIT_MAX`. |
| Port already in use | Change `PORT` in `backend/.env` (and the frontend `apiBaseUrl`), or stop the other process. |
| `npm install` peer-dependency or version errors | The Angular packages are pinned to `^20`. If you use a different Angular CLI, keep all `@angular/*` packages on the same major version and match the TypeScript range that major requires. |
| TypeScript error about `@google/genai` types | Run `npm run build:backend`; method signatures are isolated in `backend/src/services/gemini.client.ts`, the only file to adjust if the SDK API differs from the version installed. |
| After changing the production API URL the site still calls the old one | The URL is baked in at build time. Redeploy (rebuild) the static site. |

## 11. Deploy to Render

The Blueprint in `render.yaml` creates two services:

| Service | Type | Root | Build | Run / publish |
| --- | --- | --- | --- | --- |
| `trip-planner-api` | Web Service (Node) | `backend` | `npm install --include=dev && npm run build` | `npm start`, health check `/api/health` |
| `trip-planner-web` | Static Site | `frontend` | `npm install && npm run build` | publishes `dist/frontend/browser` |

`dist/frontend/browser` comes from `frontend/angular.json`, which sets `outputPath` to `{ "base": "dist/frontend", "browser": "browser" }`.

Steps:

1. Push the repository to GitHub/GitLab. **Commit the `package-lock.json` files** generated by `npm run install:all`.
2. In Render: **New → Blueprint**, pick the repository.
3. When prompted, enter `GEMINI_API_KEY` (it is declared with `sync: false`, so the value is never stored in the YAML).
4. Deploy. When both services are live, note their URLs.
5. **Make the URLs match** (needed if Render's hostnames differ from the defaults `trip-planner-api.onrender.com` and `trip-planner-web.onrender.com`, e.g. a name was already taken):
   - Backend service → Environment → set `FRONTEND_ORIGIN` to the static site's URL (origin only, e.g. `https://my-web.onrender.com`).
   - Static site → Environment → set `API_BASE_URL` to the backend's URL, then **Manual Deploy → Clear build cache & deploy** (the URL is baked in at build time).
6. Open the static site URL and send a message.

Notes:

- On the free plan the backend sleeps when idle, so the first request after a pause can take a while.
- After lockfiles are committed you may switch `npm install` to `npm ci` in the build commands for reproducible builds.
- The in-memory rate limiter is per instance; fine for one instance.

## 12. Future plans

### PostgreSQL

Nothing is stored today. A later phase could add (for example with `pg` or Prisma/Drizzle, and a managed Render Postgres):

- **User accounts:** `users` table plus authentication (sessions or JWT); the chat route would read the user from the session.
- **Persistent conversations:** `conversations(id, user_id, title, created_at)` and `messages(id, conversation_id, role, text, created_at)`. The
  frontend would send a `conversationId` instead of the full history, and the backend would load recent turns itself.
- **Saved trips:** `trips(id, user_id, title, destination, start_date, end_date, ...)`.
- **Itinerary storage:** `itinerary_days(trip_id, day_number, notes)` and `itinerary_items(day_id, time_slot, title, details)`, or a JSONB column
  for the structured itinerary.

Because the controller depends on the `ChatService` interface, persistence can be added as a decorator or a repository layer without changing the Gemini code.

### MCP and travel APIs

`backend/src/mcp/` defines the `TravelTool` interface, a `ToolRegistry`, a placeholder (unregistered, never fakes results) tool, and
`initializeMcp()` which currently returns an empty registry. See `backend/src/mcp/README.md` for exactly where MCP client setup
and tool execution would be added (a tool-aware `ChatService` implementation) and how to wire it in `server.ts`.
Maps, weather, attractions, and hotel/flight data would arrive as tools registered there.
