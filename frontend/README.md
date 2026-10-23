# Trip Planner: Frontend (Angular)

Standalone-component Angular app: a chat UI that talks to the Express backend.

```bash
npm install
npm start          # http://localhost:4200 (expects the backend at http://localhost:3000)
npm run build      # production build -> dist/frontend/browser
```

## Layout

```
src/
├── environments/            environment.ts (dev) and environment.production.ts (prod)
└── app/
    ├── core/
    │   ├── models/          typed request / response / message models
    │   └── services/        ChatService (HttpClient)
    └── features/chat/       ChatComponent (signals + reactive form) and the Markdown pipe
```

## Backend URL

The backend URL is configuration, not code:

- Development: `src/environments/environment.ts` (`http://localhost:3000`).
- Production: `src/environments/environment.production.ts`. At build time `scripts/set-api-url.mjs`
  rewrites it from the `API_BASE_URL` environment variable when that variable is set (this is how Render
  configures it). Angular bakes the value into the bundle, so **changing it requires a rebuild**.

No API keys belong in this project. The Gemini key exists only on the backend.

## Build output

`angular.json` sets `outputPath` to `{ "base": "dist/frontend", "browser": "browser" }`, so the deployable static
files are in `dist/frontend/browser`. `render.yaml` points at that folder.
