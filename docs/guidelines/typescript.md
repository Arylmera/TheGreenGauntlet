# TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true` in tsconfig.
- No `any`. Use `unknown` at boundaries and narrow.
- Validate external payloads (ImmersiveLab responses, env) with Zod before use.
- Prefer `type` for unions/aliases, `interface` only when declaration merging is wanted.
- `??` over `||` when `0` / `""` / `false` are valid values (see ImmersiveLab `totalDuration` gotcha).
- Exhaustive switch via `never` assertion.
- No non-null assertion (`!`) unless a comment above explains why it's safe.
