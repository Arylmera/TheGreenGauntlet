# V1 vs V2 Scope — Reflection Notes

> Reference-only. Not an implementation guide. Compares `devops-day-leaderboard` (V1, shipped) with TheGreenGauntlet (V2, in design).

## One-line framing
- **V1**: full-featured admin-operated leaderboard app with local SQLite mirror of the Immersive Labs API, custom challenges, and auth-gated management UI.
- **V2**: stripped-down public, read-only event dashboard. Proxy + aggregation + React view. No DB, no admin, no custom challenges.

## Scope deltas

| Area | V1 (devops-day-leaderboard) | V2 (TheGreenGauntlet) |
|---|---|---|
| Audience | Admin + public viewers | Public viewers only |
| Frontend | Server-rendered HTML views (`views/*.html`) | React + Vite SPA |
| Backend | Express + SQLite + controllers/repositories/routes | Express proxy + in-memory cache |
| Persistence | SQLite with 8 tables (accounts, activities, attempts, snapshots, custom challenges, types, displaynames, links) | None. Ephemeral in-memory snapshot (~10 s) + token cache |
| Sync model | Scheduled: full sync daily 2 AM, quick sync every minute, snapshot 3 AM | On-demand aggregation per request, cached 10 s |
| Auth to IL API | OAuth2 with `token.json` persistence | Same pattern, proxied only; token never leaves server |
| Admin panel | Yes — 5 tabs (Leaderboard, Sync, Custom Challenges, Config, Docs) | None |
| Admin auth | Session-based, `ADMIN_PASSWORD`, `SESSION_SECRET` | N/A |
| Custom challenges | First-class feature (types, challenges, per-user assignments) | Dropped |
| Custom display names | Supported (override API names) | Dropped |
| Leaderboard visibility toggle | Admin-controlled | Always visible (public by definition) |
| Points model | Labs points + custom points, lifetime cumulative | Best-attempt per activity, filtered by event window |
| Event window scoping | None (lifetime points) | `EVENT_START_AT` / `EVENT_END_AT` env vars filter attempts by `completedAt` |
| Tie-break rule | Not explicit | Earlier `lastActivityAt` wins, then display name |
| PII handling | Stores emails in DB; admin can view | Emails scrubbed from API response by default |
| Time tracking | `totalDuration` stored per attempt | Optional surface, derived from best attempt |
| Config surface | `config.json` + `.env` + admin Config tab | `.env` only |
| Deployment | Single container, Docker Hub image, volume mounts for config/token/data | Single Node process, multi-stage Dockerfile, no volumes required |
| Ports/processes | One Node process, port 3000 | Same (single process, one port) |
| Docs in app | Built-in README viewer tab | None |
| Reused modules | Originals live here | Port of `immersiveLabsAuth.js`, `immersiveLabsClient.js`, `syncService.js` |

## What V2 intentionally removes
- SQLite and all repositories — no historical data, no snapshots.
- Admin panel, session auth, login page, visibility toggle.
- Custom challenges subsystem and display-name overrides.
- Scheduled cron-style sync. Replaced by request-time aggregation + short cache.
- HTML templating. Frontend is now a bundled SPA.

## What V2 adds
- Event-window scoping (`EVENT_START_AT`/`EVENT_END_AT`) — V1 had no concept of event bounds.
- Best-attempt-per-activity aggregation rule.
- Explicit tie-break ordering.
- Public-by-design posture: PII scrubbing, minimal proxy surface, no passthrough of arbitrary `/v2/*`.
- Short-TTL snapshot cache to protect IL API rate limits under many viewers.

## What stays the same
- Base URL and OAuth2 flow against `api.immersivelabs.online`.
- Token cache in memory + optional `token.json` persistence on disk.
- Per-account (not per-team) ranking.
- `??` vs `||` gotcha for `totalDuration`.
- Skip-orphan-attempt rule when an activity 404s mid-walk.
- Single Node process serving both API and UI on one port.

## Trade-offs worth flagging on reflection
- **No DB** means no historical trends, no leaderboard replay, no audit trail. Acceptable for a live event dashboard; would need revisiting if post-event analysis is required.
- **No admin UI** means operational changes (event window, credentials) require a redeploy or env change. Simpler, but less flexible mid-event.
- **Best-attempt scoring** diverges from V1's lifetime cumulative sum. Results are not directly comparable to V1 standings.
- **Dropping custom challenges** removes the "community event / training / achievement" levers V1 used to reward out-of-platform activity. If the event mixes IL and non-IL challenges, this gap reappears.
- **Event-window filtering** relies on `/v2/attempts.completedAt`; if that field or pagination behaves differently than assumed, aggregation needs to fall back to `Account.points` (with the lifetime caveat).
