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
1. `walkAccounts()` → `accounts[]`. Treat `points: null` as 0. Email-based filter (`@immersivelabs.pro`) is applied inside the client walker; see [immersiveLab-client.md](immersiveLab-client.md).
2. **Team-bonus seeding + merge** (see [admin-bonus-plan.md](admin-bonus-plan.md)):
   - `INSERT OR IGNORE` one row per walked team into `team_bonus (team_id, team_name, mario_points=0, crokinole_points=0, helping_points=0, active=1)`. Guarantees bonus rows exist as soon as a team is seen, independent of the admin UI.
   - LEFT JOIN each team to `team_bonus`. Three fixed categories:
     - `mario_points`, `crokinole_points` — shown as their own columns on the public leaderboard.
     - `helping_points` — merged into the IL column (hidden as a separate line from spectators).
   - Merge formula:
     ```
     il_out = Account.points + helping_points
     total  = il_out + mario_points + crokinole_points
     ```
   - Drop teams where `team_bonus.active = 0` (hidden/DQ) — they are not rendered, not ranked.
3. Sort desc by `total`. Tie-break: `lastActivityAt` asc (earlier finisher wins), then `displayName` asc.
4. Scrub: drop any field not listed in the payload schema (email is already not yielded by the walker).
5. Relabel for payload: `accounts` → `teams` (1 IL account per team; see [dashboard-storage-plan.md](dashboard-storage-plan.md) §4). Public payload emits `il_points` (= merged `il_out`), `mario_points`, `crokinole_points`, `total`. The raw IL (pre-merge) and `helping_points` stay server-side — they are only surfaced to the admin (`GET /api/admin/bonus`) and in the CSV export, where they are named `immersivelab_points` and `helping_points` respectively.

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
      "rank": 1,
      "uuid": "...",
      "displayName": "...",
      "il_points": 1250,
      "mario_points": 80,
      "crokinole_points": 40,
      "total": 1370,
      "lastActivityAt": "..."
    }
  ]
}
```

`il_points` is already merged with helping (`Account.points + helping_points`). Inactive teams (`team_bonus.active = 0`) are excluded from `teams[]`. `timeSpent` / `completedCount` are **not** emitted (they were attempts-path fields). Helping and the raw IL value are admin-only — see [admin-bonus-plan.md](admin-bonus-plan.md) `GET /api/admin/bonus`.

## Cache invalidation + SSE
Admin bonus writes (category-tagged batch commit, active toggle) invalidate the in-memory snapshot and emit a `leaderboard-updated` event on `GET /api/leaderboard/stream` (SSE). Public clients refetch `/api/leaderboard` on event, so bonus changes propagate within ~100 ms instead of waiting for the 30 s client poll. See [admin-bonus-plan.md](admin-bonus-plan.md) Decision log C.

## Verification
- Two concurrent `/api/leaderboard` hits → one upstream rebuild (log once).
- Ranked order stable across consecutive polls when underlying data unchanged.
- A team completing a lab → delta visible within 10 s cache + 30 s poll.
- **Pre-event gate**: `EVENT_START_AT` in future, inject nonzero `Account.points` → payload has `phase: "pre"`, `teams: []`.
- **Post-event freeze**: cross `EVENT_END_AT` while a team keeps playing → its points continue to rise in the upstream API, but the leaderboard stays pinned to the last pre-end snapshot (`phase: "ended"`, no rebuild log entries).
- Tie-break: equal `total` → earlier `lastActivityAt` wins; equal `lastActivityAt` → `displayName` asc.
- Admin batch commit → public client receives SSE push and refetches within ~100 ms; leaderboard reflects new `total` without waiting for the 30 s poll.
- Toggle team to inactive → team disappears from `/api/leaderboard` on next rebuild; ranks of remaining teams recompute.
- ImmersiveLab outage mid-cache → stale response, health flag.
