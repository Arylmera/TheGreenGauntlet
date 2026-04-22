# Plan: Account-Based Leaderboard Dashboard

## Context
Event where pre-created Immersive Labs accounts compete **individually**. Dashboard is **publicly viewable** — anyone who opens the URL sees live standings, no login. Per-account standings refresh every **30 s**.

**Deployment shape:** single Node service. One process serves the built React bundle as static files **and** the `/api/*` proxy endpoints. One container, one port, one deploy. No separate frontend/backend service, no Docker compose multi-service orchestration.

**Prior art:** `devops-day-leaderboard` is the account-based version of this dashboard, running in production for a previous event. We reuse its auth, ImmersiveLab client, and sync service modules directly. This plan is essentially a rebuild of that project on a cleaner React + Vite frontend, keeping the proven backend.

## Auth model — proxy is mandatory
The site is public, so the browser cannot hold the ImmersiveLab access key or secret token. All ImmersiveLab calls go through our proxy:

- Proxy stores `IMMERSIVELAB_ACCESS_KEY` + `IMMERSIVELAB_SECRET_TOKEN` in server-side env.
- Proxy exchanges them at `POST /v1/public/tokens` for a ~30 min `accessToken` and caches it in memory (persisted to `token.json` like the prior project, so restarts don't always re-auth).
- Proxy refreshes the token on 401 or a few minutes before expiry.
- Proxy exposes a **minimal, read-only** surface to the browser — only the endpoints the dashboard needs. No passthrough of arbitrary `/v2/*` paths.
- Cache aggregated leaderboard response for ~10 s to protect ImmersiveLab rate limits when many viewers are watching.

No token ever reaches the browser.

## Relevant API facts (from `docs/immersivelab-api.json` + prior project)
- **Base URL**: `https://api.immersivelabs.online`.
- **Auth**: `POST /v1/public/tokens` form-encoded `username={access_key}&password={secret_token}` → `accessToken` valid ~30 min. **Proxy only.**
- **Accounts**: `GET /v2/accounts` (scope `account:read`). `Account.points: integer | null`. Fields used: `uuid`, `displayName`, `email`, `points`, `lastActivityAt`.
- **Activities + attempts**: if we adopt attempt-level scoring, points per account = sum over activities of the **best** (highest-scoring) attempt on that activity — **not** the sum of all attempts. Multiple attempts on the same activity do not stack. `totalDuration` likewise comes from the best attempt (or the completed one).
- **No event-window in the API**: the OpenAPI spec has no `Event` entity with start/end timestamps. The event window is supplied out-of-band via `EVENT_START_AT` / `EVENT_END_AT` env vars; the proxy filters attempts by `completedAt` against that window before best-attempt selection.
- **Pagination**: `{ page: [...], meta: { nextPageToken, hasNextPage } }`. Pass `?page_token=...`. Do not change page size mid-walk.
- **No leaderboard endpoint** — leaderboard is computed from accounts (or attempts) server-side.
- **Gotchas carried over**:
  - Use `??` not `||` when reading `attempt.totalDuration` — `0` is a valid value.
  - Sync must skip orphan attempts whose activity 404s, not abort the batch.

## Architecture

```
[ public browser ]  --fetch-->  [ our proxy ]  --Bearer-->  [ ImmersiveLab API ]
     no token                    holds secret,
                                 caches token
```

### Endpoints exposed by the proxy
- `GET /api/leaderboard` — returns `{ accounts: [{ uuid, displayName, points, lastActivityAt, timeSpent?, completedCount? }], updatedAt }`, sorted by points desc. Aggregation + sorting happens server-side.
- `GET /api/health` — proxy + token status.

### Proxy internals
- Single Node server (Express, aligned with prior project). Same process serves `dist/` (the Vite build output) as static assets. SPA fallback: unknown non-`/api` routes return `index.html`.
- In-memory token cache with expiry (+ optional `token.json` persistence).
- On each `/api/leaderboard` request (throttled to once per ~10 s via a simple cache):
  1. Ensure fresh token.
  2. Walk `/v2/accounts`, paginated.
  3. (If attempts path chosen) walk `/v2/activities` + `/v2/attempts`. **Filter attempts by `completedAt` ∈ [`EVENT_START_AT`, `EVENT_END_AT`]** before best-attempt selection. For each `(account, activity)` pair, keep only the best-scoring in-window attempt; account total = sum of those bests.
  4. Sort accounts desc by total points. Tie-break by `lastActivityAt` asc (earlier-finisher wins), then display name.
  5. Scrub PII: keep `displayName`, drop `email` by default.
  6. Return + cache snapshot.

### Frontend (React + Vite)
```
src/
  api/
    client.ts          // fetch('/api/leaderboard'), no auth
  hooks/
    useLeaderboard.ts  // polls every 30s, returns {accounts, updatedAt}
  components/
    Leaderboard.tsx    // ranked list of accounts
    AccountRow.tsx     // single row (rank, name, points, time spent)
  App.tsx
  main.tsx
```

- **`client.ts`**: just `fetch('/api/leaderboard')` — no headers, no token logic. Throws on non-2xx.
- **`useLeaderboard`**: mount + every 30 s. `AbortController` on unmount. Pauses polling when `document.hidden`.
- **`Leaderboard.tsx`**: ranked list of accounts (rank, display name, points, optional time spent, optional completed count).

## CORS
Browser only talks to the proxy at same origin, so no ImmersiveLab-side CORS concern. Proxy → ImmersiveLab is server-to-server.

## Env (proxy side, never exposed)
- `IMMERSIVELAB_ACCESS_KEY`
- `IMMERSIVELAB_SECRET_TOKEN`
- `IMMERSIVELAB_BASE_URL` (default `https://api.immersivelabs.online`)
- `EVENT_START_AT` (ISO 8601, required — attempts before this are excluded)
- `EVENT_END_AT` (ISO 8601, required — attempts after this are excluded; leaderboard freezes)
- `LEADERBOARD_CACHE_MS` (default `10000`)
- `PORT` (default `3000`)

## Files to create / modify
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `server/index.ts` — Express app, static serving, SPA fallback
- `server/immersiveLab.ts` — token cache + paginated ImmersiveLab walkers (port of prior `immersiveLabsClient.js`)
- `server/auth.ts` — token exchange + refresh (port of prior `immersiveLabsAuth.js`)
- `server/leaderboard.ts` — aggregation + 10 s snapshot cache
- `src/api/client.ts`, `src/hooks/useLeaderboard.ts`
- `src/components/{Leaderboard,AccountRow}.tsx`
- `src/App.tsx`, `src/main.tsx`
- `.env.example` with proxy vars
- `README.md` with deployment + runbook

## Verification
1. `npm run dev` starts Vite + proxy (concurrently or via Vite middleware).
2. `curl localhost:5173/api/health` → `{ ok: true, tokenExpiresIn: N }`.
3. `curl localhost:5173/api/leaderboard` → non-empty `accounts[]`, sorted by points desc.
4. Open the site in an **incognito window with no credentials** → leaderboard renders.
5. Complete one lab on a test account → within 30 s + cache window the dashboard reflects the delta.
6. Force token expiry (restart proxy or wait 30 min) → next request transparently refreshes, no user-visible error.
7. Open two browsers → identical standings within one poll cycle.
8. Inspect browser devtools → **no ImmersiveLab domain in network tab, no secrets in JS bundle, no emails in response**.

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

## Open items
Tracked in [../TODO.md](../TODO.md) — single source of truth for credentials, event rules, ops, UX, and points-source / persistence / admin-scope decisions.
