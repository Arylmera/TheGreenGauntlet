# Security

- Dashboard is public. Browser holds no token, no key, no secret. Ever.
- ImmersiveLab credentials live only in proxy env. Never in repo, never in logs.
- Response scrubbing: strip `email` from `/api/leaderboard` by default. Keep only fields the UI uses.
- No arbitrary passthrough of `/v2/*`. Proxy exposes a closed set of read-only routes.
- CORS: same-origin only. No wildcard.
- Rate-limit `/api/*` at the proxy to survive viral traffic.
- Dependency updates: review Dependabot PRs; do not auto-merge major bumps.
- Never commit `token.json`, `.env`, or SQLite snapshots. `.gitignore` enforces this.
