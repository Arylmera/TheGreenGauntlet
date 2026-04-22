# ImmersiveLab Client

Server-side ImmersiveLab API wrapper. Holds secret, caches token, walks pages.

## File
- `server/immersiveLab.ts`.

## Token cache
- In-memory `{ accessToken, expiresAt }`, persisted to `${DATA_DIR}/token.json` (atomic tmp + rename). Loaded on boot so restarts don't re-auth when the token is still valid.
- `getToken()`:
  - If cached and `now < expiresAt - TOKEN_REFRESH_MARGIN_S` → return.
  - Else `POST /v1/public/tokens` form-encoded `username=IMMERSIVELAB_ACCESS_KEY&password=IMMERSIVELAB_SECRET_TOKEN`.
  - Parse `accessToken` + `expiresIn`. Store in memory + persist.
- `invalidateToken()` on 401 → wipe memory + disk cache. Caller retries once.

## HTTP helper
- `immersiveLabFetch(path, opts)` — adds `Authorization: Bearer <token>`, base `IMMERSIVELAB_BASE_URL`.
- Retry policy: one retry on 401 (refresh token), one retry on 429/5xx with backoff.
- Timeout 10 s per request.

## Paginated walkers
- `walkAccounts()` → `AsyncIterable<Account>`. Loops `GET /v2/accounts?page_token=...` until `meta.hasNextPage === false`. Do not change page size mid-walk.
- Not used in v1: `/v2/activities`, `/v2/attempts`, `/v2/teams`, `/v2/teams/{id}/memberships`, deprecated `Account.teams`. See [dashboard-storage-plan.md](dashboard-storage-plan.md) §1 for why (fresh accounts make `Account.points` event-scoped).

## Types
- Narrow ImmersiveLab response shapes to only fields used:
  - `Account { uuid, displayName, email, points, lastActivityAt }` (`email` is read and dropped at the aggregation layer)

## Steps
1. Implement `getToken` + unit test around expiry math + disk persistence.
2. Implement `immersiveLabFetch` with retry.
3. Implement `walkAccounts` with page cursor.
4. Log token refresh events.

## Verification
- Force expiry → next call refreshes, no user error.
- 401 response → single refresh + retry, success.
- Pagination yields all accounts across >1 page.
- Restart with valid `token.json` on disk → no `POST /v1/public/tokens` call on first request.
