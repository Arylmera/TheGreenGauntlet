# IL Client

Server-side IL API wrapper. Holds secret, caches token, walks pages.

## File
- `server/il.ts`.

## Token cache
- In-memory `{ accessToken, expiresAt }`.
- `getToken()`:
  - If cached and `now < expiresAt - 60s` → return.
  - Else `POST /v1/public/tokens` form-encoded `username=IL_ACCESS_KEY&password=IL_SECRET_TOKEN`.
  - Parse `accessToken` + `expiresIn`. Store.
- `invalidateToken()` on 401. Caller retries once.

## HTTP helper
- `ilFetch(path, opts)` — adds `Authorization: Bearer <token>`, base `IL_BASE_URL`.
- Retry policy: one retry on 401 (refresh token), one retry on 429/5xx with backoff.
- Timeout 10 s per request.

## Paginated walkers
- `walkAccounts()` → `AsyncIterable<Account>`. Loops `GET /v2/accounts?page_token=...` until `meta.hasNextPage === false`. Do not change page size mid-walk.
- `walkTeams()` → `AsyncIterable<Team>` over `/v2/teams`.
- `listMemberships(teamId)` → walks `/v2/teams/{team_id}/memberships`.

## Types
- Narrow IL response shapes to only fields used: `Account { uuid, displayName, email, points, lastActivityAt }`, `Team { uuid, name }`, `Membership { accountUuid, teamUuid }`.

## Steps
1. Implement `getToken` + unit test around expiry math.
2. Implement `ilFetch` with retry.
3. Implement `walkAccounts` with page cursor.
4. Implement `walkTeams` + `listMemberships`.
5. Log token refresh events.

## Verification
- Force expiry → next call refreshes, no user error.
- 401 response → single refresh + retry, success.
- Pagination yields all accounts across >1 page.
