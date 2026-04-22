# Server / Proxy

Single Node process. Serves React `dist/` + `/api/*`. No separate backend.

## Files
- `server/index.ts` — entrypoint, routing, static fallback.
- `package.json` scripts: `dev`, `build`, `start`.

## Stack
- Fastify (preferred, faster static + schema) or Express. Keep ~100 lines.
- Node 20 alpine runtime.

## Routes
- `GET /api/health` → `{ ok, tokenExpiresIn, snapshotAgeMs, eventWindow: { startAt, endAt, phase } }`.
- `GET /api/leaderboard` → per-account ranked snapshot with `phase` + `eventWindow` (see [aggregation.md](aggregation.md)).
- `GET /assets/*` → static from `dist/assets`.
- `GET /*` non-`/api` → `dist/index.html` (SPA fallback).

## Behaviors
- Listens on `PORT` (default 3000).
- Logs request id, path, ImmersiveLab upstream latency, cache hit/miss.
- Error handler: maps ImmersiveLab 401 → trigger refresh + retry once; ImmersiveLab 5xx/timeout → 503 with stale snapshot if available.
- No CORS headers needed (same origin). Deny unknown `/api/*` with 404.

## Steps
1. Scaffold Fastify server with health route.
2. Wire static + SPA fallback against `dist/`.
3. Add `/api/leaderboard` calling aggregator.
4. Add structured logging + error mapping.
5. Graceful shutdown on SIGTERM.

## Verification
- `curl :3000/api/health` → 200.
- `curl :3000/api/leaderboard` → non-empty `accounts[]` sorted by points desc.
- Unknown `/foo` → `index.html`.
- Unknown `/api/foo` → 404.
