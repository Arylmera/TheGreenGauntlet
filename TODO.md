# TODO — Open items before build

Several items were resolved by reviewing the prior dashboard at `C:\Users\guill\Documents\git\devops-day-leaderboard` (Immersive Lab Leaderboard v2.1, per-account). Remaining open items below. Owners in `[brackets]`.

## Resolved by prior project
- ✅ Base URL `https://api.immersivelabs.online` confirmed (no region variant needed).
- ✅ Auth flow: OAuth2 via `POST /v1/public/tokens`, token ~30 min, refresh on 401, persist server-side.
- ✅ Public refresh cadence: 30 s.
- ✅ Sync cadence pattern: attempts every 1–2 min + full sync nightly (if we adopt SQLite path).
- ✅ PII policy default: `displayName` public, `email` hidden on leaderboard.
- ✅ Stack: Node/Express single-process, port 3000, Docker-ready.
- ✅ Reusable modules: `immersiveLabsAuth.js`, `immersiveLabsClient.js`, `syncService.js`, SQLite schema.
- ✅ Known gotchas: `??` not `||` for `totalDuration`; tolerate 404 on activity lookup.

## Resolved in this session
- ✅ Format: **per-account** leaderboard (no teams). Plan, data-flow, and implementation docs updated.
- ✅ Scoring rule on attempts path: **best attempt per activity**, summed per account. Retries do not stack.
- ✅ Default tie-break: points desc → `lastActivityAt` asc → `displayName`.

## Credentials / env
- [ ] `IL_ACCESS_KEY` provisioned for this event. `[IL admin]`
- [ ] `IL_SECRET_TOKEN` provisioned for this event. `[IL admin]`
- [ ] IL API rate limits — informs cache TTL + sync cadence. `[IL admin]`

## Event / business rules
- [ ] Event start/end timestamps — "not started" and "event over / frozen" states. `[event owner]`
- [ ] Points source: trust `Account.points` (minimal path, one walk) vs attempts-derived with best-attempt rule (richer, enables Time Spent + completed count). `[event owner + tech lead]`
- [ ] Are there weighting rules (per-lab difficulty, time bonus, penalties) on top of attempt score? `[event owner]`
- [ ] Tie-break confirmation — accept default or override? `[event owner]`
- [ ] v1 scope: public leaderboard only, or also admin panel (visibility toggle, custom challenges, display-name overrides) like prior project? `[event owner]`
- [ ] PII confirmation: default is `displayName` public / `email` hidden — any override? `[event owner + legal]`

## Ops / deploy
- [ ] Hosting target (Fly, Render, Railway, internal VM). Affects Dockerfile, TLS, domain. `[ops]`
- [ ] Public domain / URL. `[ops]`
- [ ] Secret store for IL creds. `[ops]`
- [ ] Expected concurrent viewers — validates 10 s cache + sync cadence vs IL rate limits. `[event owner + ops]`
- [ ] Logging / monitoring target. `[ops]`
- [ ] Persistence: in-memory 10 s snapshot (simpler) vs SQLite (prior-project path, survives restart, enables historical snapshots). `[tech lead]`

## UX
- [ ] Visual design / mockup: layout, typography, refresh indicator, offline/error state. `[design]`
- [ ] Display language (EN / FR / both). `[event owner]`
- [ ] Screen context: TV wall display vs laptop. Drives font sizes, auto-scroll, density. `[event owner]`

## API spec items to verify against live API (once creds land)
- [ ] Token TTL exact value (assumed ~30 min).
- [ ] Pagination default + max page size.
- [ ] `Attempt` shape: fields for score, `totalDuration`, `completedAt`, `accountUuid`, `activityUuid` — confirm names.
- [ ] `Account.points` semantics — cumulative lifetime, or scopable to the event window? If lifetime only, must use attempts path to scope to the event.

## Next step
Turn credentials + points-source + v1-scope into a short questionnaire for the event owner and IL admin. Block coding until credentials and points-source resolve.
