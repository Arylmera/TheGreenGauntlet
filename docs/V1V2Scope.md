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
| Persistence | SQLite with 8 tables (accounts, activities, attempts, snapshots, custom challenges, types, displaynames, links) | Two JSON files on a Docker named volume: `snapshot.json` (leaderboard payload) + `token.json` (OAuth token). In-memory snapshot (~10 s) reloaded from disk on boot. |
| Sync model | Scheduled: full sync daily 2 AM, quick sync every minute, snapshot 3 AM | On-demand aggregation per request, cached 10 s |
| Auth to IL API | OAuth2 with `token.json` persistence | Same pattern, proxied only; token never leaves server |
| Admin panel | Yes — 5 tabs (Leaderboard, Sync, Custom Challenges, Config, Docs) | None |
| Admin auth | Session-based, `ADMIN_PASSWORD`, `SESSION_SECRET` | N/A |
| Custom challenges | First-class feature (types, challenges, per-user assignments) | Dropped |
| Custom display names | Supported (override API names) | Dropped |
| Leaderboard visibility toggle | Admin-controlled | Always visible (public by definition) |
| Points model | Labs points + custom points, lifetime cumulative | `Account.points` directly (fresh accounts per event → lifetime = event) |
| Event window scoping | None (lifetime points) | `EVENT_START_AT` / `EVENT_END_AT` drive **phase** (pre/live/ended) and **post-event freeze** only; not used for score filtering |
| Tie-break rule | Not explicit | Earlier `lastActivityAt` wins, then display name |
| PII handling | Stores emails in DB; admin can view | Emails scrubbed from API response by default |
| Time tracking | `totalDuration` stored per attempt | Not surfaced in v1 (no attempts walk) |
| Config surface | `config.json` + `.env` + admin Config tab | `.env` only |
| Deployment | Single container, Docker Hub image, volume mounts for config/token/data | Single Node process, multi-stage Dockerfile, named volume for `snapshot.json` + `token.json` |
| Ports/processes | One Node process, port 3000 | Same (single process, one port) |
| Docs in app | Built-in README viewer tab | None |
| Reused modules | Originals live here | Port of `immersiveLabsAuth.js`, `immersiveLabsClient.js`, `syncService.js` |

## What V2 intentionally removes
- SQLite and all repositories — no history, no audit tables, no custom-challenge schema.
- Admin panel, session auth, login page, visibility toggle.
- Custom challenges subsystem and display-name overrides.
- Scheduled cron-style sync. Replaced by request-time aggregation + short cache.
- HTML templating. Frontend is now a bundled SPA.
- Attempts-path walking (`/v2/activities` + `/v2/attempts`). Not needed given fresh accounts.

## What V2 adds
- Event-phase semantics (`EVENT_START_AT` / `EVENT_END_AT` → `pre` / `live` / `ended`) with pre-event gate and post-event freeze. V1 had no concept of event bounds.
- Durable snapshot + token on a Docker named volume — lets restarts serve stale data instantly.
- Explicit tie-break ordering (`lastActivityAt` asc, then `displayName`).
- Public-by-design posture: PII scrubbing, minimal proxy surface, no passthrough of arbitrary `/v2/*`.
- Short-TTL snapshot cache + single-flight to protect IL rate limits under many viewers.

## What stays the same
- Base URL and OAuth2 flow against `api.immersivelabs.online`.
- Token cache in memory + optional `token.json` persistence on disk.
- Per-account (not per-team) ranking.
- `??` vs `||` gotcha for `totalDuration`.
- Skip-orphan-attempt rule when an activity 404s mid-walk.
- Single Node process serving both API and UI on one port.

## Trade-offs worth flagging on reflection
- **No relational DB** means no historical trends, no leaderboard replay, no audit trail. Acceptable for a live event dashboard; would need revisiting if post-event analysis is required. Swap JSON snapshot for SQLite later without touching the API contract.
- **No admin UI** means operational changes (event window, credentials) require a redeploy or env change. Simpler, but less flexible mid-event.
- **Trusting `Account.points`** relies on the assumption that accounts are fresh at `EVENT_START_AT`. If reused / prefilled accounts appear, switch to the attempts path (documented as fallback in [implementation/aggregation.md](implementation/aggregation.md)).
- **Dropping custom challenges** removes the "community event / training / achievement" levers V1 used to reward out-of-platform activity. If the event mixes IL and non-IL challenges, this gap reappears.
- **Post-event freeze** is enforced by stopping rebuilds (serve last pre-end snapshot). Teams who keep playing after `EVENT_END_AT` still accumulate points in the IL API — the dashboard just stops reading them. Operational, not cryptographic.
