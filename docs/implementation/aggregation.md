# Aggregation

Build the `/api/leaderboard` payload. Runs server-side, shields IL schema from browser.

## File
- `server/aggregate.ts` (called from `server/index.ts`).

## Snapshot cache
- In-memory `{ payload, builtAt }`.
- TTL ~10 s (`SNAPSHOT_TTL_MS`).
- On request:
  - If fresh → return cached.
  - Else rebuild, update `builtAt`.
  - On rebuild failure → serve stale if present, else 503.
- Single-flight: concurrent callers share one rebuild promise.

## Build steps
**Minimal path (trust `Account.points`):**
1. `walkAccounts()` → `accounts[]`. Treat `points: null` as 0.
2. Sort desc by `points`. Tie-break: `lastActivityAt` asc (earlier-finisher wins), then `displayName`.
3. Scrub: drop `email` and any field not listed in payload schema.

**Attempts path (optional, richer):**
1. `walkAccounts()` → base list.
2. `walkActivities()` + `walkAttempts()` → attempts grouped by `(accountUuid, activityUuid)`.
3. For each `(account, activity)` keep the **best** attempt only (highest score; on tie, earliest `completedAt`). Retries do not stack.
4. Per account: `total = Σ best.points`, `timeSpent = Σ best.totalDuration ?? 0` (use `??`, not `||`), `completedCount`.
5. Skip orphan attempts whose activity 404s — don't fail the batch.
6. Sort + scrub as above.

## Payload
```json
{
  "updatedAt": "ISO-8601",
  "accounts": [
    {
      "uuid": "...",
      "displayName": "...",
      "points": 123,
      "lastActivityAt": "...",
      "timeSpent": 3600,
      "completedCount": 7
    }
  ]
}
```
`timeSpent` and `completedCount` present only on the attempts path.

## Verification
- Two concurrent `/api/leaderboard` hits → one upstream rebuild (log once).
- Ranked order stable across consecutive polls when underlying data unchanged.
- Completing a lab → delta visible within 10 s cache + 30 s poll.
- Retrying an already-completed lab with a lower score → total **unchanged** (best-attempt rule).
- IL outage mid-cache → stale response, health flag.
