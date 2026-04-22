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
1. `walkAccounts()` → `accounts[]`. Treat `points: null` as 0.
2. `walkTeams()`:
   - If non-empty: for each team, `listMemberships()` → member account uuids.
   - If empty: skip team grouping. Payload `teams` is `[]`; accounts still returned via `/api/accounts` or a single synthetic "All accounts" bucket (decide at wire-up).
3. Aggregate (when teams present):
   - Per team: `total = Σ member.points`, `members = [{uuid, displayName, points, lastActivityAt}]`.
   - Sort teams by `total` desc, members by `points` desc.
4. Scrub: drop `email` and any field not listed in payload schema.

## Payload
```json
{
  "updatedAt": "ISO-8601",
  "teams": [
    { "uuid": "...", "name": "...", "total": 123,
      "members": [{ "uuid": "...", "displayName": "...", "points": 42, "lastActivityAt": "..." }] }
  ]
}
```

## Verification
- Two concurrent `/api/leaderboard` hits → one upstream rebuild (log once).
- Sum of `members[].points` equals `team.total`.
- Completing a lab → delta visible within 10 s cache + 30 s poll.
- IL outage mid-cache → stale response, health flag.
