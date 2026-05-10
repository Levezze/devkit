# Audit Rules

Severity levels: **BLOCKER** (causes silent bugs or broken theming), **DRIFT** (deviation from the system), **MISSING** (recommended piece absent).

## globals.css

- **BLOCKER** — `@theme inline` block missing. Tailwind utilities for custom tokens won't be generated.
- **BLOCKER** — Custom `@utility` body uses a hardcoded hex literal instead of `var(--token)`. Token won't flip in dark mode.
- **BLOCKER** — `:root` defines a token but `.dark` does not override it. Dark mode gets the light value.
- **DRIFT** — `bg-white` or `text-black` used on a theme-controlled surface (page chrome, card, dialog). Use `bg-background` / `text-foreground`.
- **DRIFT** — More than 5 font-size CSS variables defined. The system defaults to 3; 5 is the maximum.
- **DRIFT** — More than 3 font-weight variants visually present in the app.
- **MISSING** — No `@keyframes skeleton-pulse` or equivalent softer pulse for skeleton loading. Tailwind's default `animate-pulse` (1→0.5) is too aggressive.
- **MISSING** — No `interactive-card` (or equivalent) utility. Hover behavior is inline per-component instead of centralized.

## lib/utils.ts (or equivalent)

- **BLOCKER** — A custom `text-*` font-size utility exists in globals.css but is NOT listed in the `"font-size"` class group in `extendTailwindMerge`. Any `cn()` call that combines this utility with a `text-*` color class will silently strip the size.
- **BLOCKER** — A custom `interactive-*` utility exists in globals.css but is NOT listed in a custom class group in `extendTailwindMerge`. Can cause class conflicts under composition.
- **MISSING** — `extendTailwindMerge` is not used at all. The project uses vanilla `twMerge`. Not a bug, but font-size and interactive utilities must be manually avoided in ambiguous combinations.

## Component patterns

- **BLOCKER** — A centralized card or form component uses inline gradient/color values instead of design-system tokens. Changes to the palette won't propagate.
- **DRIFT** — Card built inline (raw `div` with `rounded-2xl border ...`) instead of using the centralized `ActionCard` / equivalent. New patterns should extend the component, not bypass it.
- **DRIFT** — `hover:shadow-lg` or `hover:shadow-elevated` applied to a card alongside `interactive-card`. The utility owns the hover recipe — pairing with manual hover shadows produces double-stacked shadows.
- **DRIFT** — `hover:border-*` applied alongside `interactive-card`. Specificity conflict: the doubled-selector inside the utility wins, making the hover:border-* ineffective.
- **DRIFT** — Ad-hoc `max-w-5xl` / `max-w-3xl` / `max-w-7xl` on page-level containers. Use `max-w-page` / `max-w-content`.
- **DRIFT** — Native Tailwind `text-sm` / `text-lg` used for content text. Use the semantic tokens.
- **MISSING** — Centralized component lacks an `asChild` / `Slot` escape hatch. Consumers can't wrap it in a `<Link>` without extra DOM nesting.
- **MISSING** — No `data-slot` attribute on compound component parts. Makes targeted CSS fragile.

## Documentation

- **MISSING** — No `docs/guides/design-language-app.md` (or equivalent manifesto). Future contributors have no source of truth.
- **DRIFT** — Manifesto references specific component file paths or hex values inline instead of token names. Code rots; manifesto should reference tokens and utilities only.
- **MISSING** — `interactive-hover-utilities.md` (or equivalent) absent when `interactive-*` utilities exist. The specificity note and hover recipe should be documented separately from the manifesto.

## Mock catalog

- **MISSING** — No `app/mock/` (or equivalent) catalog route. Design system changes can't be verified visually without touching real pages.
- **DRIFT** — Mock catalog route imports data from real API hooks instead of using static fixtures. The catalog should be fully static — zero API dependencies.
