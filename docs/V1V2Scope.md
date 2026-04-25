# V1 vs V2 Scope — Historical Reflection

> Reference-only. Not an implementation guide. Compares `devops-day-leaderboard` (the prior account-based app) with TheGreenGauntlet **as shipped** for the BNP Paribas Fortis DevOps Day event.
>
> An earlier revision of this file described TheGreenGauntlet as a stripped-down "public read-only, no DB, no admin" V2. That framing is obsolete — the app shipped with an admin panel, a SQLite bonus store, and per-category tabs. The table below reflects the **shipped v1 of TheGreenGauntlet**.

## One-line framing
- **Prior art**: full-featured admin-operated leaderboard with local SQLite mirror of the Immersive Labs API, custom challenges, and auth-gated management UI. Per-account.
- **TheGreenGauntlet v1 (shipped)**: public per-team dashboard with live SSE push, four category tabs, optional Mario/Arcade theme, and a narrow admin panel for organiser-awarded bonuses in three fixed categories. Proxy + aggregation + React SPA + a small SQLite file for bonuses only.

## Scope deltas

| Area | devops-day-leaderboard (prior) | TheGreenGauntlet v1 (shipped) |
|---|---|---|
| Audience | Admin + public viewers | Public viewers + a narrow organiser admin panel |
| Frontend | Server-rendered HTML views (`views/*.html`) | React + Vite SPA (public `/` + `/admin`) |
| Backend | Express + SQLite + controllers/repositories/routes | Fastify proxy + in-memory aggregator + small SQLite (bonuses only) |
| Unit of ranking | Per account | Per team (1 IL account per team) |
| Persistence | SQLite with 8 tables (accounts, activities, attempts, snapshots, custom challenges, types, displaynames, links) | `snapshot.json` (leaderboard cache) + `token.json` (OAuth) + `bonus.sqlite` (three-category bonuses). All on one Docker named volume. |
| Sync model | Scheduled: full sync daily 2 AM, quick sync every minute, snapshot 3 AM | On-demand aggregation per request, cached ~10 s (`SNAPSHOT_TTL_MS`) |
| Refresh to clients | Polling only | 30 s client poll **plus** SSE push (`/api/leaderboard/stream`) on cache invalidation |
| Auth to IL API | OAuth2 with `token.json` persistence | Same pattern, proxied; token never leaves the server |
| Admin panel | 5 tabs (Leaderboard, Sync, Custom Challenges, Config, Docs) | Single `/admin` page for per-team bonus deltas + active toggle + CSV export |
| Admin auth | Session-based, `ADMIN_PASSWORD`, `SESSION_SECRET` | HMAC-signed httpOnly cookie `gg_admin`, `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`, 48 h TTL, global 20/5 min rate limit on login |
| Custom challenges | First-class feature (types, challenges, per-user assignments) | Replaced by three fixed bonus categories: `mario`, `crokinole`, `helping` |
| Bonus structure | Custom challenges + per-user assignments | Fixed-column schema: `mario_points`, `crokinole_points`, `helping_points`, `active`. No history table. |
| Public leaderboard columns | Variable (custom-challenge driven) | IL (merged with helping) + Mario + Crokinole + Total, re-ranked per selected category tab |
| Category tabs | — | `Total` / `Immersive Lab` / `Mario` / `Crokinole`, deep-linked via `?view=` |
| Theme | Single default | Light / dark / **Mario arcade** pixel theme toggled from hamburger menu, with sound effects in arcade mode |
| Announcement banner | — | Admin-published single banner stored in `bonus.sqlite`, served via public `GET /api/announcement`, pushed via SSE, dismissed client-side per `messageId` |
| Cross-page nav | — | Hamburger menu cross-links between `/` and `/admin` |
| Custom display names | Supported (override API names) | Dropped — IL `displayName` is used directly |
| Leaderboard visibility toggle | Admin-controlled whole-board | Per-team `active` flag — inactive teams excluded from ranks entirely |
| Points model | Labs points + custom points, lifetime cumulative | `Account.points` (fresh accounts per event → lifetime = event) + three bonus categories |
| Scoring formula | Labs + custom | `il_points = Account.points + helping_points`; `total = il_points + mario_points + crokinole_points` |
| Participant filter | None | `@immersivelabs.pro` email allowlist applied inside the walker |
| Upstream fetch | Sequential paginated walk | Paginated list, then per-uuid detail fetches with concurrency 8 |
| Event window scoping | None (lifetime points) | `EVENT_START_AT` / `EVENT_END_AT` drive **phase** (pre/live/ended) + pre-event gate + post-event freeze. Not used for score filtering. |
| Tie-break rule | Not explicit | Earlier `lastActivityAt` wins, then `displayName` asc |
| PII handling | Stores emails in DB; admin can view | Emails scrubbed from the public API response |
| Time tracking | `totalDuration` stored per attempt | Not surfaced (no attempts walk) |
| Config surface | `config.json` + `.env` + admin Config tab | `.env` only |
| Deployment | Single container, Docker Hub image | Single Node process, multi-stage Dockerfile, named volume `greengauntlet-data:/app/data`, healthcheck, tini as PID 1 |
| Ports/processes | One Node process, port 3000 | Same (single process, one port; `1337:3000` in compose) |
| Docs in app | Built-in README viewer tab | None — docs live in repo |
| Reused modules | Originals live there | Port of `immersiveLabsAuth.js`, `immersiveLabsClient.js`, `syncService.js` into TS |

