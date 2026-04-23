# Server / Proxy

Single Node process. Serves React `dist/` + `/api/*`. No separate backend.

## Files
- `server/index.ts` — entrypoint, routing, static fallback.
- `package.json` scripts: `dev`, `build`, `start`.

## Stack
- Fastify (preferred, faster static + schema) or Express. Keep ~100 lines.
- Node 20 alpine runtime.

## Routes

**Public**
- `GET /api/health` → `{ ok, tokenExpiresIn, snapshotAgeMs, eventWindow: { startAt, endAt, phase } }`.
- `GET /api/leaderboard` → per-team ranked snapshot `{ teams[], phase, eventWindow, updatedAt }` with `il_points` + `bonus_points` + `total` (see [aggregation.md](aggregation.md)).
- `GET /api/leaderboard/stream` → SSE stream emitting `leaderboard-updated` whenever the snapshot cache is invalidated (bonus write, active toggle, IL refresh). Clients refetch on event. See [admin-bonus-plan.md](admin-bonus-plan.md) Discussion C.

**Admin** (cookie-auth, see [admin-bonus-plan.md](admin-bonus-plan.md))
- `POST /api/admin/login` / `POST /api/admin/logout`.
- `GET /api/admin/bonus` — list all teams with `il_points`, `bonus_points`, `total`, `active`, `updated_at`.
- `POST /api/admin/bonus/batch` — apply multiple signed deltas atomically.
- `PATCH /api/admin/bonus/:teamId/active` — show/hide team.
- `GET /api/admin/export.csv` — final standings export.

**Static**
- `GET /assets/*` → static from `dist/assets`.
- `GET /*` non-`/api` → `dist/index.html` (SPA fallback; React serves `/admin`).

## Behaviors
- Listens on `PORT` (default 3000).
- Logs request id, path, ImmersiveLab upstream latency, cache hit/miss.
- Error handler: maps ImmersiveLab 401 → trigger refresh + retry once; ImmersiveLab 5xx/timeout → 503 with stale snapshot if available.
- No CORS headers needed (same origin). Deny unknown `/api/*` with 404.
- `/api/admin/*` (except `/login`) requires the `gg_admin` signed cookie; unauthenticated → 401.
- `/api/admin/login` is rate-limited globally (20 attempts / 5 min across all IPs, single shared credential). Failed attempts logged.

## Steps
1. Scaffold Fastify server with health route.
2. Wire static + SPA fallback against `dist/`.
3. Add `/api/leaderboard` calling aggregator.
4. Add structured logging + error mapping.
5. Graceful shutdown on SIGTERM.

## Verification
- `curl :3000/api/health` → 200.
- `curl :3000/api/leaderboard` → non-empty `teams[]` sorted by points desc; `phase` matches clock vs event window.
- Unknown `/foo` → `index.html`.
- Unknown `/api/foo` → 404.
