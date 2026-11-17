# Design System & Responsive Tokens

## Visual Balance (60-30-10 Rule)
- **60% Base / Canvas**: `#F8FAFC` (Light) / `#0B0F19` (Dark). Used for page canvas and neutral background.
- **30% Secondary Surfaces**: `#FFFFFF` cards, `#F1F5F9` subtle containers, `#E2E8F0` borders.
- **10% Accent / Primary Actions**: `#4F46E5` (Light Indigo) / `#6366F1` (Dark Indigo). Reserved for primary buttons, active links, and brand badges.

## Semantic Colors
- `success`: `#16A34A` (Green)
- `warning`: `#D97706` (Amber)
- `danger`: `#DC2626` (Red)
- `info`: `#0284C7` (Sky)
- `focus-ring`: `#6366F1`

## Typography
- Primary font: `'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Weights: 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold).
- Body base size: 16px.

## Responsive Targets
- Minimum touch/clickable control height: `44px` (`min-h-control`).
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px.
- Container max width: `1200px`.
- Screen overflow check: Zero horizontal page-level overflow down to `360px` mobile viewport width.
- Accessibility: Visible focus outline on keyboard tab navigation (`:focus-visible`), aria semantics, and `prefers-reduced-motion` animation suppression.

