# Admin Bonus Points Plan

On-site (offline) challenges and organiser-awarded points that the Immersive Labs API cannot know about. An authenticated admin page lets organisers add/edit per-team bonus points during the day; these are merged into the leaderboard alongside `Account.points`.

Status: **v1.1 shipped on `develop`.** Three bonus categories (`mario`, `crokinole`, `helping`), SQLite `team_bonus` store, batch commit, active toggle, CSV export, SSE push — all live in the current codebase (`server/bonusDb.ts`, `server/routes/admin/bonus.ts`, `server/aggregate.ts`, `src/admin/`). The section below is the original design doc and still describes the current behaviour; the "TBC" and "Build order" sections at the end are kept for historical context.

## Goals

- Award and edit bonus points per team from a simple admin UI during the 8-hour event.
- Track **three separate bonus streams**:
  - **Mario Party** — on-site challenge, shown as its own column on the public leaderboard.
  - **Crokinole** — on-site challenge, shown as its own column on the public leaderboard.
  - **Helping** — day-to-day contributions / organiser help. **Merged into the Immersive Labs points column** on the public leaderboard (hidden as a separate line).
- Persist bonuses across container restarts.
- Keep IL data untouched — bonuses live in a **separate** SQLite file.
- Single shared admin credential — no user management for a one-day event.

## Non-goals (v1.1)

- Admin-managed category list (categories are fixed in code).
- Per-admin user accounts / roles.
- Per-category leaderboards for spectators (only the combined public leaderboard is exposed; per-category breakdown lives in the CSV export).
- Negative leaderboard rankings, per-challenge history, public bonus log.
- Retroactive editing of IL points (bonuses are additive only).

## Data model (v1.1)

Separate SQLite file `data/bonus.sqlite` on the same named Docker volume as `snapshot.json` / `token.json`. Categories are fixed, so a per-column schema is simpler than a `(team_id, category)` row-per-category table and keeps the leaderboard merge to a single JOIN.

```sql
CREATE TABLE team_bonus (
  team_id            TEXT PRIMARY KEY,
  team_name          TEXT NOT NULL,
  mario_points       INTEGER NOT NULL DEFAULT 0,
  crokinole_points   INTEGER NOT NULL DEFAULT 0,
  helping_points     INTEGER NOT NULL DEFAULT 0,
  active             INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden from public leaderboard
  updated_at         TEXT NOT NULL,                -- ISO-8601 UTC
  updated_by         TEXT                          -- admin identifier (e.g. "admin")
);
```

Migration from v1: the `team_bonus` table currently has a single `points` column. For the Green Gauntlet event use-case the DB starts empty per event, so a clean recreate is acceptable. If existing data must be preserved, copy `points` → `helping_points` as the safest default (see TBC list below).

Keep `PRAGMA journal_mode=WAL`, keep the same `BONUS_DB_PATH`, keep the same named volume.

## Team sync

Unchanged from v1. On every aggregator run, the proxy `INSERT OR IGNORE`s one row per IL team into `team_bonus`, seeded with all three category columns at 0. Rename in IL → `team_name` updated on the next tick.

## Leaderboard merge

Aggregator rule per team:

```
il_out = il_raw + helping_points
total  = il_out + mario_points + crokinole_points
```

Public `/api/leaderboard` response per team:

```json
{
  "team_id": "…",
  "team_name": "…",
  "il_points": 1200,     // il_raw + helping_points (helping is hidden from the public)
  "mario_points": 80,
  "crokinole_points": 40,
  "total": 1320
}
```

Ranking is by `total`. Tie-break rule unchanged (see [aggregation.md](aggregation.md)).

Inactive teams (`active = 0`) are excluded from `/api/leaderboard` entirely — not rendered, not ranked, ranks of remaining teams recomputed as if the team didn't exist.

Snapshot cache key is bumped so v1-shape snapshots don't get served after upgrade. Cache is invalidated on every bonus write (batch commit **or** active toggle).

## Auth

Unchanged from v1.

- `ADMIN_PASSWORD` — required in prod, server refuses to start without it.
- `ADMIN_SESSION_SECRET` — HMAC key for signed session cookies.

Flow:

