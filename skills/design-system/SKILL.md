---
name: design-system
description: "Bootstrap or audit a centralized design system (Tailwind v4 + shadcn). Scaffolds a tokenized globals.css, extendTailwindMerge registry, centralized component families, a mock/ catalog route, and a manifesto-style design-language doc. Opinionated defaults: 3 font sizes, 2 weights, semantic tokens, single manifesto. Use when user wants to set up styling, build a design language, audit design drift, or establish a component system."
---

Resource files live in this skill's `resources/` directory. Read them as needed with the Read tool — their content is the authoritative reference for every artifact this skill generates.

## Phase 0 — Detect mode

Probe the repo (read-only). Look for these 6 markers:

1. `globals.css` (in `app/`, `src/app/`, or `src/`) contains `@theme inline` + `--text-*` + `--radius-*` + `:root` + `.dark`
2. `lib/utils.ts` or `src/lib/utils.ts` calls `extendTailwindMerge` with custom groups
3. `components/ui/` — shadcn primitives present
4. `components/shared/` (or `src/components/shared/`) — centralized component families present
5. `docs/guides/design-language*.md` — manifesto present
6. `app/mock/` or `src/mock/` — catalog route present

**≥ 4 markers present → audit mode. Otherwise → bootstrap mode.** Always confirm with the user before proceeding.

Also detect the framework (`package.json` → next / vite / remix / astro) and Tailwind version. Adapt all paths accordingly (`app/` for Next.js App Router, `src/` for Vite/Remix). If shadcn is not installed, recommend installing it before continuing — do not scaffold without it.

## Phase 1 — Interview

Compose `/grill-me` if installed. If not, draw from `resources/interview-questions.md`.

Bias toward **why** and **what** — the how is owned by this system. If the user signals technical depth, embrace implementation-level questions. Cap at ~6 deliberate questions. Do not pad.

## Phase 2 — Bootstrap branch

### Step 1 — Three-variant preview

Generate 3 distinct mood-board variants and render them in `app/mock/theme-preview/` (one route, three side-by-side panels). Each panel shows: palette swatches, heading samples, body text, a button, a card. Compose `/frontend-design` if installed for aesthetic generation; otherwise apply inline creative judgment — make the three variants genuinely distinct (e.g. warm/earthy, cool/minimal, high-contrast/geometric).

Start the dev server. Point the user at `/mock/theme-preview`. If headless, capture screenshots via Playwright MCP to `.design-system-tmp/` and show them.

User picks one variant. Iterate on that variant only if adjustments are needed — do not re-roll all three.

### Step 2 — Generate artifacts

Once the variant is chosen, write these files:

| File | Reference |
|------|-----------|
| `app/globals.css` | `resources/globals.css.example` |
| `lib/utils.ts` (merge only; preserve non-twMerge exports) | `resources/utils.ts.example` |
| `app/mock/index.tsx` + `app/mock/theme/page.tsx` + `app/mock/components/page.tsx` + `app/mock/pages/home/page.tsx` | `resources/mock-catalog/` |
| `docs/guides/design-language-app.md` | `resources/design-language.md.example` |

Read each resource file before writing its counterpart. Substitute the chosen palette + typography + shape vibe throughout.

Default to **one manifesto**. Add `design-language-marketing.md` only if the user has explicitly described a distinct marketing surface.

Do not commit anything. Do not add AI attribution to any scaffolded file.

## Phase 3 — Audit branch

Read `resources/audit-rules.md`. Walk every rule against the repo. Write findings to `.design-system-audit.md` (add to `.gitignore` if not already there).

Then loop interactively: present one finding at a time → propose the fix → wait for explicit user approval → apply → move to next. No silent auto-fixes. Skip a finding only if the user explicitly defers it.

## Phase 4 — Verify

**Bootstrap:** dev server running, `/mock` renders without console errors, dark mode flips cleanly (if enabled), `pnpm build` (or equivalent) passes.

**Audit:** every blocker from the findings report addressed or explicitly deferred by the user.

## Operating principles

- **Defaults are non-negotiable until the user gives a reason.** 3 font sizes, 2 weights, semantic tokens, single manifesto. Push back once with a clear rationale. If the user has a real reason, accept and record the deviation in the manifesto — then move on.
- **Why/what before how.** The how is this system. The user decides the what; this skill decides the how.
- **Compose when available.** `/grill-me` for interviews, `/frontend-design` for aesthetic generation, `/ddd` for visual-loop verification. Fall back inline if not installed — never fail.
- **Never commit. Never add AI watermarks.** Scaffolded files are the user's work.
- **One round of pushback, then defer.** Disagree clearly, explain why, then execute the user's call without relitigating.
