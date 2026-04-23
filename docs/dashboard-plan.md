# Plan: Team-Based Leaderboard Dashboard

## Context
8-hour live event. 30 teams, 1 fresh Immersive Labs account per team, credentials handed out at `EVENT_START_AT`. Dashboard is **publicly viewable** — anyone who opens the URL sees live standings, no login. Per-team standings refresh every **30 s**. See [implementation/dashboard-storage-plan.md](implementation/dashboard-storage-plan.md) for persistence + scoring decisions.

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
- **Accounts**: `GET /v2/accounts` (list) + `GET /v2/accounts/{uuid}` (detail). Scope `account:read`. `Account.points: integer | null`. Fields used: `uuid`, `displayName`, `points`, `lastActivityAt`. `email` is read server-side to filter participants (`@immersivelabs.pro`), then dropped before response.
- **Fresh accounts per event**: teams get new accounts at start, so `Account.points` is event-scoped by construction. We trust it directly — no activities/attempts walk, no `completedAt` filter. Fallback (attempts path) is documented in [implementation/aggregation.md](implementation/aggregation.md) but not implemented in v1.
- **No event-window in the API**: the OpenAPI spec has no `Event` entity with start/end timestamps. The event window is supplied out-of-band via `EVENT_START_AT` / `EVENT_END_AT` env vars. These drive **phase** (pre/live/ended) and **post-event freeze**, not scoring filters.
- **Pagination**: `{ page: [...], meta: { nextPageToken, hasNextPage } }`. Pass `?page_token=...`. Do not change page size mid-walk.
- **No leaderboard endpoint** — leaderboard is computed from `/v2/accounts` server-side.

## Architecture

```
[ public browser ]  --fetch-->  [ our proxy ]  --Bearer-->  [ ImmersiveLab API ]
     no token                    holds secret,
                                 caches token
```

### Endpoints exposed by the proxy
- `GET /api/leaderboard` — returns `{ teams: [{ uuid, displayName, points, lastActivityAt }], phase, eventWindow, updatedAt }`, sorted by points desc. Aggregation + sorting happens server-side.
- `GET /api/health` — proxy + token status + `eventWindow`.

### Proxy internals
- Single Node server (Express, aligned with prior project). Same process serves `dist/` (the Vite build output) as static assets. SPA fallback: unknown non-`/api` routes return `index.html`.
- Token cache in memory + `token.json` on named volume.
- Leaderboard cache in memory + `snapshot.json` on named volume (atomic tmp + rename). Loaded on boot → stale slot.
- On each `/api/leaderboard` request:
  1. If `phase === "ended"` → return last snapshot, skip rebuild.
  2. If fresh (< `SNAPSHOT_TTL_MS`) → return cached.
  3. Else ensure fresh token, walk `/v2/accounts` paginated.
  4. Sort teams desc by `points`. Tie-break: `lastActivityAt` asc, then `displayName` asc.
  5. Scrub PII: keep `displayName`, drop `email`.
  6. Persist snapshot + return.
- Single-flight: concurrent callers during rebuild share one promise.

### Frontend (React + Vite)
```
src/
  api/
    client.ts          // fetch('/api/leaderboard'), no auth
  hooks/
    useLeaderboard.ts  // polls every 30s, returns {teams, phase, eventWindow, updatedAt}
  components/
    Leaderboard.tsx    // ranked list of teams
    TeamRow.tsx        // single row (rank, name, points, last activity)
  App.tsx
  main.tsx
```

- **`client.ts`**: just `fetch('/api/leaderboard')` — no headers, no token logic. Throws on non-2xx.
- **`useLeaderboard`**: mount + every 30 s. `AbortController` on unmount. Pauses polling when `document.hidden`.
- **`Leaderboard.tsx`**: ranked list of 30 team rows. Renders phase-aware states (`"pre"` → "Event starts at …"; `"ended"` → "Final standings" banner + frozen list).

