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
- `src/services/immersiveLabsClient.js` — IL API wrapper.
- `src/services/syncService.js` — paginated walk + SQLite persistence.
- Schema covers `accounts`, `activities`, `attempts` (with `totalDuration`), snapshots, custom challenges.
- Cron cadence: attempts sync every 1–2 min, full sync daily at 2 AM, daily snapshot at 3 AM.
- Gotcha fixed upstream: use `??` not `||` when extracting `totalDuration` (0 s is a valid duration).
- Gotcha: sync must tolerate missing activities (404 → skip the attempt, not the batch).

That project is **per-account**, not per-team, so the team-aggregation layer is net-new here.

## Goals
- Visualize event data from the Immersive Labs API.
- **Per-account leaderboard** (one row per Immersive Labs account, ranked by points) — same format as the prior project.

## Plans
- [dashboard-plan.md](dashboard-plan.md) — leaderboard dashboard architecture (React + Vite, 30 s polling).
- [data-flow.md](data-flow.md) — data flow, aggregation rules, security invariants.
- [../TODO.md](../TODO.md) — open questions blocking build.
