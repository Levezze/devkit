# Phase 4 — Walkthrough

**Walk the code before writing it.** For each unit in scope, write pseudocode for its real paths, then put the decisions the pseudocode exposes to the user. This is where "why are we writing this at all?" surfaces. When it does, revise the code plan in place ([`../rules/rounds.md`](../rules/rounds.md) *Going back*).

The start card sets the scope: **deep units only**, **deep + standard**, or **every unit**. For L and XL, a drafter subagent per module can write the first pass of pseudocode. You own the questions and the edits.

## Per unit

1. **Pseudocode** — the main path, then each edge path. Keep it close enough to the code that a reviewer can check it against the diff later. Name real functions and files.
2. **Manual vs generated** — what is hand-written, and what is produced from something else (codegen, a schema, a migration tool, a library).
3. **Edge cases** — inputs, states, concurrency, failure, retries.
4. **Test cases** — named, each one a behaviour that someone would notice breaking.
5. **Questions** — every choice the pseudocode forced, asked in rounds with a recommendation.
6. **Estimate** — revise it if the walk changed it, and update the rollup.

## Document: `modules/M<k>-<name>/walkthrough.md`

```markdown
# M<k> <name> — Walkthrough

## §4.k.u U<k>.<u> <unit name>
### Pseudocode
### Manual vs generated
### Edge cases
### Test cases
### Questions   (Q-ids → D-ids / P-ids, one line each)
### Estimate    (unchanged | was → now, and why)
```

## Done when

Every unit in scope has all six headings filled. Every question is answered (D) or parked (P). Every revision to an earlier phase is marked and listed on the checkpoint card. The rollup reflects any revised estimates. The alignment check has run, with its result on the card.
