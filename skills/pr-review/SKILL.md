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

The only writes this skill performs are to scratch files under `/tmp/` (the findings files described below). Never edit anything inside the working repo.

After presenting findings, **stop and wait**. The user decides what to fix and explicitly authorizes any subsequent work. "Fix all", "address P1 and P2", "implement the cascade test" in chat is the green light. Silence, "thanks", or "noted" is not.

If the user's invocation message itself contains explicit fix authorization (e.g. `/pr-review and fix anything you find`), you may proceed to fixes after presenting findings — but the default for a bare `/pr-review` invocation is read-only.

## Findings files (append-as-you-go, not write-at-end)

Long reviews truncate at two boundaries: the sub-agent → parent tool-result boundary, and the parent → user message boundary. To survive both, this skill streams findings into `/tmp/` files as it audits. The user-facing Output block is the *last* step, synthesized from those files.

Compute a single timestamp at the start of the run: `TS=$(date -u +%Y%m%dT%H%M%SZ)`. Use it for all three paths below.

- `/tmp/pr-review-<pr#>-<TS>-main.md` — the parent's own audit (steps 6–8). Created and appended-to by the parent.
- `/tmp/pr-review-<pr#>-<TS>-subagent.md` — the code-reviewer sub-agent's audit. Created and appended-to by the sub-agent via its `OUTPUT_FILE` protocol.
- `/tmp/pr-review-<pr#>-<TS>-codex.md` — the raw `codex review` transcript, if a Codex run was launched at step 0. Written by the shell redirect, not by an agent.
- `/tmp/pr-review-<pr#>-<TS>-final.md` — the synthesized Output block, written by the parent at step 8 *before* echoing it to chat. Include this path in the chat output so the user can recover the full review if the chat message itself truncates.

Each file uses a fresh timestamp, so prior runs are preserved and can be inspected or resumed.

## When to invoke

- **Always** before merging a PR I wrote autonomously — even if "tests are green."
- When the user types `/pr-review`.
- When I'm about to /pr-merge in a multi-PR run, run /pr-review on each PR first.

## Process

0. Compute the run timestamp: `TS=$(date -u +%Y%m%dT%H%M%SZ)`. Compute the three file paths (`-main.md`, `-subagent.md`, `-final.md`) per "Findings files" above. Create the main file with this canonical skeleton — agents and the resume mechanism rely on the exact section names:

   ```markdown
   # /pr-review PR #<n> — main audit

   - PR: <owner/repo>#<n> — <title>
   - Branch: <head ref>
   - Timestamp: <TS>

   ## Grep gates

   ## Files reviewed

   ## Findings (append as discovered)

   ## Synthesis notes
   ```

   **Then kick off Codex first (Claude Code only, when available).** Launch it in the **background now** so it audits in parallel with this whole review (zero added wall-clock). Use the raw `codex` CLI — not a `/codex:review` slash command — via `Bash(run_in_background: true)`:

   ```bash
   cd <worktree-abs-path> && codex -C <worktree-abs-path> review --base origin/main \
     > /tmp/pr-review-<pr#>-<TS>-codex.md 2>&1
   ```

   Four things about that line, each of which has cost a review run:

   - **`-C` is a *global* flag, so it goes before `review`.** `codex review -C <dir>` is not valid — the `review` subcommand's only flags are `--base`, `--commit`, `--uncommitted`, `--title`, `--enable`, `--disable`, and `-c`. Same for `-m/--model`. Belt-and-braces the `cd` as well: codex otherwise resolves `process.cwd()` = the ROOT repo, not the worktree you may be logically in, and reviews the wrong tree.
   - **`--base` is mandatory — there is no auto-diff.** Omitting it prints `Error: Specify --uncommitted, --base, --commit, or provide custom review instructions` and **exits 0** with zero review output. Use `origin/main`, not `main`: a worktree's local `main` ref is routinely stale or absent.
   - **`--background` is not a flag on this CLI.** Background it with `Bash(run_in_background: true)` and redirect to a file; there is no wrapper stdout to read.
   - **Redirect stderr (`2>&1`).** The failure modes below announce themselves on stderr and are invisible otherwise.

   Record the output path for step 8. If `codex` is not on PATH (or this skill is itself running under Codex/Cursor), skip silently — `/pr-review` is fully self-sufficient without it. Codex output is **input** to the synthesis, never an auto-block.

   **A dead codex run is indistinguishable from a clean one unless you check. Exit code will not tell you** — exit 0 has been measured on two separate failure modes. Before counting Codex as having participated, verify all three:

   | check | a real run | a dead run |
   |---|---|---|
   | duration | minutes | seconds |
   | `grep -E '"status":4[0-9][0-9]\|Specify --uncommitted' <file>` | no match | matches |
   | a verdict sentence in the file | present | absent — the transcript is just the system prompt and tool preamble, which reads as "reviewed, found nothing" |

   A `400 … requires a newer version of Codex` in the tail means the config's default model is not accepted by the installed CLI. Fix it by pinning `-m <model>` **before** `review`, choosing a model the local `~/.codex/config.toml` shows this install accepts — its `[tui.model_availability_nux]` and `[notice.model_migrations]` tables name them. Do not assert that any model name is invalid; the CLI version is the moving part, and a name that 400s at one version works at the next.
