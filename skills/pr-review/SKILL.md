---
name: pr-review
description: Diligent end-of-cycle PR review gate. Read-only — presents findings to the user, never applies fixes. Use after /pr or whenever you want to vet a branch before merge.
---

# PR Review

Diligent end-of-cycle review for any PR I authored under the standard workflow:

```
/grill-me  →  /write-a-prd  →  /prd-to-issues  →  /tdd  →  /pr  →  /pr-review
```

This is the gate. PRs do not merge until `/pr-review` passes.

## Read-only by default — NEVER apply fixes

This skill **presents findings to the user**. It does not fix things.

- Do NOT edit code, tests, configs, or documentation in response to findings.
- Do NOT push commits, amend commits, or otherwise mutate the branch.
- Do NOT delegate fixes to subagents (e.g. don't dispatch git-master, code-reviewer-with-write-tools, or testing-wizard with instructions to "address findings").
- Subagents spawned during the review (e.g. code-reviewer for parallel audit) are for READING — brief them as analysts, not implementers.

The only writes this skill performs are to scratch files under `/tmp/` (e.g. a findings draft) if needed for organization. Never edit anything inside the working repo.

After presenting findings, **stop and wait**. The user decides what to fix and explicitly authorizes any subsequent work. "Fix all", "address P1 and P2", "implement the cascade test" in chat is the green light. Silence, "thanks", or "noted" is not.

If the user's invocation message itself contains explicit fix authorization (e.g. `/pr-review and fix anything you find`), you may proceed to fixes after presenting findings — but the default for a bare `/pr-review` invocation is read-only.

## When to invoke

- **Always** before merging a PR I wrote autonomously — even if "tests are green."
- When the user types `/pr-review`.
- When I'm about to /pr-merge in a multi-PR run, run /pr-review on each PR first.

## Process

1. Identify the PR. Read its title, body, and the issue number it closes (`Closes #N` or `gh pr view <pr> --json number,closingIssuesReferences`).
2. Read the issue body. Find the parent PRD reference (`## Parent PRD` or similar).
3. Read the PRD body. Note the acceptance criteria, the user stories, the implementation decisions, and the out-of-scope list. The PRD is the contract; the PR is the delivery.
4. Read the diff in full (`gh pr diff <pr>`). Then read the touched files in full — diffs hide context.
5. Spawn the **code-reviewer** agent in parallel with steps 6–8 below for code-level audit. Brief it with the PRD scope and ADR-025 §1/§2.
6. Run grep gates: `grep -rEn 'from "\.\./[^"]*\.service"' src/` outside the owning module's directory must return zero. Service-to-controller cross-module imports must return zero.
7. Audit specifically for the smells below. Be hostile. The PR is guilty until proven innocent.
8. Produce findings. Critical or smell findings → fail. Pass only when all findings are addressed or explicitly accepted by the user.

## Smells to find

### Patch smell
A test was modified alongside the impl it covers. Two questions:
- Was the assertion loosened (`expect(x).toEqual(y)` → `expect(x).toBeTruthy()`)? Loosening an assertion to make a refactor pass is paperwork, not testing.
- Was the test rewritten to verify the new internal shape rather than the same external behavior? Then the test was verifying internals — but the *previous* implementation didn't trip it, so it was either uselessly specific or the new implementation actually broke behavior. Either way, suspect.
- A test that was deleted alongside an impl change is the strongest signal of all. The test failed and someone deleted it. Demand justification.

### Wrapper smell
A controller function whose body is just `return service.X(...args)`. ADR-025 §1 forbids this. The function belongs in the controller proper (move the orchestration up) or in the service proper (drop the wrapper, let callers import from the controller via an explicit re-export — but only for genuinely-leaf service exports that need no orchestration ever).

`Parameters<typeof service.X>` and `ReturnType<typeof service.X>` in the controller's signature is the dead giveaway.

### Hand-wave smell
TODOs, "in-tx exception", "deferred", "tagged", "tracked", "follow-up" comments. These are escape hatches for shortcuts. Flag every one. They almost always mark places where the work was left undone.

A `// TODO(#NN)` is sometimes legitimate. Verify the linked issue exists, has a clear scope, and is in the active backlog. If not, the TODO is permanent debt and the PR should resolve it.

### Hidden mock smell
- `vi.mock('../../shared/db', ...)` in tests that claim to be integration tests.
- Mocked Prisma where the test's purpose is to verify a Prisma constraint.
- Tests that mock the function under test.
- Tests that mock the function the function-under-test calls and then assert "the mock was called with X" — this verifies internals, not behavior.

### Architecture-conformance smell
- `from ".*service"` imports across module boundaries.
- Services importing controllers (sub-module or otherwise).
- Multi-step orchestration inside a `service.ts` file (transaction boundaries, audit logging, cross-cutting concerns).
- Controllers without function definitions — only re-exports.

### Coverage smell
- The PR adds 50 lines of code and 0 lines of test.
- The test file the PR adds asserts only structural things (`expect(result.success).toBe(true)`) without checking the data shape.
- The test happy path passes but no negative test exists for documented error states (404 / 409 / 422).

## Output

```
PR #<n> — /pr-review

Verdict: PASS | FAIL

Critical (must fix before merge):
- [findings]

Smells (must fix or justify):
- [findings]

Architecture:
- [findings]

Coverage:
- [findings]

Notes:
- [non-blocking observations]
```

If FAIL: do not merge. Surface the findings to the user and to the implementing agent. Re-run /pr-review after fixes.

If PASS: green-light merge. State the basis for the pass — do not just say "looks good."

## Bias

The default state of a PR I wrote is "shortcuts were taken somewhere." My job here is to find them. If after a careful audit nothing turns up, say so plainly and pass. Don't manufacture findings to look diligent. But the prior is "find the shortcut," not "this is probably fine."

## Anti-patterns in this skill

- **Skimming**: reading only the diff. Diffs hide regressions in untouched files. Read the touched files in full.
- **Bulk-passing**: passing 10 PRs in a row without finding anything. Either I'm running this on trivial PRs (in which case why am I running it?) or I'm not looking carefully.
- **Self-defense**: writing the review and then arguing why my own choices were correct. Switch posture: I am reviewing someone else's work. The implementer is not me.
- **Ratifying**: matching the framing of the PR description. The PR description tells me what the author *thinks* the change does; the diff tells me what it actually does. Trust the diff.
