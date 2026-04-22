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
  RUN mkdir -p /app/data
  VOLUME ["/app/data"]
  EXPOSE 3000
  CMD ["node", "server/index.js"]
```

## Volume
- Named volume mounted at `/app/data` (default `DATA_DIR`). Holds `snapshot.json` + `token.json`. Survives container recreate, reboot, and image updates.
- `docker run -v greengauntlet-data:/app/data -p 3000:3000 ...` (or compose `volumes: [greengauntlet-data:/app/data]`).
- Hosting-specific volume driver syntax decided at deploy time (Fly volume, Render disk, Railway volume).

## Boot sequence
1. Read env (`server/env.ts`), fail fast on missing/invalid.
2. Ensure `DATA_DIR` exists and is writable; fail fast otherwise.
3. Load `token.json` → token cache (skip re-auth if still valid).
4. Load `snapshot.json` → stale slot (`/api/leaderboard` serves it immediately).
5. Start HTTP listener.
6. First request triggers fresh rebuild in background; single-flight guards concurrent misses.

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
- Single instance acceptable (in-memory cache backed by on-disk JSON). If scaling later: move snapshot to Redis or shared store; named volume is single-writer.
- Post-event freeze: after `EVENT_END_AT`, server stops rebuilding the snapshot. `/api/leaderboard` keeps serving the last pre-end snapshot (from memory + disk) indefinitely.

## Steps
1. Add Dockerfile + `.dockerignore`.
2. Add `start` script → `node server/index.js`.
3. Add `dev` script (concurrently vite + tsx server).
4. CI: build image, run health probe against container.

## Verification
- `docker build . -t gauntlet && docker run -p 3000:3000 -v greengauntlet-data:/app/data --env-file .env gauntlet` → health 200.
- Incognito browser on `:3000` → leaderboard renders.
- Kill + recreate container with same volume → `/api/leaderboard` serves stale from `snapshot.json` before first rebuild completes; `token.json` avoids re-auth.