1. Identify the PR. Read its title, body, and the issue number it closes (`Closes #N` or `gh pr view <pr> --json number,closingIssuesReferences`).
2. Read the issue body. Find the parent PRD reference (`## Parent PRD` or similar).
3. Read the PRD body. Note the acceptance criteria, the user stories, the implementation decisions, and the out-of-scope list. The PRD is the contract; the PR is the delivery.
4. Read the diff in full (`gh pr diff <pr>`). Then read the touched files in full — diffs hide context.
5. Spawn the **code-reviewer** agent in parallel with steps 6–8 below for code-level audit. The brief MUST include:
   - The PRD scope and any project-specific architectural constraints relevant to the diff (e.g. controller/service boundary rules if the repo has them).
   - A literal line `OUTPUT_FILE: /tmp/pr-review-<pr#>-<TS>-subagent.md` so the agent streams findings to disk per its protocol.
   - An explicit reminder that the agent must return ONLY a short status (path + per-severity counts + verdict), not the findings themselves.
6. Run grep gates. Append a one-line result for each gate to the `## Grep gates` section of the main file as the gate runs — do not batch.
   - **File-size gate (universal, always run).** For each file the PR touches, compare its line count before and after the change. Flag any file the PR pushes *across* ~1000 lines (≤1000 on the base ref, >1000 on the head ref), plus any already-oversized file the PR grows further. Crossing is a decomposition smell, not an auto-fail — the finding is "this file crossed ~1k lines; decompose first, or is there a compelling structural reason to keep it whole?" Helper to compute the per-file before/after delta:
     ```bash
     BASE=$(gh pr view <pr> --json baseRefName -q .baseRefName)
     for f in $(gh pr diff <pr> --name-only); do
       [ -f "$f" ] || continue   # skip deletions
       before=$(git show "origin/$BASE:$f" 2>/dev/null | wc -l | tr -d ' ')
       after=$(wc -l < "$f" | tr -d ' ')
       awk -v b="${before:-0}" -v a="$after" -v f="$f" \
         'BEGIN{ if (a>1000) printf "%s: %d -> %d%s\n", f, b, a, (b<=1000?"  <-- CROSSED 1k":"") }'
     done
     ```
     Append the crossed/oversized files (or "none") to `## Grep gates`.
   - **Repo-specific architectural gates.** Run any gates relevant to the repo (e.g. cross-module service imports for projects with a controller/service split).
7. Audit specifically for the smells below. Be hostile. The PR is guilty until proven innocent. As you open each touched file for review, append its path to `## Files reviewed` *before* auditing it — this is the coverage log the resume mechanism reads. **Append each finding to `## Findings` as it is discovered**, one finding per `Edit` call, in the form `- file:path:line — <category> — <severity> — <note>`. Do not hold findings in conversational memory and dump them at the end.
8. Produce findings. Read both the main file and the sub-agent file from disk. **If a Codex review was launched at step 0, run the three liveness checks from step 0 against its output file before reading it for content** (wait for it to finish if still running — it ran in parallel, so it is usually done by now). A run that fails any of them is discarded as `Codex: dead run, discarded`; do not fold its zero findings in as agreement, because an absence of findings in a dead transcript is not a clean bill of health. If it passes, fold its findings into the synthesis, deduped against your own and the sub-agent's and labeled by source (Codex independently raising a point you also found is strong signal; a Codex-only finding still gets the same hostile scrutiny — read the file before agreeing). If Codex reviewed the wrong tree (no overlap with the PR diff — the classic worktree-cwd miss), say so and discard it rather than fold in noise. Synthesize the user-facing Output block (see "Output" below) and write it to the `-final.md` file *before* echoing it to chat — that file is the durable artifact if the chat-side message truncates. Critical or smell findings → fail. Pass only when all findings are addressed or explicitly accepted by the user.

### Resuming an interrupted review

If a prior `/pr-review` run was killed mid-flight, its partial `/tmp/pr-review-<pr#>-<TS>-main.md` and possibly `-subagent.md` are still on disk. To resume:

