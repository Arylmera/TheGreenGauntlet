## Summary
<!-- What changed and why. 1-3 bullets. -->

## Related
<!-- Closes #123, relates to TODO.md item X -->

## Test plan
- [ ]
- [ ]

## Checklist
- [ ] Docs updated (`docs/`, `README.md`, `TODO.md` as applicable)
- [ ] No secrets committed (`.env`, tokens, access keys)
- [ ] Event phase + freeze still correct (`EVENT_START_AT` → pre gate; `EVENT_END_AT` → freeze rebuilds)
- [ ] Snapshot + token persistence on `DATA_DIR` still working (restart serves stale instantly)
- [ ] `displayName` public / `email` hidden invariant preserved
