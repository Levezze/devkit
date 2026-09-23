# Phase 3 — Code plan

**Programming-level planning, per module.** Which files are added, changed or moved, and what gets consolidated first. Run it for every module in the current slice. Later modules get theirs when `resume` reaches them.

Research subagents check reuse before anything new is designed: existing utilities in the repo, and libraries or open-source options. Recommend reusing or adopting something whenever it fits.

## Topics (per module)

1. **Files** — added / changed / moved / deleted, with a one-line reason each.
2. **Types** — models, schemas, enums, contracts; which are public.
3. **Functions and utilities** — the new ones; the existing ones reused.
4. **Refactors first** — consolidation or moves that make the change smaller if done before it.
5. **Reuse vs build** — libraries and open-source options considered, and the choice.
6. **Data** — migrations, backfills, seeds, and their order relative to deploys.
7. **Tests** — what proves each behaviour, at which level.
8. **Units** — the breakdown (below).

## Units

Each `U<k>.<n>` gets:

- **Goal** — one line.
- **Files** — cite §3.k.1.
- **Depends on** — other units.
- **Estimate** — in days, review time included.
- **Tier** — per [`../rules/review-tiers.md`](../rules/review-tiers.md).
- **HITL or AFK** — whether a human must decide or act during the build.

A unit is small enough to review in one sitting: aim for a day or less.

Standard units outside the walkthrough's scope get no walkthrough. Put their open design choices to the user as Qs in this phase's rounds instead ([`../rules/review-tiers.md`](../rules/review-tiers.md)).

## Document: `modules/M<k>-<name>/code-plan.md`

```markdown
# M<k> <name> — Code plan (<repo>)

## §3.k.1 Files
## §3.k.2 Types
## §3.k.3 Functions and utilities
## §3.k.4 Refactors first
## §3.k.5 Reuse vs build
## §3.k.6 Data
## §3.k.7 Tests
## §3.k.8 Units
| Unit | Goal | Depends on | Estimate | Tier | HITL/AFK |
```

## Done when

Every file the module touches appears in §3.k.1. Every unit has all six fields. Every standard unit outside the walkthrough's scope has had its design choices answered or parked. Units are in the rollup. The **alignment check** has run, with its result on the checkpoint card.
