# Phase 2 — System

**The shape of the change, per repo, broken into modules.** Write one document per repo on the card: `system/<repo>.md`, § numbers `§2.r.n`. A module belongs to exactly one repo. Work that spans repos becomes one module per repo, joined by a contract.

Start from Orient's current-state survey reports. Dispatch more research where a topic needs deeper facts; only the questions that depend on a running survey wait for it.

## Topics (per repo)

1. **Current state** — what exists that this touches. Facts from the survey, cited to files.
2. **Shape** — components, data flow, storage, and the contracts between repos (who owns the contract, who conforms). A mermaid diagram if it helps; use top-down layout.
3. **Modules** — `M<k>` with purpose, repo, dependencies on other modules, estimate in days, and slice (now / later).
4. **Sequencing** — build order, what gates what, what can run in parallel, deploy or migration order.
5. **Risks** — the technical risks and the unknowns that decide the shape.

## Document: `system/<repo>.md`

```markdown
# <Plan title> — System: <repo>

## §2.r.1 Current state
## §2.r.2 Shape
## §2.r.3 Modules
| Module | Purpose | Depends on | Estimate | Slice |
## §2.r.4 Sequencing
## §2.r.5 Risks
```

For each module, create `modules/M<k>-<name>/` (empty until phase 3) and add a row to the rollup.

## Done when

Every repo on the card has its document; every topic is settled, parked or N/A; every module has an estimate and a slice; the rollup shows every module; and the **alignment check** has run, with its result on the checkpoint card. A ⚠ is resolved in the user's sign-off reply.
