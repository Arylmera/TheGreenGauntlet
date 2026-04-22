# Env Config

Server-only. Never exposed to browser/Vite.

## Variables
| Name | Required | Default | Purpose |
|------|----------|---------|---------|
| `IMMERSIVELAB_ACCESS_KEY` | yes | — | ImmersiveLab API access key (username for token exchange). |
| `IMMERSIVELAB_SECRET_TOKEN` | yes | — | ImmersiveLab API secret (password for token exchange). |
| `IMMERSIVELAB_BASE_URL` | no | `https://api.immersivelabs.online` | Region-specific base URL. Confirm before prod. |
| `EVENT_START_AT` | yes | — | ISO 8601 UTC. Attempts with `completedAt < EVENT_START_AT` are excluded. Also drives "not started" UI state. |
| `EVENT_END_AT` | yes | — | ISO 8601 UTC. Attempts with `completedAt > EVENT_END_AT` are excluded (leaderboard freezes). Also drives "event over" UI state. |
| `PORT` | no | `3000` | HTTP listen port. |
| `SNAPSHOT_TTL_MS` | no | `10000` | Leaderboard snapshot cache TTL. |
| `TOKEN_REFRESH_MARGIN_S` | no | `60` | Refresh access token this many seconds before expiry. |
| `LOG_LEVEL` | no | `info` | Pino/Fastify log level. |

## Files
- `.env.example` — documented, committed, no real values.
- `.env` — gitignored, used by `dotenv` in `server/index.ts`.
- Do NOT prefix with `VITE_`. Vite must not see these.

## Validation
- On startup, `server/env.ts` parses + validates (zod). Fail fast if required missing.
- `EVENT_START_AT` and `EVENT_END_AT` must parse as valid ISO 8601 and satisfy `start < end`. Fail fast otherwise.
- Log presence (not values) of secrets at boot. Log resolved event window at boot.

## Steps
1. Add `.env.example` with all vars.
2. Add `server/env.ts` with zod schema.
3. Import once in `server/index.ts` before other modules.
4. Update `.gitignore` for `.env`.

## Verification
- Missing `IMMERSIVELAB_ACCESS_KEY` → server exits with clear message.
- Missing or malformed `EVENT_START_AT` / `EVENT_END_AT` → server exits with clear message.
- `EVENT_START_AT >= EVENT_END_AT` → server exits with clear message.
- `/api/health` response includes `eventWindow: { startAt, endAt, phase: "pre" | "live" | "ended" }`.
- `VITE_` prefix accidentally added → build-time grep CI check fails.
- Bundle audit: `grep -r IMMERSIVELAB_ACCESS_KEY dist/` → zero hits.
