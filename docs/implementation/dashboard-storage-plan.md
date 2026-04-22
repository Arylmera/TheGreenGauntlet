# Dashboard Storage & Event Plan

> Planning doc — **not yet executed**. Captures decisions for the 30-team, 8-hour live event.

## Context
Live event: 30 teams compete for 8 hours; any team member can open the leaderboard at any time. Data source is the Immersive Labs API (OAuth2). Repo is docs-only — no code yet. Confirmed scope:

1. **1 Immersive Labs account per team.** Team *is* the account — no net-new grouping layer, no team-to-account mapping file. Relabel "account" → "team" in UI only.
2. **Accounts are fresh.** Credentials are handed to teams at event start. Each account has zero lifetime points at `EVENT_START_AT`.
3. **Per-team leaderboard only** — 30 rows, ranked by points. No drill-down.
4. **Persist snapshot to disk** — restart must serve stale data instantly. Revises [V1V2Scope.md](../V1V2Scope.md) on the "no persistence" stance in a targeted way.

Consequence of (2): `Account.points` is lifetime cumulative in the API, but lifetime = event for fresh accounts. The attempts path (walking `/v2/attempts` + filtering by `completedAt`) becomes unnecessary for scoring. This kills a major source of complexity, upstream API calls, and pagination work.

## Approach

### 1. Minimal path: trust `Account.points`
Use the minimal-path aggregation only (see revised [aggregation.md](aggregation.md)):

1. `walkAccounts()` → `accounts[]` (treat `points: null` as 0).
2. Sort desc by `points`. Tie-break: `lastActivityAt` asc, then `displayName`.
3. Scrub fields not in the payload schema (drop `email` etc.).

No `/v2/activities` walk, no `/v2/attempts` walk, no `completedAt` filtering, no best-attempt dedup. Retries naturally shadow because `Account.points` reflects the account's current state.

**Operational rule (out-of-band):** teams must not use their credentials before `EVENT_START_AT` or after `EVENT_END_AT`. The server enforces the latter with a freeze (see §3); the former is enforced by simply not handing out creds early.

### 2. Durable snapshot + token persistence
Two small JSON files on a Docker named volume:

- `/app/data/snapshot.json` — last successful leaderboard payload. Written after each successful rebuild (atomic: write tmp + rename). Loaded on boot as the initial `stale` value so `/api/leaderboard` serves instantly while the first fresh rebuild runs in background.
- `/app/data/token.json` — OAuth token cache (already planned optional in [immersiveLab-client.md](immersiveLab-client.md); make it mandatory here).

**JSON over SQLite**: single row, no queries, no history requirement, simpler deploy. Swap in SQLite later without touching the API contract if audit/history becomes a need.

### 3. Volume + restart + post-event freeze
`docker-compose.yml` mounts a named volume `greengauntlet-data:/app/data`. Survives container recreate, reboot, image updates.

On boot:
1. Load `snapshot.json` → stale slot.
2. Load `token.json` → token cache.
3. Serve `/api/leaderboard` from stale immediately; kick rebuild asynchronously.

**Post-event freeze** (`now > EVENT_END_AT`): stop rebuilding. Keep serving the last snapshot indefinitely, with `phase: "ended"`. Without this, teams that keep playing after the end would continue to move up via `Account.points`. This replaces the prior attempts-path freeze (which filtered `completedAt > EVENT_END_AT`).

Atomic write (tmp + rename) means a kill mid-write leaves the previous snapshot intact.

### 4. UI relabel
Rename column and row entity from "Account" → "Team". Server payload key: rename `accounts[]` → `teams[]` for clarity (net-new code, no compat concern). Display name = `Account.displayName`, which is what the team registers with.

### 5. Role of `EVENT_START_AT` / `EVENT_END_AT` (reduced but retained)
No longer used for attempt filtering. Still used for:

- **Phase flag in payload + `/api/health`** (`pre` / `live` / `ended`) — drives UI state (placeholder before start, freeze banner after end).
- **Pre-event gate**: `now < EVENT_START_AT` → `/api/leaderboard` returns `phase: "pre"`, empty `teams: []`. Even if creds leak early and teams rack up points, the dashboard hides them until start.
- **Post-event freeze trigger** (see §3).
- **Frontend copy**: "Event starts at …" / "Event ended …" banners in [frontend.md](frontend.md).

So the env vars stay required, just with a narrower job: **phase + freeze**, not aggregation filtering.

