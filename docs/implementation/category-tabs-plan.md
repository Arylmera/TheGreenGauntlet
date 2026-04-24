# Category Tabs — Implementation Plan

> **Status: shipped in v1.** `src/components/LeaderboardTabs.tsx`, `src/utils/rankByCategory.ts` (+ test), `src/hooks/useViewCategory.ts`, and the `immersivelab_points` field on the public payload are all live on `develop`. Server `PublicTeam` retains both `immersivelab_points` (raw) and `il_points` (= raw + helping) per the decision below.

## Context

The public dashboard currently shows a single leaderboard sorted by `team.total` (sum of IL-including-helping + mario + crokinole). We want three additional disciplines accessible as tabs *inside the same page* so spectators can see who is leading in each discipline individually, not just overall.

Teams are global to the site — the same team list re-sorted per tab. `Podium` + `Leaderboard` components are reused with identical design on every tab; only the data they receive changes.

## Decisions

- **Tabs:** `Total`, `Immersive Lab`, `Mario`, `Crokinole`. Default = `Total`.
- **Layout per sub-tab:** each sub-tab shows *only its own points column* plus the team identity columns (rank, avatar, name, last activity). No other disciplines shown. Total tab keeps all columns (current behavior).
- **Podium:** same design on every tab; Podium numbers = the active category's points.
- **Mobile responsive:** always — including the tab strip. Tabs collapse to a horizontally scrollable row on narrow viewports.
- **Deep link:** selected tab reflected in the URL (`?view=total|il|mario|crokinole`) so a specific board can be shared.
- **Admin page:** untouched.
- **Helping points:** only counted in the Total tab. The `Immersive Lab` sub-tab sorts and displays **raw IL only**, excluding helping. Requires a small server change — see below.
- **Flash-on-tab-switch:** suppressed. The live-score flash effect fires only on real score updates, not when the user manually changes tabs.

## Server change (small)

`server/aggregate.ts` currently strips `immersivelab_points` and `helping_points` from `PublicTeam` (see `server/aggregate.ts:27` and `server/aggregate.ts:109`).

Change: keep `immersivelab_points` on `PublicTeam` (drop only `helping_points`). This gives the client the raw IL number so the `Immersive Lab` sub-tab can sort by it without helping. `il_points` (raw + helping) remains unchanged and is what the Total tab uses.

Files:
- `server/aggregate.ts` — update the `PublicTeam` type and the destructure/omit at line 109.
- `server/__tests__/aggregate.test.ts` — update expectation that `immersivelab_points` is now present on the public payload.

## Client changes

### New files

- `src/components/LeaderboardTabs.tsx` — horizontal tab strip above the board. Standard and Mario-themed variants (consumes `useArcade()`). Controlled: `value`, `onChange`. `overflow-x-auto` + `snap-x` on mobile so the four tabs never overlap content.
- `src/utils/rankByCategory.ts` — pure helper: `rankByCategory(teams, category)` returns a new list sorted desc by the category field with `rank` reassigned 1..N. Tiebreaker: `total` desc, then `lastActivityAt` desc, then `displayName`.
- `src/hooks/useViewCategory.ts` — reads/writes the `?view=` query param; returns `[category, setCategory]`. Falls back to `'total'`.

### Modified files

- `src/types.ts` — export `type Category = 'total' | 'immersivelab_points' | 'mario_points' | 'crokinole_points'`. Add `immersivelab_points: number` to the public `Team` type to match the server change.
- `src/App.tsx` — `PublicDashboard`:
  - `const [category, setCategory] = useViewCategory();`
  - `const viewTeams = useMemo(() => rankByCategory(data.teams, category), [data.teams, category]);`
  - Render `<LeaderboardTabs value={category} onChange={setCategory} />` above the Podium block.
  - Pass `category` to `Podium` and `Leaderboard`; pass `viewTeams` (not `data.teams`).
- `src/components/Podium.tsx` — accept `category`. Replace every `team.total` read with `team[scoreField(category)]`. Pipe/panel scaling unchanged.
- `src/components/Leaderboard.tsx` — accept `category`. When `category === 'total'`, render current columns as today. When `category !== 'total'`, render only `#`, avatar, team name, the *single* active points column, and last activity. Header label reflects the active category (e.g. `MARIO` on Mario theme, `Mario` on standard).
- `src/components/TeamRow.tsx` — accept `category`. Mirror Leaderboard's column change (show only the active category column outside Total). Rank shown = rank from the re-ranked list.
- `src/hooks/useFlashedTeams.ts` / `src/hooks/useRowAnimations.ts` — add a "paused" signal so flashes are suppressed during the one render that follows a category change. Simplest impl: compare previous `category` to current; if different, skip the flash diff for that render.

## Reuse notes

- `useArcade()` already provides theme — `LeaderboardTabs` consumes the same context; no new theme plumbing.
- Podium layout (pipes vs panels), Leaderboard styling, row animations: all reused as-is per tab. No duplicated components.

## Non-goals

- Admin page changes.
- Persisting the selected tab anywhere beyond the URL (no localStorage).
- Changing how helping points are stored or displayed in the Total tab.
- Changes to SSE / admin bonus batch flow.

## Verification

1. `npm run dev`.
2. `/` with no query → Total tab selected, identical to today.
3. Click `Immersive Lab` → URL becomes `/?view=il`; teams re-order by raw IL (no helping); only the IL column is visible; Podium top-3 = IL leaders; rank numbers 1..N updated.
4. Repeat for Mario and Crokinole.
5. Reload on `/?view=mario` → Mario tab pre-selected.
6. Resize to mobile width → tab strip scrolls horizontally; no overflow; single-column sub-tabs still readable.
7. Mario theme toggle → tabs render in pixel style; re-sort still works.
8. Trigger a live update (admin bonus commit → SSE push): row flash occurs on the update, but no flash when the user just switches tabs.
9. Regression: admin page unchanged; helping bonus still adds to Total and to the Total tab's IL column.
10. `npm test server` passes with the updated `aggregate.test.ts`.