1. `POST /api/admin/login` with `{ password }`. Compare with `crypto.timingSafeEqual` against `ADMIN_PASSWORD`. On success, set signed httpOnly cookie `gg_admin` (SameSite=Lax, Secure, 48 h TTL). Cookie is scoped per-host; with the multi-domain nginx setup (`arylmera` / `ccei` / `bnpparibasfortis`) admin logs in once per domain they use.
2. All `/api/admin/*` routes require a valid cookie; otherwise 401.
3. `POST /api/admin/logout` clears the cookie.
4. Global rate-limit on login: 20 attempts / 5 min across all IPs (see Decisions log A).

No CSRF token — SameSite=Lax blocks cookie on cross-site POST, and mutating routes are JSON-only. Enough for this threat model. See [../guidelines/SECURITY.md](../guidelines/SECURITY.md).

## Endpoints

All under `/api/admin/*`, JSON in/out, cookie-auth.

| Method | Path                              | Purpose                                              |
| ------ | --------------------------------- | ---------------------------------------------------- |
| POST   | `/api/admin/login`                | `{ password }` → sets cookie                         |
| POST   | `/api/admin/logout`               | clears cookie                                        |
| GET    | `/api/admin/bonus`                | list all teams with per-category breakdown (see below) |
| POST   | `/api/admin/bonus/batch`          | apply multiple category-tagged deltas in one transaction |
| PATCH  | `/api/admin/bonus/:teamId/active` | `{ active: boolean }` — show/hide team on public leaderboard |
| GET    | `/api/admin/export.csv`           | final standings CSV with full breakdown              |

### `GET /api/admin/bonus`

Returns, per team (admin sees **helping split out** — unlike the public leaderboard):

```json
{
  "team_id": "…",
  "team_name": "…",
  "immersivelab_points": 1150,   // IL Account.points, before helping is merged
  "helping_points": 50,
  "mario_points": 80,
  "crokinole_points": 40,
  "total": 1320,
  "active": true,
  "updated_at": "2026-…Z"
}
```

The admin response uses `immersivelab_points` (raw, unmerged) to avoid colliding with the public `/api/leaderboard` field `il_points`, which carries the **merged** `il + helping` value. Two different audiences, two explicit names.

### `POST /api/admin/bonus/batch`

Request body:

```json
{
  "updates": [
    { "teamId": "…", "category": "mario",     "delta":  10 },
    { "teamId": "…", "category": "crokinole", "delta":  -5 },
    { "teamId": "…", "category": "helping",   "delta":  20 }
  ]
}
```

Semantics:

1. `category` validated against the hardcoded enum `['mario', 'crokinole', 'helping']`; anything else → 400.
2. For each update, read the current category value and compute the new one.
3. Reject the whole batch (422) if **any resulting per-category total would be < 0**.
4. Apply all updates in a single transaction.
5. Invalidate aggregator cache + emit one SSE event at the end.
6. Return the updated rows in the same shape as `GET /api/admin/bonus`.

Duplicate `{teamId, category}` within one batch: values are **summed** (so two `+5` entries on the same team+category apply as `+10`). This keeps the UI simple — if the admin types into the same field twice in different sessions, nothing is silently dropped.

### `GET /api/admin/export.csv`

Columns, in order:

```
team_id, team_name, immersivelab_points, helping_points, mario_points, crokinole_points, total, rank
```

`immersivelab_points` is the IL value **before** helping is merged — the CSV preserves the full breakdown for post-event analysis. Name matches the admin `GET /api/admin/bonus` response; the public `/api/leaderboard` field `il_points` is the merged value and is deliberately not used here.

## Admin UI

React route `/admin`:

- **Unauthenticated** → centred login card, password field, error on 401.
- **Authenticated** → table:

| Team     | Active | IL raw | Mario | Crokinole | Helping | Δ Mario | Δ Crokinole | Δ Helping | Total |
| -------- | ------ | ------ | ----- | --------- | ------- | ------- | ----------- | --------- | ----- |
| Team Oak | [x]    | 1150   | 80    | 40        | 50      | [   ]   | [   ]       | [   ]     | 1320  |

Behaviour:

- Three delta inputs per row (one per category). Positive adds, negative subtracts. One shared **Apply** button at the top commits all pending deltas (across all rows and all categories) via `POST /api/admin/bonus/batch`.
- Suggest different background tints per category column so the organiser doesn't put Mario points into the Crokinole input by accident.
- Single transaction — if any resulting category total would go negative, the whole batch is rejected and nothing is written. UI shows which row + which category triggered the rejection.
- On success, UI refetches `/api/admin/bonus`; inputs clear. Public leaderboard receives the SSE push and refetches within ~100 ms.
- Auto-refresh every 15 s so multiple admins stay in sync.
- Per-team active toggle column; clicking calls `PATCH /api/admin/bonus/:teamId/active` immediately (not batched). Inactive rows remain visible in the admin table (greyed out) so organisers can reactivate.

