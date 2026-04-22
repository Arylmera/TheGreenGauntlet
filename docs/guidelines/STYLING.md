# Styling / Responsive

- Mobile-first. Never horizontal-scroll at any breakpoint.
- Breakpoints: `sm 640`, `md 768`, `lg 1024` (design target), `xl 1280`, `2xl 1536` (TV).
- Typography via `clamp(min, vw, max)`. No fixed px on containers.
- Narrow viewport collapses columns, never wraps display names — ellipsis + tooltip.
- Rank + points always visible. They are the primary information.
- Touch targets ≥ 44×44 px (WCAG 2.5.5).
- Honor `prefers-reduced-motion` for rank-change animations.
- Light BNP-Fortis theme per [DESIGN.md](DESIGN.md) is the default — white/off-white surfaces, BNP Green accent, near-black text.
- Dark theme supported via `.dark` class on `<html>`. User toggle persists to `localStorage` (`gg.theme` = `"light" | "dark"`). First paint reads `localStorage` then falls back to `prefers-color-scheme`.
- Dark palette: page `#0b0f14`, card `#141a21`, border `#2a3038`, text primary `#f5f5f5`, secondary `#a8b0b8`, mid `#6b7178`. Brand Green (`#00915a`) and medals stay the same accent across themes.
- TV mode (`2xl` or `?tv=1`): ~1.5–2× base font, hide chrome, no hover-only affordances. Theme still toggleable.
- EN-only copy. No i18n plumbing in V1.
