# Deployment

Single container. One port. One deploy.

## Dockerfile (multi-stage, as shipped)
Three stages — **builder**, **deps**, **runtime** — so the runtime image ships without build toolchains.

```
# builder — installs full deps, builds Vite + TSC
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++    # better-sqlite3 native build fallback
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts postcss.config.js tailwind.config.ts index.html ./
COPY src ./src
COPY server ./server
RUN npm run build                          # → /app/dist + /app/dist-server

# deps — production node_modules only (keeps runtime image small)
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# runtime — non-root node user, tini as PID 1, healthcheck baked in
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data PORT=3000
RUN apk add --no-cache tini wget \
 && mkdir -p /app/data \
 && chown -R node:node /app
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/dist-server ./dist-server
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist-server/index.js"]
```

## docker-compose (as shipped)
```yaml
services:
  gauntlet:
    image: ghcr.io/arylmera/thegreengauntlet:latest
    pull_policy: always
    container_name: green-gauntlet
    restart: unless-stopped
    ports:
      - "1337:3000"
    env_file:
      - .env
    environment:
      DATA_DIR: /app/data
    volumes:
      - greengauntlet-data:/app/data
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  greengauntlet-data:
```

## Volume
- Named volume mounted at `/app/data` (default `DATA_DIR`). Holds `snapshot.json` + `token.json` + `bonus.sqlite` (admin bonus DB **and** announcement table, see [admin-bonus-plan.md](admin-bonus-plan.md)). Survives container recreate, reboot, and image updates.
- `docker run -v greengauntlet-data:/app/data -p 3000:3000 ...` (or compose `volumes: [greengauntlet-data:/app/data]`).
- Hosting-specific volume driver syntax decided at deploy time (Fly volume, Render disk, Railway volume).

## Boot sequence
1. Read env (`server/env.ts`), fail fast on missing/invalid.
2. Ensure `DATA_DIR` exists and is writable; fail fast otherwise.
3. Load `token.json` → token cache (skip re-auth if still valid).
4. Load `snapshot.json` → stale slot (`/api/leaderboard` serves it immediately).
5. Open `bonus.sqlite` (create + run migrations if missing), set `PRAGMA journal_mode=WAL`.
6. Start HTTP listener.
6. First request triggers fresh rebuild in background; single-flight guards concurrent misses.

## Routing at runtime
- `GET /api/*` → proxy handlers (public leaderboard, health, SSE stream, public announcement).
- `POST/GET/PATCH/PUT/DELETE /api/admin/*` → admin handlers, cookie-auth (bonus, active toggle, announcement, CSV export — see [admin-bonus-plan.md](admin-bonus-plan.md)).
- `GET /assets/*` → static from `dist/assets`.
- `GET /*` → `dist/index.html` (SPA fallback; React route `/admin` lives inside the bundle).

## Server module layout (as shipped)
After the `server/` split (commit c7ffd24):
- `server/index.ts`, `server/app.ts`, `server/env.ts`, `server/logger.ts`, `server/snapshotStore.ts`
- `server/auth/` — HMAC + cookie helpers
- `server/immersivelab/` — token manager + paginated client + schemas (+ stub for tests)
- `server/leaderboard/` — aggregator, ranking, SSE event emitter, types
- `server/bonus/` — better-sqlite3 wrapper, schema (team_bonus + announcement), types
- `server/routes/` — `health.ts`, `leaderboard.ts`, `admin/{auth,bonus,announcement,exportCsv}.ts`

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
2. Add `start` script → `node dist-server/index.js`.
3. Add `dev` script (concurrently vite + tsx server).
4. CI: build image, run health probe against container.

## Verification
- `docker build . -t gauntlet && docker run -p 3000:3000 -v greengauntlet-data:/app/data --env-file .env gauntlet` → health 200.
- Incognito browser on `:3000` → leaderboard renders.
- Kill + recreate container with same volume → `/api/leaderboard` serves stale from `snapshot.json` before first rebuild completes; `token.json` avoids re-auth.
