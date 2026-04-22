# Plan: Fetch Account Points for Team Competition Dashboard

## Context
Event where pre-created Immersive Labs accounts compete as teams. Dashboard must display per-account and per-team point totals, refreshed live as participants earn points. Repo currently holds only docs and the OpenAPI spec. Stack chosen: **React + Vite**, calling the Immersive Labs API directly from the browser, refresh every **30 s**, no DB for now.

## ⚠️ Security note — must resolve before go-live
`POST /v1/public/tokens` requires the API **secret token**. If the Vite app calls `/v1/public/tokens` directly from the browser, the secret ships in the JS bundle and anyone who opens the event page can exfiltrate full API access to the org.

Two acceptable ways forward; pick one before implementation:

1. **Short-lived token pasted at event start.** Generate a token manually (curl), paste into the dashboard UI (localStorage / URL fragment). Token expires in 30 min, so refresh it by hand a few times during the event, OR generate a single longer-lived token if IL supports it for this key. Keeps "pure frontend" but needs a human in the loop.
2. **Tiny proxy** (Vite dev server middleware or a ~30-line Node function) that holds the secret, exchanges for a token, forwards `/v2/*` calls with the Bearer header. Still one deploy, still fetches from the browser to `/api/*` — just not directly to `api.immersivelabs.online`.

Plan below works for **either**; the frontend code is the same. Default assumption: option 1 (manual token paste).

## Relevant API facts (from `docs/immersivelab-api.json`)
- **Base URL**: `https://api.immersivelabs.online` (confirm region for the event tenant).
- **Auth**: `POST /v1/public/tokens` form-encoded `username={access_key}&password={secret_token}` → `accessToken` valid ~30 min.
- **Accounts**: `GET /v2/accounts` (scope `account:read`). `Account.points: integer | null`. Fields used: `uuid`, `displayName`, `email`, `points`, `lastActivityAt`.
- **Pagination**: response `{ page: [...], meta: { nextPageToken, hasNextPage } }`. Pass token as `?page_token=...`. Do not change page size mid-walk.
- **Teams**: `GET /v2/teams` + `GET /v2/teams/{team_id}/memberships`. Reverse lookup: `GET /v2/accounts/{id}/teams`.
- **No leaderboard endpoint** — totals per team computed client-side by summing `Account.points`.
- `Account.teams` field is marked deprecated; don't rely on it.

## Team model
Not yet confirmed whether teams exist in the platform. Plan for both:
- **Primary path**: pull `/v2/teams` + memberships. If non-empty, use them.
- **Fallback**: a local `teams.json` (`{ teamName: [accountEmail, ...] }`) served as a static asset. Loader picks local mapping when the API returns zero teams. Decide which is live at event start.

## Implementation (React + Vite)

### Layout
```
src/
  api/
    client.ts         // fetch wrapper + token handling
    accounts.ts       // listAllAccounts()
    teams.ts          // listAllTeams(), listMemberships(teamId)
    paginate.ts       // generic page_token loop
  hooks/
    useLeaderboard.ts // polls every 30s, aggregates, returns {teams, accounts, updatedAt}
  components/
    Leaderboard.tsx   // team standings
    AccountList.tsx   // per-account detail / drill-down
    TokenGate.tsx     // prompts for bearer token on first load; stores in sessionStorage
  App.tsx
  main.tsx
public/
  teams.json          // optional local team mapping (fallback)
```

### Key pieces
- **`client.ts`**: `fetchIL(path, params)` reads `sessionStorage.il_token`, adds `Authorization: Bearer <token>`, throws a typed `UnauthorizedError` on 401 so `TokenGate` can re-prompt. Base URL from `import.meta.env.VITE_IL_BASE_URL` (default `https://api.immersivelabs.online`).
- **`paginate.ts`**: async generator that yields pages until `meta.nextPageToken` is null. Used by both accounts and teams.
- **`accounts.ts::listAllAccounts()`**: walks `/v2/accounts`, returns `Account[]`. Treat `points: null` as `0`.
- **`teams.ts`**: `listAllTeams()` + `listMemberships(teamId)`; build `Map<accountUuid, teamUuid>` (or `teamUuid[]` if multi-team).
- **`useLeaderboard`**: on mount and every 30 s, runs accounts fetch + teams fetch in parallel, aggregates `{teamUuid → {name, totalPoints, memberCount, members: Account[]}}`, sorts desc, returns snapshot + `isLoading` + `error`. Uses `AbortController` to cancel in-flight on unmount. Pauses polling when `document.hidden`.
- **`TokenGate.tsx`**: if no token in `sessionStorage`, show a small form ("Paste Immersive Labs access token"). Saves to `sessionStorage`. Also triggered on `UnauthorizedError`.
- **`Leaderboard.tsx`**: ranked list of teams with total, member count. `AccountList.tsx` expands a team to show its members' points.

### CORS
The Immersive Labs API must allow `Origin` of wherever the dashboard is hosted. If it doesn't, direct browser calls won't work and the proxy (option 2 above) becomes mandatory. **Verify early** with a quick `fetch` from `localhost:5173`.

### Env
- `VITE_IL_BASE_URL` — default `https://api.immersivelabs.online`.
- No secret in `.env` for the direct-call path; token is pasted at runtime.

## Files to create / modify
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `src/api/{client,accounts,teams,paginate}.ts`
- `src/hooks/useLeaderboard.ts`
- `src/components/{Leaderboard,AccountList,TokenGate}.tsx`
- `src/App.tsx`, `src/main.tsx`
- `public/teams.json` (empty/example for fallback)
- `.env.example` with `VITE_IL_BASE_URL`
- `README.md` with event-day runbook (how to generate/paste token)

## Verification
1. `npm create vite@latest`, install, `npm run dev`. TokenGate appears.
2. Generate a token manually: `curl -X POST -d 'username=...&password=...' https://api.immersivelabs.online/v1/public/tokens`. Paste into gate.
3. **CORS check**: network tab shows `/v2/accounts` returning 200. If blocked by CORS, stop and switch to proxy variant.
4. Dashboard renders a leaderboard with non-zero points for accounts that have activity.
5. Complete one lab on a test account → within 30 s the dashboard reflects the new total and the team total moves by the same delta.
6. Wait 30 min → next poll returns 401 → TokenGate re-prompts cleanly, no white screen.
7. Load on a second browser tab/device → both show the same totals within one poll cycle.

## Open items to confirm before coding
- CORS works from the browser for this IL tenant (otherwise: add a proxy).
- Region-specific base URL is `.online` (not `.us.` / EU variant).
- Whether to also build the small proxy preemptively as a safety net (recommended if CORS status is unknown).
