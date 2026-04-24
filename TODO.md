# TODO — Open items before build

Owners in `[brackets]`. Resolved items pruned; see git history for context.

## Credentials / env — blocking
- [ ] `IMMERSIVELAB_ACCESS_KEY` provisioned for this event. `[ImmersiveLab admin]`
- [ ] `IMMERSIVELAB_SECRET_TOKEN` provisioned for this event. `[ImmersiveLab admin]`
- [ ] ImmersiveLab API rate limits — informs cache TTL + sync cadence. `[ImmersiveLab admin]`
- [ ] `EVENT_START_AT` / `EVENT_END_AT` ISO 8601 values. `[event owner]`
- [ ] **Confirm 30 fresh IL accounts are provisioned with zero lifetime points at `EVENT_START_AT`.** Whole scoring model ([aggregation.md](docs/implementation/aggregation.md)) rests on this. `[ImmersiveLab admin]`
- [ ] Credentials distribution process (who hands creds to teams at start). `[event owner]`

## Event / business rules
- [ ] Weighting rules (per-lab difficulty, time bonus, penalties) on top of `Account.points`? `[event owner]`
- [ ] v1 scope: public leaderboard only, or also admin panel (visibility toggle, custom challenges, display-name overrides)? `[event owner]`
- [ ] PII override: default is `displayName` public / `email` scrubbed — confirm or override. `[event owner + legal]`

## Ops / deploy
- [ ] Hosting target (Fly, Render, Railway, internal VM). Affects Dockerfile, TLS, domain, volume driver. `[ops]`
- [ ] Public domain / URL. `[ops]`
- [ ] Secret store for ImmersiveLab creds. `[ops]`
- [ ] Expected concurrent viewers — validates 10 s cache vs ImmersiveLab rate limits. `[event owner + ops]`
- [ ] Logging / monitoring target. `[ops]`
- [x] Persistence: JSON (`snapshot.json` + `token.json`) on a Docker named volume. No SQLite in v1. See [dashboard-storage-plan.md](docs/implementation/dashboard-storage-plan.md).

## UX
- [ ] Visual design / mockup: layout, typography, refresh indicator, offline/error state, phase banners. `[design]`

## API spec — verify against live API once creds land
- [ ] Token TTL exact value (assumed ~30 min).
- [ ] Pagination default + max page size on `/v2/accounts`.
- [x] `Account.points` semantics — confirmed lifetime cumulative. Event-scoped by giving teams fresh accounts at `EVENT_START_AT` (see fresh-accounts blocker above). Attempts path no longer needed in v1.

## Performance — deferred (low value for 30-team / 8-hour event)
- [ ] **BonusDb full scan on every rebuild** — `bonusDb.getAll()` loaded in [server/aggregate.ts:198-199](server/aggregate.ts) on each rebuild. At 30 rows it's trivial; revisit only if scale grows. Effort: S.
- [ ] **Snapshot write-on-every-rebuild** — `JsonStore.save()` in [server/snapshotStore.ts](server/snapshotStore.ts) hits disk on every rebuild (~every 10s + every admin write). ~2800 writes across an 8h event. Not user-visible; consider debouncing or skip-if-unchanged if we see disk pressure. Effort: S.
- [ ] **Client polls every 30s alongside SSE** — [src/hooks/useLeaderboard.ts:77-86](src/hooks/useLeaderboard.ts). By design (poll is fallback when SSE drops). Only revisit if we see duplicate refresh churn under poor connectivity. Effort: M.

## Next step
Confirm fresh-account provisioning + credentials with ImmersiveLab admin. Block coding until credentials and fresh-account confirmation resolve.
