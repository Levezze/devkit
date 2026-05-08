---
name: fix-pr-review
description: Reconcile and apply fixes from one or more external PR reviews plus my own /pr-review output. Scrutinizes findings, voices pushback only when warranted, applies the rest end-to-end (edits → build → test → commit → push).
x-devkit-model-tier: highest
model: best
effort: xhigh
---

# Fix PR Review

Model tier: Use the highest available model and reasoning tier for this skill.

Companion to `/pr-review`. After I've run `/pr-review` myself and pasted back one or more **external** PR reviews (Codex, another Claude, a human reviewer's structured comment block), this skill reconciles all reviews, applies the fixes, and pushes the updated branch.

```
/grill-me  →  /write-a-prd  →  /prd-to-issues  →  /tdd  →  /pr  →  /pr-review (mine + external)  →  /fix-pr-review
```

## Inputs — both already in context

1. **External review(s)**: the user pastes one or more external reviews in the same message that invokes `/fix-pr-review`. Treat every block of review-shaped text in that message as external review input. Multiple reviews from different reviewers (Codex + a human, two Claudes, etc.) are normal — reconcile all of them.
2. **My own `/pr-review` output**: assumed already present earlier in this conversation. Find it in scrollback. If it is genuinely not in context, say so plainly and stop — do not fabricate one and do not silently skip the reconcile step. Ask the user to run `/pr-review` first or to paste it.

If the invocation message contains no external review text, stop and ask. The skill is pointless without external input.

## Branch protection

NEVER commit or push to `main`, `demo`, or `production`. If `git rev-parse --abbrev-ref HEAD` returns one of these, stop and surface the situation. Only proceed on a protected branch if the user EXPLICITLY instructs you to in this message.

## Process

### 1. Read everything before deciding anything

- Re-read the diff of the open PR in full (`gh pr diff <pr>`), not just the files external reviewers cited. External reviewers see only the diff; you see the touched files in full and that often resolves whether a finding is real.
- Read every file referenced by any finding in full. Do not act on a finding from a snippet.
- If the PR closes an issue, re-read the issue and the parent PRD. The PRD is the contract — a finding that pushes scope beyond the PRD is itself suspect.

### 2. Build the unified findings table

Merge findings from all reviews into one list. For each finding capture:

- **Source(s)**: which reviewer(s) raised it. Two reviewers raising the same point independently is strong signal.
- **Claim**: what the reviewer says is wrong.
- **Evidence**: file + line(s) the claim points at.
- **Verdict** (yours, after scrutiny): `agree` / `pushback` / `clarify`.
- **Root cause** (if `agree`): the underlying reason, not just the symptom. Fixing the symptom without naming the cause produces hand-wave fixes.

Deduplicate. If two reviewers describe the same issue at different abstraction levels, collapse into one row.

### 3. Decide pushback per finding — narrow threshold

**Default to fix.** Voice pushback only when the cost of complying is real and the finding has a defect.

Pushback is warranted when:

- The reviewer **misread the code**. The claim is factually wrong against the file as it exists.
- Complying would **regress documented behavior** (a test, an ADR decision, or an explicit PRD line).
- Complying would **violate an architecture rule** (e.g. ADR-025 §1/§2, server-owned state, the umbrella/controller-only pattern). Project-specific rules live in the repo's `CLAUDE.md` and `docs/decisions/`.
- The change is **out of PRD scope** and would meaningfully expand the PR. Flag rather than silently absorb.
- The reviewer **disagrees with itself** across two findings, or with the other reviewer, and choosing one side has consequences.
- The "issue" is **intentional** per a comment, ADR, or recent decision in conversation.

Pushback is NOT warranted for:

- Style, naming, ordering, or formatting nits.
- Coverage gaps — add the test.
- Smells flagged in `/pr-review` (patch, wrapper, hand-wave, hidden mock, architecture-conformance, coverage). These are fix-targets; that's why they're listed.
- "Could be cleaner" suggestions that don't change behavior. If the suggestion is reasonable and small, just apply it.
- Disagreement between two reviewers on a stylistic call. Pick one and move on.

If after scrutiny **every** finding either resolves to `agree` or is a trivially addressable nit, **do not pre-announce pushbacks just to look thorough.** Skip the pushback section and proceed to fixes.

### 4. Voice pushbacks — only if non-empty

If and only if the unified table contains `pushback` rows, present them to the user **before** any edits, in this shape:

```
Pushback on N finding(s):

1. [Reviewer(s)] — [one-line claim]
   Evidence reviewer cited: <file:line>
   Why I'm pushing back: <root reason — misread / regression / ADR violation / out-of-scope / etc.>
   Recommendation: <skip | partially apply scoped to X | escalate to follow-up issue>

2. ...
```

