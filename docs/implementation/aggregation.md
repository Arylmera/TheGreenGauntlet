# Aggregation

Build the `/api/leaderboard` payload. Runs server-side, shields ImmersiveLab schema from browser.

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
3. **Event-window filter:** drop any attempt where `completedAt < EVENT_START_AT` or `completedAt > EVENT_END_AT`. Attempts with null `completedAt` (not finished) are also dropped. Applied before best-attempt selection so an out-of-window high score cannot shadow an in-window valid one.
4. For each `(account, activity)` keep the **best** attempt only (highest score; on tie, earliest `completedAt`). Retries do not stack.
5. Per account: `total = Σ best.points`, `timeSpent = Σ best.totalDuration ?? 0` (use `??`, not `||`), `completedCount`, `lastActivityAt = max(best.completedAt)`.
6. Skip orphan attempts whose activity 404s — don't fail the batch.
7. Sort + scrub as above.

## Event phase
Computed once per snapshot from `now` vs env bounds:
- `now < EVENT_START_AT` → `phase = "pre"`. Return empty `accounts: []` with `phase` flag; UI shows "not started".
- `EVENT_START_AT <= now <= EVENT_END_AT` → `phase = "live"`. Normal aggregation.
- `now > EVENT_END_AT` → `phase = "ended"`. Aggregation still runs but the window filter naturally freezes results; UI shows "event over". Snapshot TTL may be extended post-event (optional).

## Payload
```json
{
  "updatedAt": "ISO-8601",
  "phase": "pre" | "live" | "ended",
  "eventWindow": { "startAt": "ISO-8601", "endAt": "ISO-8601" },
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
- Attempt completed **before** `EVENT_START_AT` → excluded from totals.
- Attempt completed **after** `EVENT_END_AT` → excluded from totals. Leaderboard frozen at `EVENT_END_AT`.
- Set `EVENT_START_AT` in the future → `/api/leaderboard` returns `phase: "pre"`, empty `accounts`.
- ImmersiveLab outage mid-cache → stale response, health flag.
