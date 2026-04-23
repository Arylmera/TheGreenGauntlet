# Admin Bonus Points Plan

On-site (offline) challenges during the event award points that the Immersive Labs API cannot know about. An authenticated admin page lets organisers add/edit per-team bonus points during the day; these are merged into the leaderboard total alongside `Account.points`.

Status: **approved — open decisions resolved (see Discussion section), ready to build.**

## Goals

- Award and edit bonus points per team from a simple admin UI during the 8-hour event.
- Persist bonuses across container restarts.
- Keep IL data untouched — bonuses live in a **separate** SQLite file.
- Keep an audit trail of every change (who, when, delta, reason).
- Single shared admin credential — no user management for a one-day event.

## Non-goals (v1)

- Per-admin user accounts / roles.
- Negative leaderboard rankings, per-challenge breakdowns, public bonus log.
- Retroactive editing of IL points (bonuses are additive only).

## Data model

Separate SQLite file `data/bonus.sqlite` on the same named Docker volume as `snapshot.json` / `token.json`. Isolated from any future IL mirror DB to keep concerns separate and make backup/restore trivial.

```sql
-- Current bonus total per team (editable).
CREATE TABLE team_bonus (
  team_id     TEXT PRIMARY KEY,
  team_name   TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden from public leaderboard
  updated_at  TEXT NOT NULL,       -- ISO-8601 UTC
  updated_by  TEXT                  -- admin identifier (e.g. "admin")
);

```

Rationale: one editable row per team keeps the merge trivial (single JOIN). No history table in v1 — the live `team_bonus` state is the only record, plus server logs for admin writes.

## Team sync

On every aggregator run, the proxy upserts one row per IL team into `team_bonus` (`INSERT OR IGNORE`), seeded with `points = 0`. Teams come from the IL team list already fetched during aggregation — no extra API call. This guarantees all 30 teams show up even before anyone opens the admin page, and new teams added mid-event appear on the next tick.

If a team is renamed in IL, the next sync updates `team_name`.

## Leaderboard merge

`aggregation.md` currently returns `{ team_id, team_name, points }` from `Account.points`. Extend the aggregator to LEFT JOIN `team_bonus`:

```
total = il_points + COALESCE(team_bonus.points, 0)
```

The API response for `/api/leaderboard` gains two fields:

```json
{
  "team_id": "…",
  "team_name": "…",
  "il_points": 1200,
  "bonus_points": 150,
  "total": 1350
}
```

Ranking uses `total`. Tie-break rule stays unchanged (see [aggregation.md](aggregation.md)).

The snapshot cache key/shape needs bumping so stale snapshots don't serve old totals — invalidate on bonus write.

## Auth

Single shared credential, env-configured:

- `ADMIN_PASSWORD` — required in prod, server refuses to start without it.
- `ADMIN_SESSION_SECRET` — HMAC key for signed session cookies.

Flow:

1. `POST /api/admin/login` with `{ password }`. Compare with `crypto.timingSafeEqual` against `ADMIN_PASSWORD`. On success, set signed httpOnly cookie `gg_admin` (SameSite=Strict, Secure, 48 h TTL).
2. All `/api/admin/*` routes require a valid cookie; otherwise 401.
3. `POST /api/admin/logout` clears the cookie.
4. Rate-limit login to e.g. 5 attempts / 15 min per IP (reuse the existing rate-limit middleware from [server-proxy.md](server-proxy.md)).

No CSRF token needed if we restrict to SameSite=Strict **and** require `Content-Type: application/json` on mutating routes (fetch-only, no form posts). Revisit if we ever embed the admin UI in a different origin.

See [../guidelines/SECURITY.md](../guidelines/SECURITY.md) for cookie flags and secret handling.

## Endpoints

All under `/api/admin/*`, JSON in/out, cookie-auth.

