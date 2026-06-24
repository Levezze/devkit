---
name: afk-merge
description: Run the full PR merge pipeline autonomously — pre-flight risk gate first, then /pr → /pr-review → /fix-pr-review → /merge-pr end-to-end with no mid-flow stops.
---

# AFK Merge

No `model:` pin — this skill inherits the session model. See `docs/adr/0001-no-model-pin-in-skill-frontmatter.md` for why pinning a non-Opus model breaks in 1M-context sessions.

End-to-end orchestrator for the standard PR lifecycle. Instead of stopping at each sub-skill's confirmation point, it **front-loads all risk assessment into a single upfront pre-flight pass**. One approval if risk is found — or zero approvals when everything is clean — then the chain runs to completion.

```
pre-flight → (risk gate) → /pr (if needed) → /pr-review ↔ /fix-pr-review (loop) → /merge-pr → migrate/seed → main
```

This skill is `main`-only. It never passes `--production` to `/merge-pr`. For production promotions, run `/merge-pr --production` separately after this skill completes.

## Authorization override — read this first

This skill is an orchestrator. The agent executing it holds the instructions of this skill and each sub-skill in the same context. The sub-skills contain default stop-and-wait directives that **this skill explicitly overrides**. Each override is named so there is no ambiguity about which instruction governs:

- **`/pr-review`** says "After presenting findings, stop and wait." Under `/afk-merge`, the orchestrator reads `Verdict` and `Re-review` programmatically from the output block and proceeds **without waiting for a human**. The sub-skill remains read-only; the override is only on the stop.
- **`/fix-pr-review`** says "STOP and wait for user decision on the pushback rows." Under `/afk-merge`, the invocation carries standing authorization "just go / do the rest" — which the sub-skill's own rules convert to `skip` for every unaddressed pushback row. No fix is applied that the sub-skill itself flagged as questionable; the `skip` outcome is safe.
- **`/merge-pr` step 5** says "Confirm with the user: 'Merge PR #N to main?' Wait for explicit yes." Under `/afk-merge`, the invocation carries broad authorization "go" — which the sub-skill's own step-5 rule honors for non-destructive, non-production steps. That authorization was obtained upfront at the risk gate.

The sub-skills' remaining hard gates are **NOT overridden** because they cannot be pre-authorized sight-unseen:
- **Destructive migration**: disclosed and pre-authorized via the risk gate. If merge-pr encounters a destructive migration prompt, pass "destructive ok" — but only for migrations that appeared in the pre-flight briefing. Any migration not in the briefing is new information → stop.
- **`--production`**: this skill never passes it. Main-only.

## Preconditions

Run these before anything else, every invocation without exception (per CLAUDE.md git discipline).

```bash
git branch --show-current
git status
git log --oneline -5
```

