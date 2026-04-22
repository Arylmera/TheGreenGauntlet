# Data Flow: Account Points → Public Dashboard

Site is public. Browser never sees an IL token. A backend proxy holds the secret, exchanges for an access token, walks the IL API, aggregates, and returns a scrubbed leaderboard.

## Sequence

```mermaid
sequenceDiagram
    participant U as Public viewer
    participant FE as React app
    participant PX as Proxy (/api)
    participant IL as api.immersivelabs.online

    U->>FE: open site (no login)
    loop every 30s (pauses if document.hidden)
        FE->>PX: GET /api/leaderboard
        alt cached <10s
            PX-->>FE: cached snapshot
        else stale
            PX->>PX: ensure access token (refresh if expired)
            alt token missing or expired
                PX->>IL: POST /v1/public/tokens (access_key + secret)
                IL-->>PX: accessToken ~30 min
            end
            par accounts walk
                PX->>IL: GET /v2/accounts?page_token=...
                IL-->>PX: page + nextPageToken
                Note over PX,IL: repeat until null
            and teams walk
                PX->>IL: GET /v2/teams?page_token=...
                IL-->>PX: page + nextPageToken
                loop each team
                    PX->>IL: GET /v2/teams/{id}/memberships
                    IL-->>PX: memberships
                end
            end
            PX->>PX: aggregate — sum Account.points per team (null to 0, skip grouping if teams empty)
            PX->>PX: cache snapshot
            PX-->>FE: { teams[], updatedAt }
        end
        FE->>U: render Leaderboard + AccountList
        alt IL returns 401
            PX->>IL: POST /v1/public/tokens (refresh)
            PX->>IL: retry request
        end
    end
```

## Data shape

```mermaid
flowchart LR
    subgraph Browser
      UI["Leaderboard + AccountList"]
    end
    subgraph Proxy
      CACHE[("10s snapshot cache")]
      TOK[("access token cache")]
      AGG[Aggregate]
    end
    subgraph IL_API
      A["GET /v2/accounts (paginated)"]
      T["GET /v2/teams (paginated)"]
      M["GET /v2/teams/id/memberships"]
    end

    UI -->|"GET /api/leaderboard"| CACHE
    CACHE -.miss.-> AGG
    AGG --> A
    AGG --> T
    AGG --> M
    TOK -.->|"Bearer"| A
    TOK -.->|"Bearer"| T
    TOK -.->|"Bearer"| M
    AGG -->|"teams totals members"| CACHE
    CACHE -->|"scrubbed JSON"| UI
```

## Auth bootstrap (server-side only)

```mermaid
flowchart TD
    ENV["env IL_ACCESS_KEY + IL_SECRET_TOKEN"] --> PX[Proxy startup]
    PX --> CHK{token cached and fresh}
    CHK -->|yes| USE["use cached accessToken"]
    CHK -->|no| EX["POST /v1/public/tokens"]
    EX --> TK["accessToken ~30 min in memory"]
    TK --> USE
    USE --> CALL["GET /v2/* with Authorization Bearer"]
    CALL -->|"401"| EX
    CALL -->|"2xx"| OUT["return to aggregator"]
```

## Aggregation rules
- `Account.points: null` → treat as `0`.
- Team total = sum of member `Account.points`.
- If IL `/v2/teams` returns empty → no team grouping; `teams: []` in payload.
- Sort teams desc by total; tie-break by member count then name.
- Snapshot cached for ~10 s to protect IL rate limits regardless of viewer count.

## Endpoints
**Proxy → browser (public, read-only)**
- `GET /api/leaderboard` — aggregated snapshot.
- `GET /api/accounts` *(optional)* — scrubbed account list for drill-down.
- `GET /api/health` — proxy + token status.

**Proxy → IL (server-side, authenticated)**
- `POST /v1/public/tokens` — token exchange.
- `GET /v2/accounts` — paginated.
- `GET /v2/teams` — paginated.
- `GET /v2/teams/{team_id}/memberships`.
- Not used: `GET /v2/accounts/{id}/teams` (redundant), deprecated `Account.teams`.

## Security invariants
- No IL credentials or tokens in the JS bundle, HTML, or any response the browser receives.
- No passthrough endpoint that forwards arbitrary IL paths.
- Responses scrubbed: drop PII fields not needed by the UI (e.g. keep `displayName` + `points`; consider dropping `email` unless the drill-down shows it).