| Method | Path                              | Purpose                                              |
| ------ | --------------------------------- | ---------------------------------------------------- |
| POST   | `/api/admin/login`                | `{ password }` → sets cookie                         |
| POST   | `/api/admin/logout`               | clears cookie                                        |
| GET    | `/api/admin/bonus`                | list all teams with `il_points`, `bonus_points`, `total`, `updated_at` |
| POST   | `/api/admin/bonus/batch`          | `{ updates: [{ teamId, delta }, ...] }` — batch apply multiple signed deltas in a single transaction. Rejects the whole batch if any resulting total would be < 0. Single cache invalidation at the end. |
| PATCH  | `/api/admin/bonus/:teamId/active` | `{ active: boolean }` — show/hide team on public leaderboard. Invalidates cache + emits SSE. |
| GET    | `/api/admin/export.csv`           | final standings CSV (see Q5 decision)                |

Batch commit endpoint:

1. For each `{ teamId, delta }` in the payload, read current `points`, compute new total.
2. Reject the whole batch if any resulting total would be < 0.
3. UPDATE all `team_bonus` rows in a single transaction.
4. Invalidate leaderboard snapshot cache and emit SSE `leaderboard-updated`.
5. Return updated rows.

## Admin UI

New React route `/admin`:

- **Unauthenticated** → centred login card, password field, error message on 401.
- **Authenticated** → table:

| Team      | Active | IL points | Bonus total | Delta input | Total |
| --------- | ------ | --------- | ----------- | ----------- | ----- |
| Team Oak  | [x]    | 1200      | 150         | [    ]      | 1350  |

Behaviour:

- Delta input per row, but **one shared "Apply" button** at the top of the table commits all pending deltas at once via `POST /api/admin/bonus/batch`. Positive adds, negative subtracts. No per-row submit, no quick `+5 / +10 / −10` buttons.
- Admin fills deltas for any subset of teams, reviews, then clicks Apply. Single transaction — if any row would go negative, the whole batch is rejected and nothing is written.
- On success, the admin UI refetches `/api/admin/bonus` to show new totals; inputs clear. Public leaderboard receives an SSE push (see Discussion C) and refetches within ~100 ms — no 30 s wait.
- Auto-refresh every 15 s (shorter than public 30 s polling) so multiple admins stay in sync.
- Show a banner if another admin modified a row since last load.

Styling follows [../guidelines/STYLING.md](../guidelines/STYLING.md); components in TS per [../guidelines/TYPESCRIPT.md](../guidelines/TYPESCRIPT.md); testing per [../guidelines/TESTING.md](../guidelines/TESTING.md) — unit-test the SQLite layer + supertest the endpoints end-to-end.

## Persistence & deployment

- Docker volume mount already holds `snapshot.json` + `token.json`; add `bonus.sqlite` next to them.
- Use `better-sqlite3` (sync, zero-config, already a common choice for Node single-process apps) — one module wrapping all queries.
- Run `PRAGMA journal_mode=WAL` on open for safer concurrent reads while admin writes.
- Backup: since it's one file, a simple `cp bonus.sqlite bonus.sqlite.bak` cron inside the container is enough for event day. Not needed for v1.

Update [deployment.md](deployment.md) to document the new file path and env vars.

## Env vars (additions)

```
ADMIN_PASSWORD=...                 # required; server fails to start without it
ADMIN_SESSION_SECRET=...           # required; 32+ bytes random
BONUS_DB_PATH=/data/bonus.sqlite   # default; override for tests
```

Add to `.env.example` and document in [env-config.md](env-config.md).

## Open questions

1. ~~**Undo UX**~~ — **Decided:** no undo button. An editable bonus field per team is enough for v1; corrections are manual re-entry. History drawer remains for audit.
2. ~~**Bonus visibility on public leaderboard**~~ — **Decided:** public leaderboard shows three columns — `il_points`, `bonus_points`, `total`. Ranking is by `total` only; the other two are informational.
3. ~~**Multiple admins simultaneously**~~ — **Decided:** last-write-wins. No `If-Match` / optimistic locking. History trail covers disputes.
4. ~~**Negative deltas**~~ — **Decided:** the bonus field is a **delta input**, not an absolute set. Typing `10` adds 10; typing `-10` subtracts 10. Resulting total is bounded ≥ 0 (subtractions that would go negative are rejected).
5. ~~**Export**~~ — **Decided:** yes. Add `GET /api/admin/export.csv` returning final standings with `team_id, team_name, il_points, bonus_points, total, rank`. Admin-auth required.

