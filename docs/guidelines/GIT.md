# Git

- Default branch: `develop`. Feature branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`.
- Conventional-ish commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Commit message: why over what. Subject ≤ 72 chars. Body wraps at 80.
- One logical change per commit. Rebase-squash noise before PR.
- PR description: what changed, why, how verified. Link TODO.md item if applicable.
- Never force-push `develop` or `main`.
- No `--no-verify`. Fix the hook, don't bypass it.