## Responsive UX (mobile, laptop, big screen)
The dashboard is public and will be viewed on phones, laptops, **and event-room TVs/projectors**. Design mobile-first, scale up, never horizontal-scroll.

**Breakpoints** (Tailwind-style, single source of truth):
- `sm` ≥ 640 px — phone landscape
- `md` ≥ 768 px — tablet
- `lg` ≥ 1024 px — laptop (default design target)
- `xl` ≥ 1280 px — desktop
- `2xl` ≥ 1536 px — big screen / TV (increase font sizes and row density, not content)

**Layout rules**:
- Use CSS Grid / Flexbox with `clamp()` for typography (e.g. `font-size: clamp(14px, 1.2vw, 22px)`). No fixed pixel widths on containers — use `max-width` + `margin: auto`.
- Leaderboard row collapses on narrow viewports: on `< sm`, hide `lastActivityAt`, keep rank / name / points. On `≥ md`, show all columns.
- Long display names truncate with `text-overflow: ellipsis` + tooltip on hover; never wrap to push layout.
- Rank badge + points are always visible — they are the primary information.
- Touch targets ≥ 44×44 px on mobile (WCAG 2.5.5).
- Respect `prefers-reduced-motion` for any row transitions / rank-change animations.
- Respect `prefers-color-scheme` or ship a single high-contrast dark theme suited to projected/TV display.

**Big-screen (TV) mode** (`2xl`+ or `?tv=1` query param):
- Bump base font size (~1.5–2×), show top N rows that fit the viewport, hide chrome (header nav, footer) so standings fill the screen.
- No hover-only interactions — TVs have no cursor.

**Verification additions**:
- Chrome DevTools device toolbar: iPhone SE (375 px), iPad (768 px), 1080p laptop, 4K TV (3840 px) — no horizontal scroll, all primary columns legible.
- Lighthouse mobile score ≥ 90 for Performance and Accessibility.

## CORS
Browser only talks to the proxy at same origin, so no ImmersiveLab-side CORS concern. Proxy → ImmersiveLab is server-to-server.

## Env (proxy side, never exposed)
- `IMMERSIVELAB_ACCESS_KEY`
- `IMMERSIVELAB_SECRET_TOKEN`
- `IMMERSIVELAB_BASE_URL` (default `https://api.immersivelabs.online`)
- `EVENT_START_AT` (ISO 8601, required — drives `phase = "pre"` + pre-event gate)
- `EVENT_END_AT` (ISO 8601, required — drives `phase = "ended"` + post-event freeze)
- `SNAPSHOT_TTL_MS` (default `10000`)
- `DATA_DIR` (default `/app/data` — holds `snapshot.json` + `token.json`)
- `PORT` (default `3000`)

## Files to create / modify
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `server/index.ts` — Express app, static serving, SPA fallback
- `server/immersiveLab.ts` — token cache + paginated `/v2/accounts` walker (port of prior `immersiveLabsClient.js`, minus activities/attempts)
- `server/auth.ts` — token exchange + refresh (port of prior `immersiveLabsAuth.js`)
- `server/aggregate.ts` — aggregation + 10 s snapshot cache + phase + freeze
- `server/snapshotStore.ts` — atomic load/save for `snapshot.json` + `token.json`
- `src/api/client.ts`, `src/hooks/useLeaderboard.ts`
- `src/components/{Leaderboard,TeamRow}.tsx`
- `src/App.tsx`, `src/main.tsx`
- `.env.example` with proxy vars
- `README.md` with deployment + runbook

## Verification
1. `npm run dev` starts Vite + proxy (concurrently or via Vite middleware).
2. `curl localhost:5173/api/health` → `{ ok: true, tokenExpiresIn: N }`.
3. `curl localhost:5173/api/leaderboard` → non-empty `teams[]`, sorted by points desc, `phase` matches clock vs event window.
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
