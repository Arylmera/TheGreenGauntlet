# Server / Proxy

Single Node process. Serves React `dist/` + `/api/*`. No separate backend.

## Files (as shipped)
- `server/index.ts` — entrypoint: loads env, builds client + aggregator + SQLite + events, starts Fastify.
- `server/app.ts` — Fastify app builder; registers routes and static/SPA fallback. Same-origin — no CORS plugin by design.
- `server/routes/health.ts`, `server/routes/leaderboard.ts` (incl. SSE stream).
- `server/routes/admin/auth.ts`, `server/routes/admin/bonus.ts`.
- `package.json` scripts: `dev`, `build`, `start`, `test`.

## Stack (shipped)
- **Fastify** + `@fastify/static` on Node 20 alpine.
- `better-sqlite3` for the bonus store (WAL).
- HMAC-signed httpOnly cookie for admin auth (`server/adminSession.ts`).
- In-process `EventEmitter` for SSE fan-out (`server/leaderboardEvents.ts`).

## Routes

**Public**
- `GET /api/health` → `{ ok, tokenExpiresIn, snapshotAgeMs, eventWindow: { startAt, endAt, phase } }`.
- `GET /api/leaderboard` → per-team ranked snapshot `{ teams[], phase, eventWindow, updatedAt }`. Team fields: `rank`, `uuid`, `displayName`, `immersivelab_points` (raw, used by the `Immersive Lab` tab), `il_points` (= raw + helping, used by Total tab), `mario_points`, `crokinole_points`, `total`, `lastActivityAt`. `helping_points` is not on the wire. See [aggregation.md](aggregation.md).
- `GET /api/leaderboard/stream` → SSE. Writes `event: leaderboard-updated` on every cache invalidation (bonus batch, active toggle, IL refresh). 25 s keepalive comment frames. First frame is the current snapshot so late subscribers start warm. Clients refetch `/api/leaderboard` on event.

**Admin** (cookie-auth, see [admin-bonus-plan.md](admin-bonus-plan.md))
- `POST /api/admin/login` / `POST /api/admin/logout`.
- `GET /api/admin/bonus` — list all teams with `immersivelab_points`, `helping_points`, `mario_points`, `crokinole_points`, `il_points`, `total`, `active`, `updated_at`, `updated_by`.
- `POST /api/admin/bonus/batch` — array of `{ teamId, category: 'mario'|'crokinole'|'helping', delta: int }` applied in one SQLite transaction. Rejects the whole batch if any resulting category total would be < 0.
- `PATCH /api/admin/bonus/:teamId/active` — `{ active: boolean }`; excludes/includes the team from the public leaderboard.
- `GET /api/admin/export.csv` — `team_id, team_name, immersivelab_points, helping_points, mario_points, crokinole_points, total, rank`.

**Static**
- `GET /assets/*` → static from `dist/assets`.
- `GET /*` non-`/api` → `dist/index.html` (SPA fallback; React serves `/admin`).

## Behaviors
- Listens on `PORT` (default 3000).
- Fastify pino logger; `LOG_LEVEL` env controls verbosity.
- Error handler: ImmersiveLab 401 → one refresh + retry in the client; ImmersiveLab 5xx/timeout → 503 with stale snapshot if available.
- No CORS plugin is registered — same origin by design. Unknown `/api/*` → 404.
- `/api/admin/*` (except `/login`) requires the `gg_admin` signed cookie; unauthenticated → 401.
- `/api/admin/login` is rate-limited globally (20 attempts / 5 min across all IPs, single shared credential). Failed attempts logged.
- IL upstream fetch: paginated `/v2/accounts` list, then per-uuid detail fetches with **concurrency 8**.

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
