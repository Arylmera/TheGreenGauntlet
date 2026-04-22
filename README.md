# TheGreenGauntlet

[![CI](https://github.com/Arylmera/TheGreenGauntlet/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Arylmera/TheGreenGauntlet/actions/workflows/ci.yml)
![Status](https://img.shields.io/badge/status-planning-yellow)
![Node](https://img.shields.io/badge/node-20%2B-green)
![License](https://img.shields.io/badge/license-internal-lightgrey)

🟢 Competition leaderboard for **BNP Paribas Fortis DevOps Day** — tracks account scores across Immersive Labs security challenges, trivia, code duels, and physical games.

## Overview

Single-process Node/Express service that proxies the [Immersive Labs API](https://api.immersivelabs.online), aggregates per-team scores, and serves a React dashboard for live display (TV wall or laptop).

- **Format:** per-team leaderboard — 30 rows, 1 fresh Immersive Labs account per team.
- **Scoring:** `Account.points` trusted directly. Teams receive new accounts at `EVENT_START_AT`, so lifetime points = event points by construction.
- **Tie-break:** points desc → `lastActivityAt` asc (earlier finisher wins) → `displayName`.
- **Event scoping:** `EVENT_START_AT` / `EVENT_END_AT` drive **phase** (pre/live/ended) and **post-event freeze** (stop rebuilds, keep last snapshot). Not used for attempt filtering.
- **Refresh:** client polls every 30 s; server caches ~10 s. Snapshot persisted to disk so restarts serve stale instantly.
- **Language:** English only (UI copy independent of browser/account locale).

## Architecture

```
Browser (React + Vite)
      │  30 s polling
      ▼
Node/Express (port 3000)
  ├── /api/leaderboard  ← cached aggregate
  └── syncService       ← OAuth2 + paginated walk
      ▼
Immersive Labs API  (https://api.immersivelabs.online)
```

See:
- [docs/project.md](docs/project.md) — goals, API details, caveats.
- [docs/dashboard-plan.md](docs/dashboard-plan.md) — frontend + backend architecture.
- [docs/data-flow.md](docs/data-flow.md) — aggregation rules, security invariants.
- [docs/V1V2Scope.md](docs/V1V2Scope.md) — scope split.
- [docs/implementation/](docs/implementation/) — module-level notes.
- [TODO.md](TODO.md) — open questions blocking build.

## Tech stack

- **Backend:** Node 20+, Express, native `fetch`.
- **Frontend:** React + Vite (served as static bundle by the same Node process).
- **Persistence:** in-memory snapshot (10 s TTL) backed by two JSON files on a Docker named volume — `snapshot.json` + `token.json`. Atomic tmp + rename on write; loaded on boot.
- **Deploy:** single Docker image, port 3000, named volume mounted at `/app/data`.

## Configuration

All config via environment variables. Secrets live only in the backend — never shipped to the browser.

| Variable | Purpose |
|---|---|
| `IMMERSIVELAB_ACCESS_KEY` | OAuth2 username for `POST /v1/public/tokens`. |
| `IMMERSIVELAB_SECRET_TOKEN` | OAuth2 password. |
| `EVENT_START_AT` | ISO 8601 — drives `phase = "pre"` + pre-event gate. |
| `EVENT_END_AT` | ISO 8601 — drives `phase = "ended"` + post-event freeze. |
| `DATA_DIR` | Directory for `snapshot.json` + `token.json` (default `/app/data`, must be a named volume in prod). |
| `PORT` | HTTP listen port (default `3000`). |

## Local development

> ⚠️ Not yet scaffolded — blocked on credentials and points-source decision (see [TODO.md](TODO.md)).

Planned:

```bash
# install
npm install

# run (reads .env)
npm run dev          # backend + Vite dev server
npm run build        # static bundle into dist/
npm start            # production single-process

# docker
docker build -t greengauntlet .
docker run -p 3000:3000 -v greengauntlet-data:/app/data --env-file .env greengauntlet
```

## Prior art

A previous per-account leaderboard exists at `devops-day-leaderboard` (Immersive Lab Leaderboard v2.1). Reusable modules: `immersiveLabsAuth.js`, `immersiveLabsClient.js`, `syncService.js`, SQLite schema. Known gotchas: use `??` (not `||`) for `totalDuration`; tolerate 404 on activity lookup.

## Status

Planning phase. See [TODO.md](TODO.md) for blockers. No code committed yet.

## License

Internal — BNP Paribas Fortis DevOps Day.