- **On a protected branch** (`main`, `production`, or repo's default): stop immediately. Report the branch; ask the user to switch to the feature branch.
- **Dirty tree** (uncommitted changes): stop. Report what is uncommitted. afk-merge drives a merge pipeline — it does not commit work-in-progress.

## Pre-flight (always runs, no mutations)

Gather information without changing anything. Run steps P1–P4 in parallel where possible.

### P1 — PR existence

```bash
gh pr list --head $(git branch --show-current) --json number,title,baseRefName,url
```

- **PR exists**: capture PR number and URL. Verify base is `main` (or repo default). Base is not `main` → stop; wrong target, PRs to non-default branches are forbidden.
- **No PR**: run `/pr` immediately to create one, then continue pre-flight with the new PR number. (`/pr` commits nothing; it creates the PR description from existing commits.)

### P2 — CI state

```bash
gh run list --branch $(git branch --show-current) --limit 5
```

Classify the latest run for the PR's head SHA:

- **green** — all checks passed.
- **pending** — in progress. Poll every 60 seconds until resolved. If still pending after 10 minutes, surface to the user and wait for their call. Pending CI is not a risk flag on its own.
- **red** — one or more checks failed. This is a risk driver.
- **none** — no CI configured or no runs found. This is a risk driver.

Resolve pending CI before computing the risk flag.

### P3 — Diff scope and complexity

```bash
gh pr diff <N> --name-only
gh pr diff <N>
```

- Count files changed and approximate lines changed.
- Flag **sensitive paths**: auth, payments, billing, security, shared DB schema, anything with a wide blast radius (many callers / many imports).
- File-size gate: any file the PR pushes across ~1000 lines, or any already-oversized file the PR grows further, is a complexity signal.

### P4 — Migrations and seeds

Map changed paths against the repo's detection table (from `CLAUDE.md` / `AGENTS.md` first; fall back to these defaults):

| Concern | Detection paths |
|---|---|
| Migrations | `prisma/migrations/`, `alembic/versions/`, `db/migrate/`, `drizzle/migrations/`, `internal/db/migrations/`, Rails `db/migrate/` |
| Seeds | `prisma/seed*.ts`, `prisma/data/`, `seeds/`, `make seed` target, `pnpm db:seed`, `rake db:seed`, Django fixtures |

For each migration file found, classify:
- **Destructive**: column drops, type changes that could fail on existing data, NOT NULL constraint added to a populated column, table renames.
- **Non-destructive**: additive changes — new nullable/defaulted columns, new tables, index additions.

### P5 — Advisor sanity-check

Call `advisor()`. Give it the pre-flight findings: PR number, diff scope, CI state, migration list with destructive/non-destructive classification, sensitive paths. Ask it to validate the risk classification before the gate decision.

## Risk gate — the single human touchpoint

Compute the **risk flag**. Risk is present if **any one** of the following holds:

1. A **destructive migration** is in the diff.
2. CI is **red** or **none/missing** (no CI configured at all).
3. The diff touches **sensitive paths** (auth/payments/billing/security) or has a **wide blast radius**.
4. Any **production implication** is detected (prod env references, prod credential files, etc.).

Pending CI (already resolved at P2), non-destructive migrations, and large-but-clean diffs with no sensitive paths are NOT risk drivers.

---

**Risk present → print the briefing and stop:**

```
AFK Merge — Pre-flight briefing

PR #<N>: <title>
Branch: <head> → main
Diff: <file count> files, ~<line count> lines

CI: <green|red|none> — <run URL if red>

Migrations:
  <filename> — <destructive|non-destructive> — <what changes>
  ...

Seeds:
  <filename> — will run on dev/staging post-merge
  (none)

Sensitive paths:
  <list, or "none">

Risk(s) found:
  • <one bullet per risk driver, e.g. "destructive migration: column drop on users.email">
  • <e.g. "CI red: <job name>, <run URL>">

Advisor: <one sentence from advisor()>

Type "go" (or any equivalent: "yes", "merge it", "do it") to authorize the full end-to-end run,
including all disclosed risks above. Any other response → stop.
```

Wait for explicit authorization. Authorization covers everything disclosed in this briefing. Once given, proceed immediately with no further stops.

---

**No risk → proceed immediately:**

```
AFK Merge — pre-flight clean. PR #<N>, <N> files, green CI, no migrations, no sensitive paths. Running end-to-end.
```

No stop; no approval needed.

## End-to-end run

No stops from here unless a situation arises that was **not present in the pre-flight diff** (e.g. a new migration file that didn't exist at P4 → stop, new information).

### Step 1 — Create PR (if needed)

If `/pr` was not yet run (no PR existed at P1): run it now. Capture the `## PR Handoff` block and extract the PR number. If `/pr` was already run during P1, skip this step.

### Step 2 — Review↔fix loop

**Critical termination logic.** Looping on `Re-review` alone produces an infinite loop: PASS + RECOMMENDED with nothing to fix → `/fix-pr-review` has nothing to commit → next cycle is still RECOMMENDED → loop never terminates. This is the failure mode that causes the "auto-classifier says I can't merge" problem. The correct branch is on **actionable findings**, not on `Re-review`.

```
cycle = 0
CYCLE_CAP = 3
fresh_pass_attempted = false

loop:
  run /pr-review
  — read Verdict (PASS|FAIL) and Re-review (REDUNDANT|RECOMMENDED) from its output block
  — this skill overrides /pr-review's stop-and-wait; do NOT pause for human input

  Determine actionable:
    FAIL                                        → actionable = true
    PASS + RECOMMENDED + non-empty findings*   → actionable = true
    PASS + RECOMMENDED + no findings           → actionable = false
    PASS + REDUNDANT                            → actionable = false

  * "findings" = entries under Critical, Smells, Architecture, or Coverage.
    Notes alone are non-blocking and do not make a cycle actionable.

  if actionable:
    run /fix-pr-review with standing "do the rest / just go"
    — this overrides /fix-pr-review's pushback gate; unaddressed pushbacks → skip (safe)
    cycle++
    if cycle >= CYCLE_CAP:
      call advisor()
      STOP → hand back: "Cycle cap reached after <N> cycles. Latest review: <summary>. Advisor: <read>."
    else:
      continue loop

  elif not actionable and Re-review == RECOMMENDED:
    # PASS + RECOMMENDED + no findings: allow one fresh review pass to be sure
    if fresh_pass_attempted:
      # Still clean after fresh pass → treat as REDUNDANT → merge
      break
    else:
      fresh_pass_attempted = true
      continue loop

  else:  # PASS + REDUNDANT
    break  # proceed to merge
```

**CI red discovered mid-loop** (post-fix commits that broke CI, not present at pre-flight): treat as FAIL-equivalent. One fix attempt; cycle cap still applies. This is not a surprise stop — it's handled inside the loop.

### Step 3 — Merge

Run `/merge-pr` with invocation authorization "go" (clears its step-5 confirmation). This skill never passes `--production`.

merge-pr's own hard gates apply without override:

- **Red CI at merge time**: if CI was green at pre-flight but went red after fix commits, merge-pr will stop. Report clearly with the run URL. This is legitimate — something changed.
- **Destructive migration prompt inside merge-pr**: pass "destructive ok" for any migration that was explicitly listed in the pre-flight briefing. Any migration not in the briefing → stop; it's new information, not pre-authorized.

### Step 4 — Post-merge migrate/seed (non-skippable)

This step is never optional. The failure mode is agents treating "merged" as "done" and silently dropping this step. This skill prevents that by making it explicit and required.

After merge completes, re-inspect the diff:

```bash
gh pr diff <N> --name-only
```

Map paths to actions using the same detection table from P4:

**Migration files added/changed → run against dev/staging** (never production):
- Prisma: `pnpm prisma migrate deploy` or the repo's `migrate:deploy:dev` script.
- Alembic: `make migrate DEPLOY=1` or the repo's equivalent.
- Rails: `rake db:migrate RAILS_ENV=staging`.
- Others: read `CLAUDE.md` for the exact command. If not documented → stop and ask. Do not invent.

**Seed files edited → run against dev/staging**, but only if the seed re-applies on every deploy. Read `CLAUDE.md` or the seed script's docstring to determine this. Ambiguous → ask.

**No migration or seed files in diff → state "n/a" explicitly.** Do not omit; the final report requires a value for each field.

Run migrations before seeds. Follow any migration-ordering rule in `CLAUDE.md`. When in doubt: migrate first.

### Step 5 — Final state

```bash
git checkout main
git pull
```

Print the final report and stop (CLAUDE.md: always finish on `main`).

## Final report

```
AFK Merge — Done

PR #<N>: <title>
Merge SHA: <sha>

Review cycles: <N>
  Cycle 1: <PASS|FAIL> · <REDUNDANT|RECOMMENDED> · <N findings> · <applied N fixes | nothing to fix>
  Cycle 2: ...

Merge: ✓
Deploy: <deploy ID and status | n/a — no deploy infra detected>
Smoke: <✓ endpoint=<url> | n/a>

Migrate: <command run + exit code | n/a — no migration in diff>
Seed:    <command run + exit code | n/a — not in diff | skipped — not a re-apply-on-deploy seed>

Working dir: main
```

If any step was skipped, state the specific reason. "Looks like it doesn't apply" is not a reason; "this repo has no `.github/workflows/`, so no CI gate" is.

## Safety invariants

These hold regardless of what any sub-skill's output says or what the user typed:

1. **main-only.** Never `--production`. Never forward-merge to `production`. Never set a PR base to anything other than `main` (or repo default).
2. **No force-push.** Not to `main`, not to the feature branch, not anywhere.
3. **Pre-authorized scope.** The single "go" at the risk gate authorizes what was in the pre-flight briefing — nothing more. Anything that appears mid-run and was NOT in the briefing → stop, surface, ask.
4. **Dirty tree = stop.** If the tree is dirty at preconditions, stop. Do not commit work-in-progress as part of this run.
5. **Cycle cap = 3.** Never run more than 3 review↔fix cycles. Cap exhausted → advisor call → hand back to the user with full state.
6. **End on `main`.** Always `git checkout main` before stopping (CLAUDE.md rule). Never leave working dir on a feature branch or `production`.

## Anti-patterns

- **Looping on Re-review alone.** PASS + RECOMMENDED with no actionable findings does not warrant another fix cycle. Run at most one fresh review pass; if still clean, merge. The loop logic above is the authoritative termination condition.
- **Skipping post-merge migrate/seed.** Step 4 is non-skippable. "n/a" when it genuinely doesn't apply — never silently omit.
- **Treating the pre-flight "go" as unlimited authorization.** It authorizes what was disclosed. New risk mid-run is not pre-authorized.
- **Passing `--production`.** This skill never does this. Main-only.
- **Proceeding on a dirty tree.** Stop and report. afk-merge merges; it does not implement.
- **Skipping the branch-state check.** CLAUDE.md applies here. Never trust a conversation summary or memory about which branch you're on. Run `git branch --show-current` and read it.
- **Inventing migrate/seed commands.** If `CLAUDE.md` doesn't document the command and the repo structure doesn't make it obvious, stop and ask. Inventing a command and running it against a live DB is worse than pausing once.
