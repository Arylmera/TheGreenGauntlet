# Design System Inspired by BNP Paribas Fortis

## 1. Visual Theme & Atmosphere

BNP Paribas Fortis's brand identity is built on a confident, institutional calm: crisp white canvases (`#ffffff`, `#f5f5f5`) punctuated by the signature BNP Paribas Green (`#00915a`) and grounded by near-black text (`#1a1a1a`). The design philosophy is "trusted clarity" — surfaces are clean, hierarchy is deliberate, and the green accent signals action, progress, and brand presence without ever shouting. Every element is engineered to feel stable, legible, and premium, as befits a retail bank that speaks to both first-time savers and enterprise clients.

The typography system relies on the proprietary **BNPPSans** family (with Arial and Helvetica Neue as web-safe fallbacks), a humanist sans-serif that balances approachability with authority. Weight usage is disciplined: 700 (bold) for headlines and numeric emphasis, 500 (medium) for subheads and interactive labels, and 400 (regular) for body copy. Letter-spacing stays near-neutral — BNP Paribas favors honest, readable type over stylized tracking.

What distinguishes BNP Paribas Fortis is its **green-and-white rigor paired with generous whitespace**. Primary buttons use a moderate 4px–8px radius (never fully pill-shaped), cards sit on soft shadows (`rgba(0, 0, 0, 0.08) 0px 2px 8px`), and the Green Star logo device reappears as a visual anchor across surfaces. The result is an interface that feels like a well-organized branch office — measured, transparent, and built for trust.

**Key Characteristics:**
- Light, airy foundation (`#ffffff`, `#f5f5f5`) — clarity over immersion
- BNP Paribas Green (`#00915a`) as the singular brand accent — signals action and identity
- BNPPSans typography (Arial / Helvetica Neue fallback) — humanist, neutral, legible
- Moderate radii (4px–8px) and rectangular-leaning geometry — no full pills
- Soft, low-opacity shadows (`rgba(0, 0, 0, 0.06–0.12)`) — subtle depth on light surfaces
- Semantic colors: error red (`#d0271d`), warning amber (`#f5a623`), info blue (`#1d72b8`)
- The Green Star mark as a recurring brand signal
- Dense, data-friendly layouts — banking is numeric; the UI respects that

## 2. Color Palette & Roles

### Primary Brand
- **BNP Paribas Green** (`#00915a`): Primary brand accent — CTAs, active states, key links
- **Deep Green** (`#007a4b`): Hover / pressed state for the primary green
- **Forest Green** (`#005a36`): Header bands, emphasized brand surfaces
- **Mint Highlight** (`#d6ecdf`): Subtle success / selection background

### Neutrals
- **White** (`#ffffff`): Base page background, card surfaces
- **Off-White** (`#f5f5f5`): Section backgrounds, alternating rows
- **Light Gray** (`#e6e6e6`): Dividers, subtle borders
- **Mid Gray** (`#8c8c8c`): Secondary text, inactive icons
- **Charcoal** (`#4a4a4a`): Body text on light, muted headings
- **Near Black** (`#1a1a1a`): Primary text, headlines

### Semantic
- **Error Red** (`#d0271d`): `--text-negative`, validation errors, destructive actions
- **Warning Amber** (`#f5a623`): `--text-warning`, caution states
- **Info Blue** (`#1d72b8`): `--text-info`, informational notices
- **Success Green** (`#00915a`): Confirmation — reuses brand green intentionally

### Surface & Border
- **Card White** (`#ffffff`): Primary card surface
- **Panel Gray** (`#fafafa`): Secondary panels, sidebars
- **Divider** (`#e6e6e6`): Hairline separators
- **Input Border** (`#c4c4c4`): Resting input stroke
- **Focus Ring** (`#00915a`): 2px outline on focused interactive elements
- **Sand Accent** (`#e8d9b0`): Rare warm accent for promotional surfaces

### Shadows
- **Soft** (`rgba(0, 0, 0, 0.06) 0px 1px 2px`): Resting cards, inputs
- **Medium** (`rgba(0, 0, 0, 0.08) 0px 2px 8px`): Elevated cards, dropdowns
- **Heavy** (`rgba(0, 0, 0, 0.14) 0px 8px 24px`): Modals, popovers, menus
- **Focus Glow** (`rgba(0, 145, 90, 0.25) 0px 0px 0px 3px`): Focus-visible ring

## 3. Typography Rules

