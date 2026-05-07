# Blur Points Toggle — Design

**Date:** 2026-05-07
**Status:** Approved (awaiting implementation plan)

## Goal

Let an admin hide all numeric point values on the public dashboard with a single toggle, for a "big reveal" moment at the end of the event. When the toggle is ON, every point number is visually obscured (blurred) for all viewers in real time. When OFF, points return to normal.

## Non-goals

- No automatic schedule/timer (admin always toggles manually).
- No selective per-team or per-category blur — it's all-or-nothing.
- Names, ranks, podium order, avatars, theme chrome stay fully visible.

## Architecture

Mirror the existing announcement feature end-to-end (same shape, same lifecycle):

1. **Storage** — `blur_points` flag in `data/bonus.sqlite` (single row `settings` table or extend the `announcement` table). New column on a singleton row keeps things simple and atomic with existing migrations.
2. **Server state** — `BonusDb.getBlurPoints()` / `setBlurPoints(active, updatedBy)`.
3. **Admin endpoints** (auth-gated, mirrors `announcement.ts`):
   - `GET /api/admin/blur` → `{ blurPoints: boolean, updatedAt, updatedBy }`
   - `PUT /api/admin/blur` body `{ blurPoints: boolean }` → updates row, calls `aggregator.invalidate()`
4. **Public propagation** — extend the leaderboard snapshot returned by `LeaderboardAggregator.getLeaderboard()` with a top-level `blurPoints: boolean`. Existing SSE `leaderboard-updated` already broadcasts that snapshot; admin toggle → invalidate → SSE → all viewers refetch and update within ~100 ms.
5. **Frontend — admin** — new toggle in `AdminTeamsTable` header (next to announcement panel). Optimistic flip + PUT, rollback on error.
6. **Frontend — public** — read `blurPoints` from snapshot context (wherever the leaderboard payload is consumed). When `true`, apply a `data-blur="on"` attribute (or class) on numeric cells in `TeamRow`, podium `PipeStep` / `PanelStep`, and the delta highlight. Single CSS rule: `filter: blur(10px); user-select: none; pointer-events: none;`. Add a `prefers-reduced-motion` consideration: blur is static, so no motion concern, but transition the filter `~200ms` for a smooth flip.

## Data flow

```
Admin clicks toggle
   → PUT /api/admin/blur { blurPoints: true }
   → BonusDb.setBlurPoints(true, 'admin')
   → aggregator.invalidate()
   → next /api/leaderboard rebuild includes blurPoints: true
   → LeaderboardEvents emits leaderboard-updated
   → all SSE clients receive snapshot
   → React state updates → blurred cells render
```

## Visual rules

Blur applies to:
- Leaderboard table: IL points, Mario points, Crokinole points, Total, delta cell.
- Podium: the points line on each PipeStep / PanelStep.
- Anywhere else that renders a raw number from `Team` (search Audit during implementation).

Blur does NOT apply to:
- Team name, rank number, avatar, last activity timestamp, search input.
- Admin dashboard (admins always see real numbers).

CSS: `filter: blur(10px) saturate(0.6); user-select: none;` with `transition: filter 200ms ease`.

## Error handling

- Admin PUT failure → toast + revert toggle UI.
- If snapshot is missing `blurPoints` (older cached payload during a deploy), default to `false`.
- DB write failures bubble up the same way bonus/announcement writes already do.

## Testing

- `bonus/db.test.ts` — get/set blur flag, default false, persistence after reopen.
- `routes/admin/blur.test.ts` — auth required; PUT updates value, GET reflects it; aggregator invalidated.
- Aggregator test — snapshot includes `blurPoints` from DB.
- Frontend (vitest+RTL) — `TeamRow` and podium step render blur class when `blurPoints=true`, plain when false.

## Out-of-scope follow-ups

- Optional admin-side preview of "what spectators see right now".
- Automatic blur-on-phase-end (e.g. tied to `EVENT_END_AT`).
