# Env Config

Server-only. Never exposed to browser/Vite.

## Variables
| Name | Required | Default | Purpose |
|------|----------|---------|---------|
| `IL_ACCESS_KEY` | yes | — | IL API access key (username for token exchange). |
| `IL_SECRET_TOKEN` | yes | — | IL API secret (password for token exchange). |
| `IL_BASE_URL` | no | `https://api.immersivelabs.online` | Region-specific base URL. Confirm before prod. |
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
- Log presence (not values) of secrets at boot.

## Steps
1. Add `.env.example` with all vars.
2. Add `server/env.ts` with zod schema.
3. Import once in `server/index.ts` before other modules.
4. Update `.gitignore` for `.env`.

## Verification
- Missing `IL_ACCESS_KEY` → server exits with clear message.
- `VITE_` prefix accidentally added → build-time grep CI check fails.
- Bundle audit: `grep -r IL_ACCESS_KEY dist/` → zero hits.