## Discussion — additional points to resolve

Items surfaced during review, beyond the original open questions. Each needs a decision before build.

### A. Rate-limit scope on `/api/admin/login`

Draft reuses the existing per-IP limiter (5 attempts / 15 min). At a physical event, multiple organisers share the venue NAT — one fat-fingered password locks everyone out.

**Decided:** global limiter, since there is a single shared credential anyway. Target: 20 attempts / 5 min across all IPs, and log every failed attempt to the server log for post-event review.

### B. Session TTL vs event length

Cookie TTL = 8 h = event length. If an organiser logs in at setup (T-2h), their cookie expires two hours before the end. No refresh mechanism in draft.

**Decided:** 48 h fixed TTL. Covers setup, event, teardown without any coupling to event dates. Organisers can always re-log-in if needed.

### C. Snapshot invalidation vs client polling

Draft invalidates the aggregator cache on bonus write. Public clients poll every 30 s, which leaves stale totals visible for up to one interval.

**Decided:** public dashboard must update instantly after an admin commit. Implementation: expose an SSE endpoint `GET /api/leaderboard/stream` that emits a `leaderboard-updated` event whenever the aggregator cache is invalidated (bonus batch commit **or** IL snapshot refresh). Public clients keep the 30 s poll as a fallback, but also subscribe to the SSE stream and refetch `/api/leaderboard` immediately on event. Admin batch commit therefore triggers: transaction → cache bust → SSE emit → all connected clients refetch within ~100 ms.

### D. Team seeding trigger

Draft seeds `team_bonus` rows "on admin page load". If no admin opens the page before a bonus is awarded via API/script, seeding is skipped and the endpoint 404s.

**Decided:** seed inside the aggregator run. Every aggregator tick `INSERT OR IGNORE` one row per IL team into `team_bonus` with `points = 0`. Rows exist as soon as the backend has seen a team — independent of UI activity. New teams added mid-event are picked up on the next tick.

### E. Login audit

`bonus_history` logs mutations but nothing records *who logged in when*.

**Decided:** skip. No `admin_login_log` table. Failed login attempts still go to the server log (per Discussion A) — enough for a one-day event with a single shared credential.

### F. `reason` required vs optional

**Decided:** drop `reason` entirely in v1. Also drop the `bonus_history` table and its endpoint — live `team_bonus` state is the only record; server logs capture admin writes for post-event review if needed.

### G. Upper bound on a single delta

**Decided:** no cap in v1. Organisers are trusted; `bonus_history` is there to catch mistakes. Revisit only if a fat-finger incident actually happens.

### H. Deletion / disqualification

Not in draft: what if a team needs to be hidden (DQ, withdrawal)?

**Decided:** add a per-team **active toggle** in the admin panel.
- Schema: `team_bonus` gains `active INTEGER NOT NULL DEFAULT 1` (SQLite boolean).
- Endpoint: `PATCH /api/admin/bonus/:teamId/active` with `{ active: boolean }`. Invalidates cache + emits SSE push, same as a batch commit.
- Aggregator: inactive teams are **excluded** from `/api/leaderboard` output entirely — not rendered, not ranked, ranks of remaining teams recomputed as if the team didn't exist.
- Admin UI: extra toggle column per row. Inactive rows remain visible in the admin table (greyed out) so organisers can reactivate at any time.
- Reactivation restores the team with its current `il_points + bonus_points`; no data is lost during deactivation.

## Build order (once approved)

1. SQLite module + migration runner.
2. Admin auth middleware + login/logout endpoints.
3. Bonus CRUD endpoints + history.
4. Aggregator merge + snapshot invalidation.
5. Admin React route + table.
6. Tests (unit + supertest).
7. Docs: update [deployment.md](deployment.md), [env-config.md](env-config.md), [aggregation.md](aggregation.md), [../data-flow.md](../data-flow.md).