- The user pastes the partial file path (or just the `<pr#>-<TS>` stem) back into chat with an instruction like "resume from this".
- Read the partial file. Use the `## Files reviewed` section as the coverage log — files listed there have been audited (clean audits leave findings empty but the path still appears). Continue with files not on that list, appending to the *same* file. Do not start a new timestamped run — that would orphan the partial work.
- The `## Files reviewed` log is best-effort: if the previous run crashed mid-file (path logged but audit not finished), re-auditing that file on resume is cheap insurance. Prefer redundant work over missed coverage.
- The sub-agent can be resumed the same way: pass the existing `-subagent.md` path as `OUTPUT_FILE:` and instruct it to read what's already there and continue.

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

## Empirical verification gate — claims of non-existence/invalidity

You have a training cutoff; current reality is past it. Any finding — yours, the sub-agent's, or Codex's — that claims **syntax error**, **doesn't exist / nonexistent**, **invalid API/model/version**, or **can't import / can't work** MUST be proven by tool execution before it appears in the output. Run it: `py_compile` (or the language's compiler), execute the snippet, run the cited test. No execution → the finding does not ship.

Hard cross-check: **if the PR's test suite is green, an import-breaking or syntax-error claim is false on its face** — the module already imported to run those tests. Flag the contradiction ("Codex says SyntaxError, but the suite is green — discarded after `py_compile` confirmed valid") instead of folding the finding in. This applies with full force to Codex/sub-agent findings during synthesis: independent corroboration of an *unverified* non-existence claim is two models sharing the same stale cutoff, not signal. A model name the author wrote or that lives in the codebase is assumed real — never flag it as nonexistent.

## Re-review recommendation

Separate from the PASS/FAIL verdict, judge whether a **second, fresh review pass adds value** or is wasted effort. This is not the same as the mandatory re-review-after-fixes on a FAIL (that always happens). It answers: given what this review actually saw, how much should the user trust a *single* pass before merging?

Output one of two recommendations with **reasoning that cites the three drivers**:

- **REDUNDANT** — a second pass would almost certainly surface nothing new. Merge on this review.
- **RECOMMENDED** — coverage confidence is low enough that an independent pass (after fixes, or by a fresh reviewer/agent) is worth the cost before merge.

Weigh three drivers. Any one can push to RECOMMENDED on its own; they compound.

1. **Issue count & severity.** Many findings — especially Criticals or Smells — mean the PR is churny and the fix pass will mutate it substantially; the post-fix state is effectively unreviewed → RECOMMENDED. Zero or a few trivial Notes → leans REDUNDANT.
2. **Complexity.** Core/auth/payments/billing, DB migrations, concurrency/transactions, security-sensitive paths, or wide blast radius (a change many call sites depend on) → RECOMMENDED even if this pass came back clean — clean-on-complex is exactly where a single reviewer misses things. Mechanical, docs, config, isolated/leaf changes → leans REDUNDANT.
3. **Size.** Large diffs (rough guide: many files touched, several hundred+ changed lines, or any file crossing the ~1k gate) lower per-line attention and raise the odds of an unreviewed corner → RECOMMENDED. Small, tight diffs → leans REDUNDANT.

State the call as a real judgement, not a checkbox sum — e.g. "RECOMMENDED: 3 Smells in a migration + transaction path; fixes will rewrite the hot section and the diff is 600+ lines across 14 files — one pass is not enough confidence." Or "REDUNDANT: 1 doc typo, 40-line config-only diff, no logic — a second pass would find nothing."

## Output

Write the block below to `/tmp/pr-review-<pr#>-<TS>-final.md` first, then echo it to chat. End the chat message with a line `Full review: /tmp/pr-review-<pr#>-<TS>-final.md` so the user can recover the unabridged version if the chat-side message truncates.

Tag each finding that originated from (or was corroborated by) Codex with a trailing `(Codex)` / `(Codex + self)` so the reader sees independent agreement at a glance. If a Codex review ran, add a one-line `Codex: <n> findings folded / dead run, discarded / wrong-tree, discarded / not available` to the Notes section so its participation is explicit. Never omit this line when a run was launched — a silently-dropped Codex run is how "reviewed by two readers" gets asserted on the strength of one.

```
PR #<n> — Review

(Do not include any leading slash-command token like `/pr-review` in this output. The user pastes review output back into other sessions and a leading slash would be re-interpreted as a skill invocation.)

Verdict: PASS | FAIL

Re-review: REDUNDANT | RECOMMENDED — <one-line reasoning citing issue count/severity, complexity, and size>

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