### Font Families
- **Headings**: `BNPPSans`, fallbacks: `Arial, Helvetica Neue, Helvetica, sans-serif`
- **UI / Body**: `BNPPSans`, same fallback stack
- **Numeric / Tabular**: `BNPPSans` with `font-variant-numeric: tabular-nums` for balances, amounts, leaderboard scores

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Display | BNPPSans | 40px (2.50rem) | 700 | 1.15 | -0.01em | Hero / landing |
| Page Title | BNPPSans | 32px (2.00rem) | 700 | 1.20 | normal | H1 |
| Section Title | BNPPSans | 24px (1.50rem) | 700 | 1.25 | normal | H2 |
| Feature Heading | BNPPSans | 20px (1.25rem) | 600 | 1.30 | normal | H3, card titles |
| Subheading | BNPPSans | 18px (1.13rem) | 500 | 1.35 | normal | H4 |
| Body Emphasized | BNPPSans | 16px (1.00rem) | 600 | 1.50 | normal | Lead paragraphs |
| Body | BNPPSans | 16px (1.00rem) | 400 | 1.50 | normal | Standard body |
| Button | BNPPSans | 14px (0.88rem) | 600 | 1.00 | normal | No uppercase |
| Nav Link Active | BNPPSans | 14px (0.88rem) | 600 | 1.20 | normal | Selected nav |
| Nav Link | BNPPSans | 14px (0.88rem) | 400 | 1.20 | normal | Inactive nav |
| Caption | BNPPSans | 13px (0.81rem) | 400 | 1.45 | normal | Metadata, helper text |
| Small | BNPPSans | 12px (0.75rem) | 400 | 1.40 | normal | Fine print, labels |
| Numeric Large | BNPPSans | 28px (1.75rem) | 700 | 1.10 | -0.01em | Balances, scores |

### Principles
- **Readability first**: BNP Paribas communicates financial information — type must be legible at a glance, never decorative.
- **Sentence case over uppercase**: Buttons and navigation use sentence case. Uppercase is reserved for tiny regulatory labels.
- **Neutral tracking**: Letter-spacing stays at `normal` or a light negative on display sizes. No wide-tracked buttons.
- **Tabular numerics**: Any numeric display (amounts, scores, leaderboard positions) uses `font-variant-numeric: tabular-nums` so columns align.
- **Weight hierarchy**: 400 / 500 / 600 / 700 cover the full system. Skip 300 (too thin for finance) and 800+ (too heavy).

## 4. Component Stylings

### Buttons

**Primary (Green)**
- Background: `#00915a`
- Text: `#ffffff`
- Padding: 12px 24px
- Radius: 4px
- Hover: background `#007a4b`
- Focus: 3px `rgba(0, 145, 90, 0.25)` ring

**Secondary (Outlined)**
- Background: `transparent`
- Text: `#00915a`
- Border: `1px solid #00915a`
- Padding: 11px 23px (to match primary height)
- Radius: 4px
- Hover: background `#d6ecdf`

**Tertiary (Ghost)**
- Background: `transparent`
- Text: `#1a1a1a`
- Padding: 12px 16px
- Radius: 4px
- Hover: background `#f5f5f5`

**Destructive**
- Background: `#d0271d`
- Text: `#ffffff`
- Radius: 4px
- Hover: darken to `#a81e16`

**Icon Button**
- Background: `transparent` or `#f5f5f5`
- Radius: 4px (not circular — BNP keeps squarish geometry)
- Padding: 8px
- Size: 40×40px minimum tap target

### Cards & Containers
- Background: `#ffffff`
- Border: `1px solid #e6e6e6` OR shadow-only (never both)
- Radius: 8px
- Padding: 16px–24px
- Shadow: `rgba(0, 0, 0, 0.06) 0px 1px 2px` resting, lifts to `rgba(0, 0, 0, 0.08) 0px 2px 8px` on hover

### Inputs
- Background: `#ffffff`
- Text: `#1a1a1a`
- Border: `1px solid #c4c4c4`
- Radius: 4px
- Padding: 10px 12px
- Focus: border `#00915a`, 3px `rgba(0, 145, 90, 0.25)` ring
- Error: border `#d0271d`, helper text `#d0271d`

### Navigation
- Top bar: `#ffffff` background, `#1a1a1a` text, 1px `#e6e6e6` bottom divider
- Brand mark (Green Star) top-left in `#00915a`
- Active nav item: 2px bottom border in `#00915a`, text weight 600
- Inactive nav item: `#4a4a4a`, weight 400
- Sidebar (if used): `#fafafa` background, left-border active indicator in green

### Tables & Data (banking-specific)
- Header row: `#f5f5f5` background, `#1a1a1a` text, weight 600
- Row divider: 1px `#e6e6e6`
- Hover row: `#fafafa`
- Negative amounts: `#d0271d`; positive amounts: `#00915a` (use sparingly)
- All numeric cells: right-aligned, tabular-nums

## 5. Layout Principles

### Spacing System
- Base unit: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Grid & Container
- Max content width: 1280px, centered
- 12-column grid with 24px gutters on desktop
- Sidebar (optional) + main content on dashboard views
- Generous padding on outermost containers (32–64px) to preserve the BNP "airy" feel

### Whitespace Philosophy
- **Breathing room is brand**: BNP Paribas communicates trust through space. Don't crowd.
- **Group by proximity**: Related fields and metrics cluster tightly (8–12px) and separate by larger gaps (24–32px).
- **Align to the grid**: Numeric columns, form labels, and card grids all share the same vertical rhythm.

