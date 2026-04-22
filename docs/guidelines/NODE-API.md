# Node Proxy (Express)

- Single process serves `dist/` static + `/api/*`. No split services.
- Only expose explicit `/api/*` routes — never a generic passthrough.
- Secrets only from env. Never logged, never sent to browser.
- Token cache in memory + optional `token.json`. Refresh on 401 or T-minutes before expiry.
- ImmersiveLab client: paginate via `nextPageToken`; do not change page size mid-walk.
- Tolerate orphan 404s on attempts — skip, don't abort the batch.
- Response cache ~10 s on `/api/leaderboard` to protect upstream rate limit.
- Errors: 5xx for upstream failures, 503 if token exchange down. Never leak upstream body to client.
- Graceful shutdown: flush in-flight, then exit.