Styling: [../guidelines/STYLING.md](../guidelines/STYLING.md). Types: [../guidelines/TYPESCRIPT.md](../guidelines/TYPESCRIPT.md). Tests: [../guidelines/TESTING.md](../guidelines/TESTING.md).

## Public leaderboard UI

The dashboard grows two columns between the existing IL points column and the total:

| Rank | Team | IL points | Mario | Crokinole | Total |

`IL points` now includes helping; the dashboard does **not** call out helping separately. If a team has 0 in Mario or Crokinole, the cell still renders (as `0`) so spectators can see where they stand even before playing a game.

## SSE push

Unchanged from v1. `GET /api/leaderboard/stream` emits a `leaderboard-updated` SSE event (wire protocol `event: leaderboard-updated`) whenever the aggregator cache is invalidated: bonus batch commit, active toggle, or IL snapshot refresh. (Internally the Node `EventEmitter` uses the channel name `update`; what clients subscribe to is `leaderboard-updated`.)

Public clients subscribe to the stream and refetch `/api/leaderboard` on every event. The 30 s poll stays as a fallback for dropped connections.

## Announcements

Admin-managed banner shown above the public leaderboard. Used for event news, schedule changes, and MC messages. Single message, no scheduling, no per-team targeting.

### Storage

Single-row table in the same `bonus.sqlite` file as the team bonuses (same named volume, same WAL settings).

```sql
CREATE TABLE announcement (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  message     TEXT,                      -- NULL → banner cleared
  message_id  TEXT,                      -- UUID, regenerated on every set
  updated_at  TEXT NOT NULL,             -- ISO-8601 UTC
  updated_by  TEXT                       -- admin identifier
);
```

No history. Clearing the banner sets `message = NULL` but keeps the row.

### Constraints

- Max length **280 chars** — exposed as `ANNOUNCEMENT_MAX_LENGTH` in [server/routes/admin/announcement.ts](server/routes/admin/announcement.ts).
- Empty string or `null` clears the banner (PUT with empty string and DELETE are equivalent for the public side).

### Endpoints

| Method | Path                        | Auth   | Purpose                                                |
| ------ | --------------------------- | ------ | ------------------------------------------------------ |
| GET    | `/api/admin/announcement`   | admin  | Current message + metadata (DTO below).                |
| PUT    | `/api/admin/announcement`   | admin  | Body `{ message: string }` — set/replace.              |
| DELETE | `/api/admin/announcement`   | admin  | Clear the banner.                                      |
| GET    | `/api/announcement`         | public | Same DTO; response sets `cache-control: no-store`.     |

DTO:

```json
{
  "message": "Lunch at 12:30 in the atrium.",
  "messageId": "0fa1c0f4-…",
  "updatedAt": "2026-04-25T10:42:00Z",
  "updatedBy": "admin"
}
```

400 `INVALID` if `message` is not a string, 400 `TOO_LONG` if it exceeds 280 chars.

### Realtime

PUT and DELETE call `aggregator.invalidate()`, which fires the existing `leaderboard-updated` SSE event. Public clients refetch `/api/announcement` alongside `/api/leaderboard` on every event, so a new message lands within ~100 ms; the 30 s poll covers dropped SSE connections.

### Public UX

[src/components/leaderboard/AnnouncementBanner.tsx](src/components/leaderboard/AnnouncementBanner.tsx) renders on `PublicDashboard`. Behaviour:

- Hidden when `message` is null/empty.
- Dismissible per browser via the `×` button. Dismissal is keyed by `messageId`, so when the admin posts a new message the banner reappears even for clients that previously dismissed.
- Mario / default theme variants; `role="status"` + `aria-live="polite"` for screen readers.

### Admin UI

[src/pages/admin/AnnouncementPanel.tsx](src/pages/admin/AnnouncementPanel.tsx) on `/admin`: textarea, character counter against 280, **Save** (PUT) and **Clear** (DELETE) buttons. Errors surface inline. No history view.

## Persistence & deployment

Unchanged from v1.