Then STOP and wait for user decision on the pushback rows. The user can override ("apply anyway"), accept the pushback ("skip"), or scope down ("apply just the rename, not the refactor"). Apply their decision, then proceed.

The pushback gate halts execution even under auto mode — pushback means user input is required, by design. Do not "optimize" the gate away. If the user tells the skill to proceed without addressing pushback rows individually (e.g. "just go" / "do the rest"), treat each unaddressed pushback row as `skip` (accepted) and move on.

If the table contains zero `pushback` rows, do not produce this section at all. Move directly to step 5 with a one-line summary like: `Reconciled N findings across M reviews — no pushback. Applying fixes.`

### 5. Apply fixes

For each `agree` finding, in order from most-load-bearing to least:

- **TDD by default for non-trivial fixes.** If a fix changes runtime behavior or adds a code path, write the failing test first (RED), then the minimum change to make it pass (GREEN). Use the `/tdd` skill discipline. Skip TDD only for: pure renames, comment/doc edits, dead-code removal, and visual-only frontend tweaks.
- Fix the **root cause**, not just the line the reviewer pointed at. If two findings share a cause, one fix covers both.
- Do **not** loosen or delete tests to make a finding go away. If a test was wrong, replace it with one that verifies the actual behavior and call out the swap explicitly in your commit message.
- Do **not** introduce backwards-compat shims, feature flags, or "// removed" tombstones for code you delete in this round. Just delete.

### 6. Verify

Run the repository's configured verification gates before commit. Detect them from project files instead of assuming a package manager:

1. Read the repo instructions (`CLAUDE.md`, `AGENTS.md`, README, package scripts, Makefile, pyproject, etc.) for required build/test/lint commands.
2. Prefer the repo's broadest cheap deterministic gates: build/typecheck, unit/integration tests, then lint/format checks.
3. If the repo has no configured gate for a category, mark it `n/a` in the final summary instead of inventing one.
4. Run e2e only when the change touches request-path code, query shape, env wiring, browser behavior, or another path the repo instructions say requires e2e.

If any gate fails, fix the failure (root cause, not by neutering the test) and re-run the relevant gate. Do not commit on red. Run auto-fix commands only when the user has authorized auto-fixes or the repo instructions explicitly make them part of the normal workflow.

### 7. Commit

Use the **`/git-commit` skill** (which dispatches the `git-master` subagent). One commit covering this review round. Conventional commit format. No AI watermarks, no `Co-Authored-By: Claude` lines, no bot attributions. Match the branch prefix to the commit prefix (`fix/*` → `fix:`, `feat/*` → `feat:`).

Commit message body should reference the review round and the load-bearing fixes — not enumerate every line touched. Example body line: `Addresses Codex + self-review on PR #N: dedup snapshot lookup, plug missing 404 path, add cascade-cycle test.`

If `/git-commit` reports nothing to commit (e.g. all findings resolved to pushback and the user accepted), stop here. Don't create empty commits.

### 8. Push

Push the new commit(s) to the remote tracking branch. This updates the open PR. No `--force`, no `--no-verify`. If the push is rejected (remote has commits the local branch doesn't), stop and surface the situation — do not auto-rebase or auto-merge.

After push, output a one-block summary:

```
/fix-pr-review — PR #<n>

Reviews reconciled: <N>  (<sources>)
Findings: <total> — applied <a> / pushed back <p> / skipped per user <s>
Commit: <sha> <subject>
Pushed: <branch> → origin
Build: ✓   Test: ✓   Lint: ✓   E2E: ✓ | n/a
Open: <PR url>
```

## Anti-patterns in this skill

- **Rubber-stamping the external reviewer.** External reviews are not authoritative; they are input. A confident-sounding finding can still be wrong. Read the file before agreeing.
- **Manufacturing pushback.** Pushing back on every review to look critical is the same failure mode as rubber-stamping, mirrored. If everything resolves to `agree`, that's fine — say so and fix.
- **Symptom-fixing.** Editing exactly the line the reviewer pointed at without understanding the root cause. The fix often belongs one or two layers up.
- **Patch-test cheating.** Loosening an assertion or deleting a test because the new behavior makes it red. The test was either right (your fix is wrong) or already bad (replace it, don't quietly mutate it).
- **Stacking unrelated cleanups.** This commit addresses the review round. Don't fold in refactors, dependency bumps, or drive-by renames the reviewer didn't raise. Open a separate branch for those.
- **Hard-coding verification commands.** This skill is global. Do not assume `pnpm`, Jest, Vitest, Biome, or e2e scripts exist. Detect and run the repo's actual gates.
- **Silent stance flips.** If during fixes you discover the reviewer was wrong on something you initially marked `agree`, stop, surface it, and reconcile — don't silently downgrade it to `skip` mid-implementation.