### 6. Rate-limit sanity check
30 teams × many refreshers, 30s client poll, 10s server cache → upstream IL calls now reduced further (only `walkAccounts`, no activities/attempts): roughly one paginated account walk every 10s. Confirm IL's published rate limit ([../TODO.md](../../TODO.md) blocker: `[ImmersiveLab admin]`) before demo day.

## Files to create/modify

**New code (first implementation — nothing exists yet):**
- `server/index.ts` — Express app, static SPA serve, `/api/*` routes.
- `server/aggregate.ts` — minimal-path aggregation per revised [aggregation.md](aggregation.md).
- `server/immersiveLabClient.ts` — OAuth + `walkAccounts` only (skip activities/attempts walkers for v1).
- `server/snapshotStore.ts` — **new module.** Load/save `snapshot.json` + `token.json` atomically.
- `src/hooks/useLeaderboard.ts` — 30s polling hook per [frontend.md](frontend.md).
- `src/components/Leaderboard.tsx` — 30-row table, "Team" label.
- `Dockerfile`, `docker-compose.yml` — multi-stage per [deployment.md](deployment.md) + named volume.

**Docs to amend in the same PR that implements this:**
- [../V1V2Scope.md](../V1V2Scope.md) — points model: "best-attempt filtered by event window" → "`Account.points` trusted; accounts are fresh per event". Scope delta simplifies.
- [../project.md](../project.md) — remove the caveat about `Account.points` being unusable; replace with "accounts are fresh, so lifetime = event".
- [../data-flow.md](../data-flow.md) — drop attempts path description; keep phase semantics.
- [env-config.md](env-config.md) — revise descriptions of `EVENT_START_AT` / `EVENT_END_AT` to "phase + freeze" not "attempt filter".
- [deployment.md](deployment.md) — add volume mount + boot-load behavior + post-event freeze.
- [../dashboard-plan.md](../dashboard-plan.md) — drop attempts-path branch, UI "Team" labelling.
- [../../TODO.md](../../TODO.md) — resolve "Account.points semantics" open question; remove attempts-path follow-ups.
- [../../README.md](../../README.md) — "attempts filtered by `completedAt`" line is now wrong.
- [server-proxy.md](server-proxy.md) — payload shape (`accounts` → `teams`); confirm `eventWindow` still in `/api/health`.
- [../../.github/pull_request_template.md](../../.github/pull_request_template.md) — "event-window scoping" checkbox is still valid (phase behavior).

## Env vars
Existing in [env-config.md](env-config.md): `IMMERSIVELAB_ACCESS_KEY`, `IMMERSIVELAB_SECRET_TOKEN`, `EVENT_START_AT`, `EVENT_END_AT`, `SNAPSHOT_TTL_MS` (keep 10000), `TOKEN_REFRESH_MARGIN_S` (60).

**New:** `DATA_DIR=/app/data`.

Semantics change for `EVENT_*` vars (§5): phase + freeze, not aggregation filter. Validation stays the same (valid ISO 8601, `start < end`, fail-fast at boot).

## Verification
1. **Boot with empty volume** → `/api/leaderboard` returns correct `phase`; after first rebuild, `snapshot.json` exists on disk.
2. **Kill container mid-event, restart** → `/api/leaderboard` serves stale within 1s of boot; fresh rebuild completes within 10s; `token.json` survives (no re-auth log on boot).
3. **Pre-event gate** — set `EVENT_START_AT` in the future, seed an account with nonzero `points` → `/api/leaderboard` returns `phase: "pre"`, `teams: []`.
4. **Post-event freeze** — cross `EVENT_END_AT` while teams still rack up points → last pre-end snapshot keeps serving; `phase: "ended"`; no upstream rebuild calls in logs.
5. **Concurrent load** — 30 simultaneous `/api/leaderboard` hits trigger exactly one upstream rebuild (single-flight log).
6. **Tie-break** — two teams same points → earlier `lastActivityAt` wins; same `lastActivityAt` → `displayName` asc.
7. **Rate-limit dry run** — pre-event, run 8h with synthetic traffic (10 viewers per team) and log upstream call count; validate against IL's published limit.

## Blockers before code can ship
- IL credentials (`[ImmersiveLab admin]`).
- Confirmed event window (`[event owner]`).
- IL rate-limit confirmation (for verification step 7).
- Hosting target decision (Fly/Render/Railway/VM) — determines volume driver syntax.
- Confirm accounts can be created fresh for the event and zeroed at `EVENT_START_AT` — this whole plan rests on that assumption.
