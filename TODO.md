# TODO — Open items before build

Owners in `[brackets]`. Resolved items pruned; see git history for context.

## Credentials / env — blocking
- [ ] `IMMERSIVELAB_ACCESS_KEY` provisioned for this event. `[ImmersiveLab admin]`
- [ ] `IMMERSIVELAB_SECRET_TOKEN` provisioned for this event. `[ImmersiveLab admin]`
- [ ] ImmersiveLab API rate limits — informs cache TTL + sync cadence. `[ImmersiveLab admin]`
- [ ] `EVENT_START_AT` / `EVENT_END_AT` ISO 8601 values. `[event owner]`

## Event / business rules
- [ ] Weighting rules (per-lab difficulty, time bonus, penalties) on top of attempt score? `[event owner]`
- [ ] v1 scope: public leaderboard only, or also admin panel (visibility toggle, custom challenges, display-name overrides)? `[event owner]`
- [ ] PII override: default is `displayName` public / `email` hidden — confirm or override. `[event owner + legal]`

## Ops / deploy
- [ ] Hosting target (Fly, Render, Railway, internal VM). Affects Dockerfile, TLS, domain. `[ops]`
- [ ] Public domain / URL. `[ops]`
- [ ] Secret store for ImmersiveLab creds. `[ops]`
- [ ] Expected concurrent viewers — validates 10 s cache + sync cadence vs ImmersiveLab rate limits. `[event owner + ops]`
- [ ] Logging / monitoring target. `[ops]`
- [ ] Persistence: in-memory 10 s snapshot vs SQLite (survives restart, enables historical snapshots). `[tech lead]`

## UX
- [ ] Visual design / mockup: layout, typography, refresh indicator, offline/error state. `[design]`

## API spec — verify against live API once creds land
- [ ] Token TTL exact value (assumed ~30 min).
- [ ] Pagination default + max page size.
- [ ] `Attempt` shape: `score`, `totalDuration`, `completedAt`, `accountUuid`, `activityUuid` — confirm names.
- [ ] `Account.points` semantics — cumulative lifetime, or scopable to event window? If lifetime only, attempts path is mandatory.

## Next step
Turn credentials + points-source + v1-scope into a short questionnaire for event owner and ImmersiveLab admin. Block coding until credentials and points-source resolve.
