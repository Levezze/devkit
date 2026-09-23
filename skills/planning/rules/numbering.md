# Numbering

Every section heading carries a § number, and every decision, question and piece of work carries an ID. That lets humans and agents cite exact places without line numbers.

## § numbers

The first digit is the phase:

| Document | § pattern | Example |
|---|---|---|
| `README.md` | §0.n | §0.3 Rollup |
| `1-intent.md` | §1.n(.m) | §1.4.2 |
| `system/<repo>.md` | §2.r.n — r = the repo's position on the card | §2.2.3 (second repo) |
| `modules/M<k>-<name>/code-plan.md` | §3.k.n | §3.2.8 (module 2) |
| `modules/M<k>-<name>/walkthrough.md` | §4.k.u — u = the unit's number | §4.2.3 walks U2.3 |

Headings look like `## §3.2.5 Refactors`. The fixed sub-headings inside a walkthrough unit (`### Pseudocode`, …) carry no § of their own. Cite them as `§4.2.3 Pseudocode`.

- **Assigned once, never reused, never renumbered.** A new section takes the next free number, even if it sits earlier on the page. Walkthrough §s are the exception: they are keyed to their unit, so gaps are expected where units are out of scope.
- A removed section keeps its heading, as `## §3.2.4 (removed — D-12)`, so old citations still resolve. Renaming a section or unit changes the text only, never the §.
- Across documents, cite file and §: `system/api.md §2.1.3`.

## IDs

| ID | What | Home |
|---|---|---|
| `D-n` | decision | one-line entry in README §0.4, pointing at the § where it is argued |
| `Q-n` | question | README §0.5 while open; asked in a round; answered → `→ D-n` |
| `P-n` | parked / deferred on purpose | README §0.6 |
| `M<k>` | module (one repo each) | defined in a system doc; has its own folder |
| `U<k>.<n>` | unit of work in module k | defined in the module's code plan §3.k.8 |

Each prefix keeps its own counter across the whole plan, and IDs are never reused. D-1 onward are the approved start card's values. Commits, issues and PRs cite IDs (`U2.3`, `D-7`) so the work traces back to the plan.
