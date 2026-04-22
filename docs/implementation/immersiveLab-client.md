# ImmersiveLab Client

Server-side ImmersiveLab API wrapper. Holds secret, caches token, walks pages.

## File
- `server/immersiveLab.ts`.

## Token cache
- In-memory `{ accessToken, expiresAt }`.
- `getToken()`:
  - If cached and `now < expiresAt - 60s` → return.
  - Else `POST /v1/public/tokens` form-encoded `username=IMMERSIVELAB_ACCESS_KEY&password=IMMERSIVELAB_SECRET_TOKEN`.
  - Parse `accessToken` + `expiresIn`. Store.
- `invalidateToken()` on 401. Caller retries once.
- Optional: persist to `token.json` (prior-project pattern) so restarts don't always re-auth.

## HTTP helper
- `immersiveLabFetch(path, opts)` — adds `Authorization: Bearer <token>`, base `IMMERSIVELAB_BASE_URL`.
- Retry policy: one retry on 401 (refresh token), one retry on 429/5xx with backoff.
- Timeout 10 s per request.

## Paginated walkers
- `walkAccounts()` → `AsyncIterable<Account>`. Loops `GET /v2/accounts?page_token=...` until `meta.hasNextPage === false`. Do not change page size mid-walk.
- **Attempts path only:**
  - `walkActivities()` → `AsyncIterable<Activity>` over `/v2/activities`.
  - `walkAttempts()` → `AsyncIterable<Attempt>` over `/v2/attempts`.
- Not used: `/v2/teams`, `/v2/teams/{id}/memberships`, deprecated `Account.teams`.

## Types
- Narrow ImmersiveLab response shapes to only fields used:
  - `Account { uuid, displayName, email, points, lastActivityAt }`
  - `Activity { uuid, title }` (attempts path)
  - `Attempt { uuid, accountUuid, activityUuid, points, totalDuration, completedAt }` (attempts path)

## Steps
1. Implement `getToken` + unit test around expiry math.
2. Implement `immersiveLabFetch` with retry.
3. Implement `walkAccounts` with page cursor.
4. (Attempts path) `walkActivities` + `walkAttempts`.
5. Log token refresh events.

## Verification
- Force expiry → next call refreshes, no user error.
- 401 response → single refresh + retry, success.
- Pagination yields all accounts across >1 page.
