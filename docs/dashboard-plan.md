# Plan: Fetch Account Points for Team Competition Dashboard

## Context
Event where pre-created Immersive Labs accounts compete as teams. Dashboard is **publicly viewable** — anyone who opens the URL sees live standings, no login. Per-account and per-team totals refresh every **30 s**.

**Deployment shape:** single Node service. One process serves the built React bundle as static files **and** the `/api/*` proxy endpoints. One container, one port, one deploy. No separate frontend/backend service, no Docker compose multi-service orchestration.

## Auth model — proxy is mandatory
The site is public, so the browser cannot hold the IL access key or secret token. All IL calls go through our proxy:

- Proxy stores `IL_ACCESS_KEY` + `IL_SECRET_TOKEN` in server-side env.
- Proxy exchanges them at `POST /v1/public/tokens` for a ~30 min `accessToken` and caches it in memory.
- Proxy refreshes the token on 401 or a few minutes before expiry.
- Proxy exposes a **minimal, read-only** surface to the browser — only the endpoints the dashboard needs. No passthrough of arbitrary `/v2/*` paths.
- Optional: cache aggregated leaderboard response for ~10 s to protect IL rate limits when many viewers are watching.

No token ever reaches the browser. No TokenGate UI.

## Relevant API facts (from `docs/immersivelab-api.json`)
- **Base URL**: `https://api.immersivelabs.online` (confirm region).
- **Auth**: `POST /v1/public/tokens` form-encoded `username={access_key}&password={secret_token}` → `accessToken` valid ~30 min. **Proxy only.**
- **Accounts**: `GET /v2/accounts` (scope `account:read`). `Account.points: integer | null`. Fields used: `uuid`, `displayName`, `email`, `points`, `lastActivityAt`.
- **Pagination**: `{ page: [...], meta: { nextPageToken, hasNextPage } }`. Pass `?page_token=...`. Do not change page size mid-walk.
- **Teams**: `GET /v2/teams` + `GET /v2/teams/{team_id}/memberships`.
- **No leaderboard endpoint** — totals per team computed by summing `Account.points`.
- `Account.teams` field deprecated; don't rely on it.

## Team model
- **Primary**: `/v2/teams` + memberships. If non-empty, use them.
- **Fallback**: `teams.json` on the proxy (`{ teamName: [accountEmail, ...] }`). Loader picks local mapping when API returns zero teams.

## Architecture

```
[ public browser ]  --fetch-->  [ our proxy ]  --Bearer-->  [ IL API ]
     no token                    holds secret,
                                 caches token
```

### Endpoints exposed by the proxy
- `GET /api/leaderboard` — returns aggregated `{ teams:[{uuid,name,total,members:[...]}], updatedAt }`. Aggregation happens server-side so the browser ships no IL schema and no raw account list unless needed.
- `GET /api/accounts` *(optional)* — flat account list for the drill-down view, scrubbed of sensitive fields.
- `GET /api/health` — proxy + token status.

### Proxy internals
- Single Node server (Fastify or Express, ~100-line file). Same process serves `dist/` (the Vite build output) as static assets. SPA fallback: unknown non-`/api` routes return `index.html`.
- In-memory token cache with expiry.
- On each `/api/leaderboard` request (throttled to once per ~10 s via a simple cache):
  1. Ensure fresh token.
  2. Walk `/v2/accounts` and `/v2/teams` in parallel, paginated.
  3. Per team, fetch `/v2/teams/{id}/memberships`.
  4. If teams empty → load `teams.json`.
  5. Build `teamUuid → { name, total, members }`, sort desc, return.

### Frontend (React + Vite)
```
src/
  api/
    client.ts         // fetch('/api/leaderboard'), no auth
  hooks/
    useLeaderboard.ts // polls every 30s, returns {teams, updatedAt}
  components/
    Leaderboard.tsx   // team standings
    AccountList.tsx   // per-account detail / drill-down
  App.tsx
  main.tsx
```

- **`client.ts`**: just `fetch('/api/leaderboard')` — no headers, no token logic. Throws on non-2xx.
- **`useLeaderboard`**: mount + every 30 s. `AbortController` on unmount. Pauses polling when `document.hidden`.
- **`Leaderboard.tsx`**: ranked list of teams (total, member count). `AccountList.tsx` expands a team to show members' points.

## CORS
Browser only talks to the proxy at same origin, so no IL-side CORS concern. Proxy → IL is server-to-server.

## Env (proxy side, never exposed)
- `IL_ACCESS_KEY`
- `IL_SECRET_TOKEN`
- `IL_BASE_URL` (default `https://api.immersivelabs.online`)
- `LEADERBOARD_CACHE_MS` (default `10000`)

## Files to create / modify
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `server/index.ts` (or `api/leaderboard.ts` if serverless) — proxy + aggregation
- `server/il.ts` — token cache + paginated IL walkers
- `server/teams.json` — fallback mapping (optional)
- `src/api/client.ts`, `src/hooks/useLeaderboard.ts`
- `src/components/{Leaderboard,AccountList}.tsx`
- `src/App.tsx`, `src/main.tsx`
- `.env.example` with proxy vars
- `README.md` with deployment + runbook

## Verification
1. `npm run dev` starts Vite + proxy (concurrently or via Vite middleware).
2. `curl localhost:5173/api/health` → `{ok:true, tokenExpiresIn: N}`.
3. `curl localhost:5173/api/leaderboard` → non-empty `teams[]` with totals.
4. Open the site in an **incognito window with no credentials** → leaderboard renders.
5. Complete one lab on a test account → within 30 s + cache window the dashboard reflects the delta.
6. Force token expiry (restart proxy or wait 30 min) → next request transparently refreshes, no user-visible error.
7. Open two browsers → identical totals within one poll cycle.
8. Inspect browser devtools → **no IL domain in network tab, no secrets in JS bundle**.

## Runtime layout
```
Dockerfile (multi-stage)
  stage 1: node:alpine — npm ci, vite build → /dist
  stage 2: node:alpine — copy server/ + /dist, npm ci --omit=dev
  CMD ["node", "server/index.js"]  -> listens on :3000
    GET /api/*      -> proxy handlers
    GET /assets/*   -> static from dist/
    GET /*          -> dist/index.html  (SPA fallback)
```

Dev: `npm run dev` runs Vite (5173) with a proxy rule forwarding `/api` to the Node server (3000) run in parallel (`concurrently` or `npm-run-all`).

## Open items to confirm before coding
- Region-specific base URL (`.online` vs EU/US variants).
- Whether `AccountList` drill-down is in scope for v1 or leaderboard-only.
