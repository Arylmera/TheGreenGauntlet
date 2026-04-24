# Styling / Responsive

- Mobile-first. Never horizontal-scroll at any breakpoint.
- Breakpoints: `sm 640`, `md 768`, `lg 1024` (design target), `xl 1280`, `2xl 1536` (TV).
- Typography via `clamp(min, vw, max)`. No fixed px on containers.
- Narrow viewport collapses columns, never wraps display names — ellipsis + tooltip.
- Rank + points always visible. They are the primary information.
- Touch targets ≥ 44×44 px (WCAG 2.5.5).
- Honor `prefers-reduced-motion` for rank-change animations.
- Light BNP-Fortis theme per [DESIGN.md](DESIGN.md) is the default — white/off-white surfaces, BNP Green accent, near-black text.
- Three themes: `light` (default), `dark` (`.dark` class on `<html>`), and `mario` (`[data-theme="mario"]` arcade skin). User selection persists to `localStorage` (`gg.theme` = `"light" | "dark" | "mario"`). First paint reads `localStorage`; if absent, falls back to `prefers-color-scheme` (light or dark only).
- Theme selection UI: a single hamburger menu in the header (`src/components/HamburgerMenu.tsx`) exposes all three themes as radio items. In `mario`, the same menu also reveals the sound-effects toggle. There is no standalone theme-cycle or sound button.
- Dark palette: page `#0b0f14`, card `#141a21`, border `#2a3038`, text primary `#f5f5f5`, secondary `#a8b0b8`, mid `#6b7178`. Brand Green (`#00915a`) and medals stay the same accent across themes.
- TV mode (`2xl` or `?tv=1`): ~1.5–2× base font, hide chrome, no hover-only affordances. Theme still selectable via the hamburger menu.
- EN-only copy. No i18n plumbing in V1.