### Border Radius Scale
- Sharp (0px): Data table cells, full-bleed banners
- Subtle (2px): Badges, chips
- Standard (4px): Buttons, inputs, small components
- Comfortable (8px): Cards, panels, modals
- Rounded (12px): Feature surfaces, hero cards
- Circle (50%): Avatars only — never buttons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Base (Level 0) | `#ffffff` or `#f5f5f5` background | Page surface |
| Surface (Level 1) | `rgba(0, 0, 0, 0.06) 0px 1px 2px` | Resting cards, inputs |
| Elevated (Level 2) | `rgba(0, 0, 0, 0.08) 0px 2px 8px` | Hover cards, dropdowns |
| Floating (Level 3) | `rgba(0, 0, 0, 0.12) 0px 4px 16px` | Popovers, tooltips |
| Dialog (Level 4) | `rgba(0, 0, 0, 0.14) 0px 8px 24px` | Modals, menus, sheets |
| Focus Ring | `rgba(0, 145, 90, 0.25) 0px 0px 0px 3px` | Focus-visible on interactive elements |

**Shadow Philosophy**: Shadows on light backgrounds must remain subtle. BNP Paribas never uses dramatic drop-shadows — elevation is communicated through a soft, diffuse lift at low opacity. When in doubt, prefer a 1px `#e6e6e6` border over a heavy shadow.

## 7. Do's and Don'ts

### Do
- Use white (`#ffffff`) and off-white (`#f5f5f5`) as primary surfaces — light is the brand
- Apply BNP Paribas Green (`#00915a`) for CTAs, active states, focus rings, and brand marks
- Keep buttons rectangular with 4px radius — never full pills
- Use sentence case on buttons and navigation — uppercase only for legal micro-labels
- Apply soft shadows (6–14% opacity) for elevation
- Use tabular-nums for any numeric display — amounts, scores, counters
- Preserve generous whitespace — breathing room reinforces trust

### Don't
- Don't use BNP Green on large background fills — it's an accent, not a surface
- Don't use pure black text — `#1a1a1a` reads warmer and on-brand
- Don't apply heavy shadows on light surfaces — they look harsh and cheap
- Don't introduce additional brand colors — green + neutrals + semantic is the entire system
- Don't use all-uppercase display type — BNP speaks clearly, not loudly
- Don't use circular or fully-pill buttons — that geometry belongs to consumer apps, not banking
- Don't mix borders and shadows on the same element — pick one

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile Small | <375px | Compact single-column, 16px gutters |
| Mobile | 375–640px | Single-column, stacked cards |
| Tablet | 640–1024px | 2-column grid, condensed nav |
| Desktop | 1024–1280px | Full 12-column grid, sidebar visible |
| Large Desktop | >1280px | Max-width 1280px centered, generous margins |

### Collapsing Strategy
- Navigation: top bar → hamburger drawer on mobile
- Data tables: horizontal scroll → stacked key/value rows on mobile
- Card grid: 4 columns → 3 → 2 → 1
- Forms: two-column → single-column below 768px
- Modals: centered dialog → full-screen sheet on mobile

## 9. Agent Prompt Guide

### Quick Color Reference
- Background: White (`#ffffff`) / Off-White (`#f5f5f5`)
- Surface: Card White (`#ffffff`)
- Text: Near Black (`#1a1a1a`)
- Secondary text: Charcoal (`#4a4a4a`) / Mid Gray (`#8c8c8c`)
- Accent: BNP Paribas Green (`#00915a`)
- Border: Light Gray (`#e6e6e6`)
- Error: Error Red (`#d0271d`)

### Example Component Prompts
- "Create a white card: #ffffff background, 8px radius, 1px #e6e6e6 border. Title at 20px BNPPSans weight 600, #1a1a1a. Subtitle at 14px weight 400, #4a4a4a. Shadow rgba(0,0,0,0.08) 0px 2px 8px on hover."
- "Design a primary button: #00915a background, white text, 4px radius, 12px 24px padding. 14px BNPPSans weight 600, sentence case. Hover darkens to #007a4b."
- "Build a leaderboard row: white background, 1px #e6e6e6 bottom divider, 16px vertical padding. Rank in 16px weight 700 tabular-nums. Name in 16px weight 500. Score right-aligned in 18px weight 700 tabular-nums, color #00915a for top 3."
- "Create a form input: white background, 1px #c4c4c4 border, 4px radius, 10px 12px padding. Focus: border #00915a plus 3px rgba(0,145,90,0.25) ring."
- "Design top navigation: white background, 1px #e6e6e6 bottom border. Brand green star logo left. Active link: #1a1a1a weight 600 with 2px #00915a bottom border. Inactive: #4a4a4a weight 400."

### Iteration Guide
1. Start with white — BNP Paribas lives in the light, not the dark
2. BNP Green (`#00915a`) for CTAs, focus, active states, and brand anchor points only
3. Rectangles with 4px (buttons/inputs) or 8px (cards) — no full pills, no circles for controls
4. Sentence case, humanist type, neutral tracking — speak clearly
5. Soft shadows (6–14% opacity) — elevation is a whisper, not a shout
6. Tabular-nums everywhere numbers matter — this is a banking aesthetic
7. Whitespace is the feature — if it feels tight, add 8px
