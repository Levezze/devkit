---
name: ddd
description: Design-Driven Development — visual checklist verification loop for UI work. Use when building UI components, pages, or layouts. Replaces automated visual test suites with fast Playwright MCP screenshot checks at 3 viewports. Supports both greenfield (build-verify) and regression (before/after) modes.
---

# Design-Driven Development (DDD)

## Philosophy

**Core principle**: Design intent is verified visually, not through automated DOM assertions. A screenshot tells you more than a hundred `getComputedStyle` checks.

**Two modes**:
- **Greenfield** — Write a visual checklist → Build → Screenshot → Verify against checklist → Fix → Re-screenshot until clean.
- **Regression** — Screenshot the current state (baseline) → Write a visual checklist of what should change → Make changes → Screenshot again → Verify the checklist items improved and nothing else broke.

**Why not automated Playwright tests for design?** They're slow (minutes per run against dev servers), brittle (CSS variable timing, cold-start race conditions, font loading), and test the wrong thing (computed style strings instead of "does this look right"). Visual verification via the Playwright MCP is instant and catches things automated assertions miss — like "this card looks cramped" or "the spacing rhythm is off."

Automated tests are still the right tool for **behavior** (form validation, API calls, navigation). DDD is for **appearance**.

## Anti-Pattern: Automated Visual Test Suites

**DO NOT** write `.spec.ts` files that assert on computed styles, font families, background colors, or border-radius values for design verification. These tests:

- Take 5+ minutes to run against a dev server
- Require `fullyParallel: false` to avoid flakiness
- Break on harmless changes (font fallback string order, sub-pixel rounding)
- Miss actual visual problems (overlapping text, broken layout rhythm, wrong visual weight)
- Give false confidence — "all 26 tests pass" means nothing if the page looks bad

## Viewports

Always check at three breakpoints:

| Name | Width | Height |
|------|-------|--------|
| Desktop | 1280 | 800 |
| Tablet | 768 | 1024 |
| Mobile | 375 | 812 |

---

## Mode 1: Greenfield (Build & Verify)

Use when building new UI from scratch.

### 1. Write the Visual Checklist

Before building, write a concrete checklist of what the finished UI must look like. Each item should be visually verifiable from a screenshot — not a DOM property.

Good checklist items:
- `[ ] Hero image covers full width with dark gradient overlay on the left`
- `[ ] 3 cards in a row on desktop, stacked on mobile`
- `[ ] Price text is large serif, visually dominant in the card`

Bad checklist items (these belong in automated tests, not DDD):
- `getComputedStyle(el).fontFamily contains "Noto Serif"` ← test an actual style rule, not a visual
- `border-radius is exactly 9999px` ← you can't see the difference between 9999px and 999px
- `background-color is rgb(127, 85, 55)` ← just check "button is brown"

### 2. Build

Implement the UI. Focus on getting the structure and content right first, then polish spacing and motion.

### 3. Screenshot & Verify

Use the Playwright MCP tools to check your work:

```
1. browser_resize → set viewport (desktop first)
2. browser_navigate → go to the page
3. browser_take_screenshot → full page screenshot
4. Walk the checklist, mark pass/fail
5. Repeat for tablet and mobile viewports
```

For interactive elements (hover states, menus, accordions), use `browser_click` or `browser_hover` then screenshot.

### 4. Fix & Re-check

Fix any failures. Re-screenshot only the affected viewport — don't re-check everything.

### 5. Commit

Once the checklist is clean at all 3 viewports, commit.

---

## Mode 2: Regression (Before / After)

Use when restyling, refactoring, or overhauling existing UI. Like red-green in TDD: red = baseline (current state), green = after changes (verified against checklist).

### 1. Baseline — Screenshot the Current State

Before touching any code, capture the current state using Playwright MCP:

```
For each page/route in scope:
  1. browser_resize → desktop (1280×800)
  2. browser_navigate → go to the page (log in with test user if needed)
  3. browser_take_screenshot → save/note as baseline
  4. Repeat for tablet (768×1024) and mobile (375×812)
```

Describe what you see in writing. This is your "red" — the state you're changing from. Note anything that's already broken or looks off.

### 2. Write the Visual Checklist

Write what the UI should look like **after** your changes. Be specific about what's changing:

```markdown
### Header
- [ ] Wordmark replaces old paw logo
- [ ] Nav icons are Material Symbols, not lucide
- [ ] Colors match new earth-tone palette

### Preserved
- [ ] Layout structure unchanged — same nav items, same positions
- [ ] All interactive elements still reachable
- [ ] No content missing compared to baseline
```

Always include a **Preserved** section — things that must NOT change. This catches unintended regressions.

### 3. Make Changes

Implement the restyle/refactor.

### 4. After — Screenshot & Compare

Screenshot the same pages at the same viewports:

```
For each page/route:
  1. browser_resize → same viewport as baseline
  2. browser_navigate → same page
  3. browser_take_screenshot → this is your "green" candidate
  4. Walk the checklist:
     - Changed items: verify they match the spec
     - Preserved items: verify they're unchanged from baseline
  5. Repeat for all 3 viewports
```

### 5. Fix & Re-check

If checklist items fail — either intended changes look wrong or preserved items regressed — fix and re-screenshot only the affected viewport.

### 6. Commit

Once the checklist is clean (all changes landed correctly, no regressions) at all 3 viewports, commit.

---

## Checklist Templates

### Greenfield Template

```markdown
## DDD — Visual Checklist (Playwright MCP)

After building, use the Playwright MCP tools to navigate to `/<route>` at
three viewports — desktop (1280×800), tablet (768×1024), mobile (375×812).
Take full-page screenshots and verify each item.

### Section Name
- [ ] Description of what it should look like
- [ ] Another visual assertion
- [ ] ...

### Responsive
- [ ] No horizontal overflow at any viewport
- [ ] No text clipping or overlapping at mobile
- [ ] Images don't break at any viewport
```

### Regression Template

```markdown
## DDD — Regression Checklist (Playwright MCP)

**Route**: `/<route>`
**Test user**: <credentials or login method>

### Baseline (before)
Captured at: <timestamp or commit>
Notes: <brief description of current state>

### Expected Changes
- [ ] Change description 1
- [ ] Change description 2
- [ ] ...

### Preserved (must not regress)
- [ ] Preserved behavior/appearance 1
- [ ] Preserved behavior/appearance 2
- [ ] ...

### Responsive
- [ ] No horizontal overflow at any viewport
- [ ] No text clipping or overlapping at mobile
- [ ] No content missing at any viewport
```

---

## When to Use DDD vs TDD

| Use DDD | Use TDD |
|---------|---------|
| Layout and spacing | Form validation logic |
| Colors, fonts, visual hierarchy | API calls and data flow |
| Responsive behavior | Navigation and routing |
| Animation presence | State management |
| Component visual states (hover, active) | Error handling |
| Design system compliance | Business rules |
| **Restyling / visual refactors (regression mode)** | **Functional refactors** |