- `bonus.sqlite` lives on the Docker named volume alongside `snapshot.json` + `token.json`.
- `better-sqlite3` with `PRAGMA journal_mode=WAL`.
- Backup for event day: not implemented (single-file DB, `cp` is trivial if ever needed).

See [deployment.md](deployment.md) and [env-config.md](env-config.md).

## Env vars

```
ADMIN_PASSWORD=...                 # required; server fails to start without it
ADMIN_SESSION_SECRET=...           # required; 32+ bytes random
BONUS_DB_PATH=/data/bonus.sqlite   # default; override for tests
```

Already in `.env.example` from v1.

## Build order (v1.1)

1. DB migration: add three per-category columns, drop (or copy from) `points`.
2. [server/bonusDb.ts](server/bonusDb.ts): widen the store API to accept `(teamId, category, delta)`; update batch transaction + negative guard per category.
3. [server/aggregate.ts](server/aggregate.ts): new merge formula (`il_out = il_raw + helping_points`; `total = il_out + mario + crokinole`). Bump snapshot cache key.
4. Admin endpoints: update `GET /api/admin/bonus`, `POST /api/admin/bonus/batch` payload, CSV columns. Validate category enum.
5. Admin React UI: three delta inputs per row, shared Apply, per-column tint.
6. Public dashboard UI: add Mario and Crokinole columns, keep IL as the merged column.
7. Tests: extend [server/__tests__/bonusDb.test.ts](server/__tests__/bonusDb.test.ts) + [server/__tests__/admin.test.ts](server/__tests__/admin.test.ts) to cover all three categories, mixed batches, invalid category names, and the updated CSV shape. Add aggregator test for the new formula.

## TBC — confirm before build step starts

_All three resolved — see v1.1 decisions below._

## Decisions log

Kept for historical context so future contributors understand why the feature looks the way it does.

### v1 decisions (shipped)

1. **Undo UX** — no undo button; editable fields + manual re-entry are enough.
2. **Bonus visibility on public leaderboard** — v1 showed `il_points`, `bonus_points`, `total`. v1.1 replaces this with the categorised shape above.
3. **Multiple admins simultaneously** — last-write-wins; no optimistic locking.
4. **Negative deltas** — the bonus field is a delta, not an absolute set. Resulting total bounded ≥ 0 per category.
5. **Export** — admin-auth CSV.

### v1 discussion items (Decisions A–H)

- **A. Rate-limit scope** — global limiter, 20 attempts / 5 min; every failed attempt logged.
- **B. Session TTL** — 48 h fixed, decoupled from event dates.
- **C. Snapshot invalidation vs polling** — SSE push `GET /api/leaderboard/stream`, 30 s poll kept as fallback.
- **D. Team seeding trigger** — aggregator-driven, not UI-driven. `INSERT OR IGNORE` every tick.
- **E. Login audit** — no `admin_login_log` table; server logs only.
- **F. `reason` / history table** — dropped entirely. Live `team_bonus` is the only record. No `bonus_history` table, no "History drawer". (Earlier drafts of this plan referred to a history trail; that is not built and is not planned.)
- **G. Upper bound on a single delta** — no cap.
- **H. Deactivation** — per-team `active` flag; inactive teams are excluded from ranks entirely, admin can reactivate.

### v1.1 decisions (this plan)

1. **Fixed categories** — `mario`, `crokinole`, `helping` are hardcoded in code, not admin-managed.
2. **Helping merges into IL publicly** — the public leaderboard field `il_points` = `il_raw + helping_points`; admin UI still shows them split.
3. **One delta input per category in the admin UI** — not a category picker, not per-category tabs.
4. **Admin UI column order** — Mario, then Crokinole, then Helping (challenges first, contribution points last).
5. **Batch semantics unchanged** — whole-batch reject if any **per-category** resulting total would go negative.
6. **Duplicate `{teamId, category}` in one batch** — summed, not rejected.
7. **SSE event name** — public wire event is `leaderboard-updated`; internal EventEmitter channel is `update`. Both kept as-is.
8. **DB migration from v1** — clean recreate. No prior event has been run on v1, so there is no real data to preserve.
9. **Raw-IL field name** — `immersivelab_points` on the admin `GET /api/admin/bonus` response and in the CSV export. Deliberately distinct from the public `il_points` (which is the merged value) to avoid name collision.
10. **Announcement banner** — single admin-managed message, no scheduling, no per-team targeting, dismissal is client-side only and keyed by `messageId` so new messages reappear after dismissal.