## What v1 adds over the prior art
- Event-phase semantics (`EVENT_START_AT` / `EVENT_END_AT` → `pre` / `live` / `ended`) with pre-event gate and post-event freeze.
- Three-category bonus system (`mario`, `crokinole`, `helping`) with `helping` merged silently into IL on the public leaderboard and surfaced only to the admin + CSV.
- Category tabs on the public board so a single page carries four ranked views.
- SSE push channel so admin writes propagate within ~100 ms, not on the next poll boundary.
- Durable snapshot + token on a Docker named volume — restarts serve stale instantly.
- Explicit tie-break ordering (`lastActivityAt` asc, then `displayName`).
- Public-by-design posture: PII scrubbing, minimal proxy surface, no passthrough of arbitrary `/v2/*`.
- `@immersivelabs.pro` participant filter in the walker to exclude non-participant accounts.
- Short-TTL snapshot cache + single-flight to protect IL rate limits under many viewers.
- Mario-arcade theme variants across tabs, podium, team rows, and footer.
- Admin-managed announcement banner with SSE push + per-`messageId` client dismissal.
- Bonus / active / announcement writes invalidate the snapshot **without** triggering an upstream IL fetch, protecting against 429s during rapid admin edits.

## What v1 intentionally drops
- History / audit tables, attempts walk, `completedAt` filtering — not needed with fresh-per-event accounts.
- Custom-challenge subsystem and per-user assignments — replaced by the three fixed bonus categories.
- Admin-managed display-name overrides, admin Config tab, in-app README viewer.
- Scheduled cron-style sync — replaced by request-time aggregation + short cache.
- HTML templating — fully a bundled SPA.

## Trade-offs worth flagging on reflection
- **Minimal relational data** means no historical trends, no replay, no audit trail beyond the single live `team_bonus` row per team. Acceptable for a one-day event; revisit if post-event analysis is required.
- **Admin panel is deliberately narrow** — only bonus deltas + active toggle. Event-window edits still require a redeploy or env change.
- **Trusting `Account.points`** relies on accounts being fresh at `EVENT_START_AT`. If reused / prefilled accounts appear, switch to the attempts path (documented as fallback in [implementation/aggregation.md](implementation/aggregation.md)).
- **Fixed bonus categories** (mario / crokinole / helping) are compiled in; changing them at event time requires a code change.
- **Post-event freeze** is enforced by stopping rebuilds (serve last pre-end snapshot). Teams who keep playing after `EVENT_END_AT` still accumulate points in the IL API — the dashboard just stops reading them. Operational, not cryptographic.
