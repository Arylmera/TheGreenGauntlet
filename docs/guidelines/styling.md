# Styling / Responsive

- Mobile-first. Never horizontal-scroll at any breakpoint.
- Breakpoints: `sm 640`, `md 768`, `lg 1024` (design target), `xl 1280`, `2xl 1536` (TV).
- Typography via `clamp(min, vw, max)`. No fixed px on containers.
- Narrow viewport collapses columns, never wraps display names — ellipsis + tooltip.
- Rank + points always visible. They are the primary information.
- Touch targets ≥ 44×44 px (WCAG 2.5.5).
- Honor `prefers-reduced-motion` for rank-change animations.
- Honor `prefers-color-scheme`; default to high-contrast dark suited to projectors.
- TV mode (`2xl` or `?tv=1`): ~1.5–2× base font, hide chrome, no hover-only affordances.
- EN-only copy. No i18n plumbing in V1.
