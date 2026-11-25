# Phase 1 — Intent

**Why, who, when, and what "done" means.** There is one intent document per plan, shared by every repo and module. There is no code in it and no architecture. Anything technical that comes up goes on phase 2's list.

For size S, keep it short: one or two lines per topic.

## Topics

1. **Problem and why now** — what hurts today, for whom, and what triggers the work now.
2. **Who** — users affected, stakeholders, who decides on scope and on "done".
3. **Outcome** — what is observably different when it ships. At least one criterion someone could check.
4. **Scope** — in, out, and (for XL) which slice is being built now.
5. **When** — the envelope, hard dates, and dependencies on other people's work.
6. **Constraints** — legal, privacy, positioning, compatibility, cost.
7. **Heart** — what part of this is the product's core, where mistakes are most expensive. Confirm or correct the card's proposed deep tier; a change is a D and updates README §0.2.
8. **Risks and unknowns** — what could sink it; what we don't know yet.

## Document: `1-intent.md`

```markdown
# <Plan title> — Intent

## §1.1 Problem and why now
## §1.2 Who
## §1.3 Outcome
## §1.4 Scope
## §1.5 When
## §1.6 Constraints
## §1.7 Heart
## §1.8 Risks and unknowns
```

## Done when

Every topic above is settled (D-id where the user chose), parked (P-id), or N/A with a reason; §1.3 has at least one checkable criterion; the envelope in §1.5 is on the rollup.
