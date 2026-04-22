# Deployment

Single container. One port. One deploy.

## Dockerfile (multi-stage)
```
stage 1 — builder
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build          # vite build → dist/, tsc → server/*.js

stage 2 — runtime
  FROM node:20-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --omit=dev
  COPY --from=builder /app/dist ./dist
  COPY --from=builder /app/server ./server
  EXPOSE 3000
  CMD ["node", "server/index.js"]
```

## Routing at runtime
- `GET /api/*` → proxy handlers.
- `GET /assets/*` → static from `dist/assets`.
- `GET /*` → `dist/index.html` (SPA fallback).

## Dev workflow
- `npm run dev` starts Vite (5173) + Node proxy (3000) via `concurrently`.
- Vite config: `server.proxy['/api'] = 'http://localhost:3000'`.
- `.env` loaded by server (dotenv), not exposed to Vite.

## Ops
- Health probe: `GET /api/health`.
- Restart policy: unless-stopped.
- Logs to stdout (JSON). Let platform collect.
- Single instance acceptable (in-memory caches). If scaling later: move snapshot cache to Redis or accept brief stale diffs.

## Steps
1. Add Dockerfile + `.dockerignore`.
2. Add `start` script → `node server/index.js`.
3. Add `dev` script (concurrently vite + tsx server).
4. CI: build image, run health probe against container.

## Verification
- `docker build . -t gauntlet && docker run -p 3000:3000 --env-file .env gauntlet` → health 200.
- Incognito browser on `:3000` → leaderboard renders.
