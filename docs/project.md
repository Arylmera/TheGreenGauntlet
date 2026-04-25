# Project: Event Dashboard

## Overview
Dashboard for an event, sourcing data from the Immersive Labs API.

## API
- Base URL: `https://api.immersivelabs.online` (confirmed — no region split required for target audience).
- Docs: https://api.immersivelabs.online/docs/index.html
- Auth: OAuth2 via `POST /v1/public/tokens` (form-encoded `username=<access_key>&password=<secret_token>`). Token ~30 min, cached server-side, refreshed on 401 or before expiry. Secrets live only in proxy env.

## Prior art — reuse
A previous dashboard for a similar event exists at `C:\Users\guill\Documents\git\devops-day-leaderboard` (Immersive Lab Leaderboard v2.1, per-account). Reusable components:
- `src/services/immersiveLabsAuth.js` — OAuth2 + token persistence.
- `src/services/immersiveLabsClient.js` — ImmersiveLab API wrapper.
- `src/services/syncService.js` — paginated walk + SQLite persistence.
- Schema covers `accounts`, `activities`, `attempts` (with `totalDuration`), snapshots, custom challenges.
- Cron cadence: attempts sync every 1–2 min, full sync daily at 2 AM, daily snapshot at 3 AM.
- Gotcha fixed upstream: use `??` not `||` when extracting `totalDuration` (0 s is a valid duration).
- Gotcha: sync must tolerate missing activities (404 → skip the attempt, not the batch).

That project is **per-account**, not per-team, so the team-aggregation layer is net-new here.

## Goals (v1 — shipped)
- Visualize event data from the Immersive Labs API.
- **Per-team leaderboard** (30 rows — 1 fresh Immersive Labs account per team, ranked by points). See [implementation/dashboard-storage-plan.md](implementation/dashboard-storage-plan.md).
- **Category tabs** — `Total` / `Immersive Lab` / `Mario` / `Crokinole` on the public dashboard. Same podium + list, re-ranked per category; deep-linked via `?view=`. See [implementation/category-tabs-plan.md](implementation/category-tabs-plan.md).
- **On-site bonus points** — admin-only page (`/admin`) adds/edits per-team deltas across three fixed categories (`mario`, `crokinole`, `helping`). Persisted in `bonus.sqlite` on the named Docker volume; merged into the leaderboard. Writes push via SSE so spectators update within ~100 ms. See [implementation/admin-bonus-plan.md](implementation/admin-bonus-plan.md).
- **Live push** — `GET /api/leaderboard/stream` (SSE) emits `leaderboard-updated` whenever the snapshot cache is invalidated (admin bonus write, active toggle, IL refresh). 30 s poll remains as fallback.
- **Arcade/Mario theme** — optional hamburger-menu toggle (light / dark / Mario) with pixel-art variants of the tabs, podium, team rows, and footer.
- **Admin-managed announcement banner** — `/admin` page can publish/clear a single banner that appears on the public dashboard. Persisted in `bonus.sqlite`, pushed to viewers via SSE; clients dismiss locally by `messageId`. See [implementation/admin-bonus-plan.md](implementation/admin-bonus-plan.md).
- **Cross-page navigation** — leaderboard and admin pages cross-link in the hamburger menu.
- **Display language: English only.** All UI copy, labels, and formatted output render in EN regardless of browser locale or account settings.

## Caveats / known limits
- **Fresh accounts per event.** Teams receive credentials at `EVENT_START_AT`; each account has zero lifetime points at the start. This makes `Account.points` event-scoped by construction and removes the need to walk `/v2/attempts` or filter by `completedAt`. If this assumption ever breaks (reused accounts, prefilled points), switch to the attempts path — see [implementation/aggregation.md](implementation/aggregation.md).
- **No `Event` entity in the API.** Event bounds are supplied out-of-band via env vars. Since scoring no longer filters by `completedAt`, `EVENT_START_AT` / `EVENT_END_AT` drive **phase** (pre/live/ended) and **post-event freeze** only. See [data-flow.md](data-flow.md) and [implementation/aggregation.md](implementation/aggregation.md).

## Plans
- [dashboard-plan.md](dashboard-plan.md) — leaderboard dashboard architecture (React + Vite, Fastify proxy, 30 s poll + SSE push).
- [data-flow.md](data-flow.md) — data flow, aggregation rules, security invariants.
- [implementation/README.md](implementation/README.md) — index of per-module build plans (all shipped in v1).
- [implementation/admin-bonus-plan.md](implementation/admin-bonus-plan.md) — admin page + three-category bonus persistence.
- [implementation/category-tabs-plan.md](implementation/category-tabs-plan.md) — per-category public tabs.
