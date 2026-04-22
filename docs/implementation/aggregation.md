# Aggregation

Build the `/api/leaderboard` payload. Runs server-side, shields ImmersiveLab schema from browser.

## Scoring model
Teams receive fresh Immersive Labs accounts at `EVENT_START_AT`. Every account has zero lifetime points at the start of the event, so `Account.points` equals event-scoped points by construction. We trust it directly — no attempts walk, no `completedAt` filter, no best-attempt dedup.

If this assumption ever breaks (accounts reused across events, or lifetime points prefilled by the provider), switch to the attempts path. That path is out of scope for v1 and is not implemented.

See [dashboard-storage-plan.md](dashboard-storage-plan.md) §1 for why.

## File
- `server/aggregate.ts` (called from `server/index.ts`).

## Snapshot cache
- In-memory `{ payload, builtAt }`, persisted to `/app/data/snapshot.json` on every successful rebuild (atomic tmp + rename). Loaded from disk on boot.
- TTL ~10 s (`SNAPSHOT_TTL_MS`).
- On request:
  - If `phase === "ended"` → return last snapshot, skip rebuild (freeze).
  - Else if fresh → return cached.
  - Else rebuild, update `builtAt`, persist.
  - On rebuild failure → serve stale if present, else 503.
- Single-flight: concurrent callers share one rebuild promise.

## Build steps
1. `walkAccounts()` → `accounts[]`. Treat `points: null` as 0.
2. Sort desc by `points`. Tie-break: `lastActivityAt` asc (earlier finisher wins), then `displayName` asc.
3. Scrub: drop `email` and any field not listed in the payload schema.
4. Relabel for payload: `accounts` → `teams` (1 IL account per team; see [dashboard-storage-plan.md](dashboard-storage-plan.md) §4).

No activity walk. No attempts walk. Retries naturally shadow because `Account.points` reflects current state.

## Event phase
Computed once per snapshot from `now` vs env bounds. Phase drives UI state and the freeze behavior in §Snapshot cache; it no longer filters score contributions (accounts are fresh → all points are in-window by construction).

- `now < EVENT_START_AT` → `phase = "pre"`. Return empty `teams: []` with `phase` flag; UI shows "not started". Protects against cred leaks that might let a team earn points before the official start.
- `EVENT_START_AT <= now <= EVENT_END_AT` → `phase = "live"`. Normal aggregation.
- `now > EVENT_END_AT` → `phase = "ended"`. **Freeze**: serve the last snapshot built before `EVENT_END_AT`; skip further rebuilds. Prevents teams that keep playing after the end from continuing to move up the board.

## Payload
```json
{
  "updatedAt": "ISO-8601",
  "phase": "pre" | "live" | "ended",
  "eventWindow": { "startAt": "ISO-8601", "endAt": "ISO-8601" },
  "teams": [
    {
      "uuid": "...",
      "displayName": "...",
      "points": 123,
      "lastActivityAt": "..."
    }
  ]
}
```

`timeSpent` / `completedCount` are **not** emitted (they were attempts-path fields).

## Verification
- Two concurrent `/api/leaderboard` hits → one upstream rebuild (log once).
- Ranked order stable across consecutive polls when underlying data unchanged.
- A team completing a lab → delta visible within 10 s cache + 30 s poll.
- **Pre-event gate**: `EVENT_START_AT` in future, inject nonzero `Account.points` → payload has `phase: "pre"`, `teams: []`.
- **Post-event freeze**: cross `EVENT_END_AT` while a team keeps playing → its points continue to rise in the upstream API, but the leaderboard stays pinned to the last pre-end snapshot (`phase: "ended"`, no rebuild log entries).
- Tie-break: equal points → earlier `lastActivityAt` wins; equal `lastActivityAt` → `displayName` asc.
- ImmersiveLab outage mid-cache → stale response, health flag.
