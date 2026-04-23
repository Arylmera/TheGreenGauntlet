# Admin Bonus Points Plan

On-site (offline) challenges during the event award points that the Immersive Labs API cannot know about. An authenticated admin page lets organisers add/edit per-team bonus points during the day; these are merged into the leaderboard total alongside `Account.points`.

Status: **draft — open for discussion, not yet implemented.**

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
  updated_at  TEXT NOT NULL,       -- ISO-8601 UTC
  updated_by  TEXT                  -- admin identifier (e.g. "admin")
);

-- Append-only history for audit + undo reference.
CREATE TABLE bonus_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id     TEXT NOT NULL,
  delta       INTEGER NOT NULL,    -- signed change applied
  new_total   INTEGER NOT NULL,    -- team_bonus.points after change
  reason      TEXT,
  admin       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_bonus_history_team ON bonus_history(team_id, created_at DESC);
```

Rationale: one editable row per team keeps the merge trivial (single JOIN), while `bonus_history` preserves the "who did what" trail that a one-day live event needs when someone questions a score.

## Team sync

On admin page load, the proxy upserts one row per IL team into `team_bonus` (INSERT … ON CONFLICT DO NOTHING), seeded with `points = 0`. Teams come from the IL team list already fetched during aggregation — no extra API call. This guarantees all 30 teams show up even before anyone scores a bonus.

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

1. `POST /api/admin/login` with `{ password }`. Compare with `crypto.timingSafeEqual` against `ADMIN_PASSWORD`. On success, set signed httpOnly cookie `gg_admin` (SameSite=Strict, Secure, 8 h TTL).
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
| PUT    | `/api/admin/bonus/:teamId`        | `{ points, reason }` — set absolute bonus total, logs delta |
| POST   | `/api/admin/bonus/:teamId/delta`  | `{ delta, reason }` — add/subtract (quick `+10` buttons)      |
| GET    | `/api/admin/bonus/:teamId/history`| last N history rows for that team                    |

Both mutating endpoints:

1. Read current `points` for team.
2. Compute new total (bounded ≥ 0 — negative totals rejected).
3. UPDATE `team_bonus`, INSERT `bonus_history` row in one transaction.
4. Invalidate leaderboard snapshot cache.
5. Return updated row.

## Admin UI

New React route `/admin`:

- **Unauthenticated** → centred login card, password field, error message on 401.
- **Authenticated** → table:

| Team          | IL points | Bonus (editable) | Total | Last edit       | Actions |
| ------------- | --------- | ---------------- | ----- | --------------- | ------- |
| Team Oak      | 1200      | [150]            | 1350  | 14:22 by admin  | `+5` `+10` `−10` `History` |

Behaviour:

- Inline edit on the bonus cell → blur or Enter → prompt for `reason` → PUT.
- Quick-delta buttons next to the cell → POST delta with `reason` collected in a small popover.
- "History" opens a drawer with the last 50 changes for that team.
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

1. **Undo UX** — do we need a one-click "revert last change" button, or is manual re-entry with a reason sufficient for a single day?
2. **Bonus visibility on public leaderboard** — show `bonus_points` as a separate column, or only the merged `total`? (Transparency vs. clutter.)
3. **Multiple admins simultaneously** — is optimistic concurrency (`If-Match` on `updated_at`) worth the complexity, or is "last write wins + history trail" fine for 2–3 organisers?
4. **Negative deltas** — allow admins to subtract points (corrections), or only additive? Current draft allows both but rejects negative totals.
5. **Export** — end-of-event CSV of final standings including bonus breakdown?

## Build order (once approved)

1. SQLite module + migration runner.
2. Admin auth middleware + login/logout endpoints.
3. Bonus CRUD endpoints + history.
4. Aggregator merge + snapshot invalidation.
5. Admin React route + table.
6. Tests (unit + supertest).
7. Docs: update [deployment.md](deployment.md), [env-config.md](env-config.md), [aggregation.md](aggregation.md), [../data-flow.md](../data-flow.md).
