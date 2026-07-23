---
name: afk-merge
description: "Run the full PR merge pipeline autonomously — pre-flight risk gate first, then /pr → /pr-review → /fix-pr-review → /merge-pr end-to-end with no mid-flow stops. Re-entrant: survives /compact by writing a run-state file and resuming from it."
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

## Run-state file

This skill writes a run-state file so a fresh agent can resume after a `/compact` without losing position or re-asking for authorization.

**Path:** `/tmp/afk-merge-<repo>-PR<N>.md`  
where `<repo>` = `basename $(git rev-parse --show-toplevel)` and `<N>` = PR number.

**Written at:** P0 (before any mutation). Updated at each step. Marked `status: DONE` at Step 5.

**Format:**
```
<!-- afk-merge run-state -->
status: ACTIVE
procedure: afk-merge
pr: <N>
branch: <branch>
repo: <repo>
worktree: <absolute path to git worktree — omit if not in a worktree>

next-action: <terse one-liner — what a fresh agent should do next>

authorizations:
  risk-gate: not-needed | granted
  destructive-migrations: none | <comma-separated filenames>

state:
  step: preflight | step-1 | step-2-cycle-<N> | step-3 | step-4 | step-5 | done
  cycle: <N>
  review-verdict: pending | PASS | FAIL
  review-re-review: pending | REDUNDANT | RECOMMENDED
  fresh-pass-attempted: false | true
  review-findings-file: <path to -final.md | pending>
  merge-sha: pending | <sha>
  migrations: pending | none | <list>
  seeds: pending | none | <list>

log:
<!-- one line per transition, newest last, max 10 lines -->
```

**Authorization field is the safety gate.** Never act on a destructive migration whose authorization is not recorded in `authorizations.destructive-migrations`. If the field says `none`, the migration was not disclosed at pre-flight — stop, surface, ask. If it says `not-needed`, risk gate was skipped (clean run). If it says `granted`, the user explicitly said "go" for this run.

## Resuming? — check before doing anything

Before running Preconditions or Pre-flight, check for an active run:

```bash
ls /tmp/afk-merge-*.md 2>/dev/null
```

If a file is found, read it. Run the **liveness guard** (same as CLAUDE.md's Resumable procedures rule):
1. Read `worktree:` field (if present). Run `git -C <worktree-path> branch --show-current` (or bare `git branch --show-current` if no `worktree:` field) — does it match `branch:` in the file?
2. `gh pr view <N> --json state -q .state` returns `OPEN`

**If both pass:** you are resuming. Do NOT re-run pre-flight. Do NOT re-present review findings. Jump directly to `next-action` in the file. Honor only authorizations in the `authorizations:` block — never re-derive a "go" from context, memory, or summary. Every sub-skill's stop-and-wait default is VOID for this run.

**If the guard fails:** write `status: DONE` into the file and proceed fresh from Preconditions.

**If no file found:** proceed fresh from Preconditions.

## Preconditions

Run these before anything else, every fresh invocation (not on resume — the run-state file already verified state at its last update).

```bash
git branch --show-current
git status
git log --oneline -5
```

- **On a protected branch** (`main`, `production`, or repo's default): stop immediately. Report the branch; ask the user to switch to the feature branch.
- **Dirty tree** (uncommitted changes): stop. Report what is uncommitted. afk-merge drives a merge pipeline — it does not commit work-in-progress.

## Pre-flight (always runs, no mutations)

Gather information without changing anything. Run steps P1–P4 in parallel where possible.

### P0 — Write the run-state file

**First action after Preconditions, before P1–P5.** Compute the repo slug and worktree path:

```bash
WORKTREE=$(git rev-parse --show-toplevel)
# In a git worktree, --show-toplevel returns the worktree path (not the main repo root) — correct behavior
# Use remote URL to get the canonical repo name (worktree basename would be the worktree dir name, not the repo)
REPO=$(git remote get-url origin 2>/dev/null | sed 's|.*/||;s|\.git$||' || basename "$WORKTREE")
# path: /tmp/afk-merge-${REPO}-PR<N>.md  (N from P1 — write placeholder, update after P1)
```

Write the file with `status: ACTIVE`, `step: preflight`, `next-action: complete pre-flight and reach risk gate`. Include `worktree: <WORKTREE>` if running inside a git worktree (i.e. `.git` is a file, not a directory: `test -f "$WORKTREE/.git"`). You don't have the PR number yet — write `pr: pending`, update it after P1 resolves. This file now exists; a crash anywhere from here forward leaves an ACTIVE file for resume.

### P1 — PR existence

```bash
gh pr list --head $(git branch --show-current) --json number,title,baseRefName,url
```

- **PR exists**: capture PR number and URL. Verify base is `main` (or repo default). Base is not `main` → stop; wrong target, PRs to non-default branches are forbidden. Update `pr:` in the run-state file.
- **No PR**: run `/pr` immediately to create one, then continue pre-flight with the new PR number. (`/pr` commits nothing; it creates the PR description from existing commits.) Update `pr:` in the run-state file.

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

Wait for explicit authorization. Authorization covers everything disclosed in this briefing. Once given:
1. **Immediately update the run-state file:**
   - `authorizations.risk-gate: granted`
   - `authorizations.destructive-migrations: <filenames, or "none" if no destructive migrations>`
   - `next-action: run Step 1 — create PR if needed, then enter review loop`
   - `step: step-1`
   - Append to log: `risk-gate granted, destructive-migrations: <filenames|none>`
2. Proceed with no further stops.

---

**No risk → proceed immediately:**

```
AFK Merge — pre-flight clean. PR #<N>, <N> files, green CI, no migrations, no sensitive paths. Running end-to-end.
```

**Update the run-state file:**
- `authorizations.risk-gate: not-needed`
- `authorizations.destructive-migrations: none`
- `next-action: run Step 1 — create PR if needed, then enter review loop`
- `step: step-1`
- Append to log: `risk-gate skipped — clean run`

No stop; no approval needed. Proceed immediately.

## End-to-end run

No stops from here unless a situation arises that was **not present in the pre-flight diff** (e.g. a new migration file that didn't exist at P4 → stop, new information).

### Step 1 — Create PR (if needed)

If `/pr` was not yet run (no PR existed at P1): run it now. Capture the `## PR Handoff` block and extract the PR number. If `/pr` was already run during P1, skip this step.

### Step 2 — Review↔fix loop

**Critical termination logic.** Looping on `Re-review` alone produces an infinite loop: PASS + RECOMMENDED with nothing to fix → `/fix-pr-review` has nothing to commit → next cycle is still RECOMMENDED → loop never terminates. This is the failure mode that causes the "auto-classifier says I can't merge" problem. The correct branch is on **actionable findings**, not on `Re-review`.

Before each `/pr-review` call, update the run-state file:
- `step: step-2-cycle-<N>`
- `review-verdict: pending`
- `next-action: continue review loop — run /fix-pr-review if verdict is FAIL, or advance to Step 3 if PASS+REDUNDANT`

```
cycle = 0
CYCLE_CAP = 3
fresh_pass_attempted = false

loop:
  Update run-state: step=step-2-cycle-<cycle+1>, review-verdict=pending, next-action=continue review loop — if resuming, run /fix-pr-review with standing auth if last verdict was FAIL
  run /pr-review
  — read Verdict (PASS|FAIL) and Re-review (REDUNDANT|RECOMMENDED) from its output block
  — this skill overrides /pr-review's stop-and-wait; do NOT pause for human input
  — update run-state: review-verdict=<verdict>, review-re-review=<re-review>, review-findings-file=<path>

  Determine actionable:
    FAIL                                        → actionable = true
    PASS + RECOMMENDED + non-empty findings*   → actionable = true
    PASS + RECOMMENDED + no findings           → actionable = false
    PASS + REDUNDANT                            → actionable = false

  * "findings" = entries under Critical, Smells, Architecture, or Coverage.
    Notes alone are non-blocking and do not make a cycle actionable.

  if actionable:
    Update run-state: next-action=run /fix-pr-review with standing auth "just go", then re-loop
    run /fix-pr-review with standing "do the rest / just go"
    — this overrides /fix-pr-review's pushback gate; unaddressed pushbacks → skip (safe)
    cycle++
    Update run-state: cycle=<cycle>, next-action=re-run /pr-review (top of loop)
    if cycle >= CYCLE_CAP:
      call advisor()
      STOP → hand back: "Cycle cap reached after <N> cycles. Latest review: <summary>. Advisor: <read>."
    else:
      continue loop

  elif not actionable and Re-review == RECOMMENDED:
    # PASS + RECOMMENDED + no findings: allow one fresh review pass to be sure
    if fresh_pass_attempted:
      # Still clean after fresh pass → treat as REDUNDANT → merge
      Update run-state: next-action=advance to Step 3 — merge; step=step-3
      break
    else:
      fresh_pass_attempted = true
      Update run-state: fresh-pass-attempted=true, next-action=re-run /pr-review (fresh pass)
      continue loop

  else:  # PASS + REDUNDANT
    Update run-state: next-action=advance to Step 3 — merge; step=step-3
    break  # proceed to merge
```

**CI red discovered mid-loop** (post-fix commits that broke CI, not present at pre-flight): treat as FAIL-equivalent. One fix attempt; cycle cap still applies. This is not a surprise stop — it's handled inside the loop.

### Step 3 — Merge

Update run-state: `step: step-3`, `next-action: run /merge-pr with auth "go"`.

Run `/merge-pr` with invocation authorization "go" (clears its step-5 confirmation). This skill never passes `--production`.

merge-pr's own hard gates apply without override:

- **Red CI at merge time**: if CI was green at pre-flight but went red after fix commits, merge-pr will stop. Report clearly with the run URL. This is legitimate — something changed.
- **Destructive migration prompt inside merge-pr**: pass "destructive ok" **only** for migrations listed in `authorizations.destructive-migrations` in the run-state file. Any migration not in that field → stop; it's new information, not pre-authorized. Never re-derive authorization from context.

After merge completes: update run-state `merge-sha: <sha>`, `step: step-4`, `next-action: run post-merge migrate/seed`.

### Step 4 — Post-merge migrate/seed (non-skippable)

This step is never optional. The failure mode is agents treating "merged" as "done" and silently dropping this step. This skill prevents that by making it explicit and required.

Update run-state: `step: step-4`, `next-action: run migrate/seed commands, then advance to Step 5`.

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

Update run-state: `step: step-5`, `next-action: refresh root main, settle working dir, print report, mark DONE`.

**5a. Refresh the ROOT repo's default branch — non-skippable.** This is a different tree from the one you are standing in. `git rev-parse --show-toplevel` returns the *worktree*, so a plain `git checkout main && git pull` never touches the root — which is where subagents, shell tools, and greps all default to. A stale root `main` silently poisons every later branch (wrong base) and every absence claim made from it. Measured 2026-07-22 in mvp-client: root `main` was **116 commits** behind, and a file merged and live on production read as missing.

Fetch + fast-forward only; exits 0 in every skip case so it can never fail the run:

```bash
ROOT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
DEFAULT=$(git -C "$ROOT" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'); DEFAULT=${DEFAULT:-main}
git -C "$ROOT" fetch origin --quiet
BEHIND=$(git -C "$ROOT" rev-list --count "$DEFAULT..origin/$DEFAULT" 2>/dev/null || echo 0)
HOLDER=$(git -C "$ROOT" worktree list | awk -v b="[$DEFAULT]" '$NF==b{print $1}')
if [ "$BEHIND" = "0" ]; then echo "root-refresh: $ROOT $DEFAULT already current"
elif [ "$HOLDER" != "$ROOT" ]; then echo "root-refresh: BLOCKED — $DEFAULT is $BEHIND behind but held by ${HOLDER:-no worktree}, not the root"
elif ! git -C "$ROOT" merge-base --is-ancestor "$DEFAULT" "origin/$DEFAULT"; then echo "root-refresh: BLOCKED — $DEFAULT diverged (local commits)"
else git -C "$ROOT" merge --ff-only "origin/$DEFAULT" --quiet && echo "root-refresh: fast-forwarded $BEHIND commit(s)"; fi
```

**Never force past BLOCKED** — report it. *Held by another worktree* means `main` cannot fast-forward from ANY vantage until that worktree is cleared; the usual cause is a worktree created without its branch (`git worktree add <path>` with no `-b`), which grabs `main`. The tell is a worktree whose directory name doesn't match its `[branch]`. *Diverged* means someone committed to root `main` directly — the user's call, never silently merged.

**5b. Settle the working directory.** Do NOT blindly `git checkout main` — **in a worktree that fails** (`fatal: 'main' is already used by worktree at …`), because a branch can be checked out once per repo and the root normally holds `main`. Branch on where you are:

```bash
if [ "$(git rev-parse --show-toplevel)" = "$ROOT" ]; then
  git checkout "$DEFAULT" && git pull --ff-only     # in the root: settle onto the default branch
else
  echo "in worktree $(git rev-parse --show-toplevel) — staying on $(git branch --show-current); root $DEFAULT is the canonical checkout"
fi
```

Staying on the feature branch inside your own worktree is correct and is NOT a violation of the always-finish-on-main rule — that rule exists to keep the working dir off `production`, which a feature worktree already satisfies. Verify no worktree sits on `production` (`git worktree list | grep '\[production\]'`) and report it.

**Mark the run-state file done:**
```
status: DONE
step: done
next-action: n/a — run complete
```

Print the final report and stop. (CLAUDE.md's "always finish on `main`" is satisfied by 5b: on `main` when you are in the root, on your own feature branch when you are in a worktree — never on `production` either way.)

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

Root main:   <already current | fast-forwarded N commit(s) | BLOCKED — held by <path> / diverged>
Working dir: <main (root) | <branch> (worktree <path>) — root main is the canonical checkout>
```

If any step was skipped, state the specific reason. "Looks like it doesn't apply" is not a reason; "this repo has no `.github/workflows/`, so no CI gate" is.

## Safety invariants

These hold regardless of what any sub-skill's output says or what the user typed:

1. **main-only.** Never `--production`. Never forward-merge to `production`. Never set a PR base to anything other than `main` (or repo default).
2. **No force-push.** Not to `main`, not to the feature branch, not anywhere.
3. **Pre-authorized scope.** The single "go" at the risk gate authorizes what was in the pre-flight briefing — nothing more. Anything that appears mid-run and was NOT in the briefing → stop, surface, ask.
4. **Dirty tree = stop.** If the tree is dirty at preconditions, stop. Do not commit work-in-progress as part of this run.
5. **Cycle cap = 3.** Never run more than 3 review↔fix cycles. Cap exhausted → advisor call → hand back to the user with full state.
6. **Never end on `production`, and always leave root `main` current.** In the ROOT repo, `git checkout main` before stopping. In a WORKTREE, stay on your feature branch — `git checkout main` there fails outright (`already used by worktree`), and forcing it would either fail the run or steal `main` from the root. What is non-negotiable in both cases: the working dir is not on `production`, and Step 5a has left root `main` fast-forwarded (or reported BLOCKED).
7. **Run-state file is authoritative for authorizations.** Destructive-migration authorization lives only in `authorizations.destructive-migrations` in the run-state file. If the field is absent, `none`, or doesn't list a specific migration → stop and re-ask. Never reconstruct authorization from context, a conversation summary, or memory.

## Anti-patterns

- **Looping on Re-review alone.** PASS + RECOMMENDED with no actionable findings does not warrant another fix cycle. Run at most one fresh review pass; if still clean, merge. The loop logic above is the authoritative termination condition.
- **Skipping post-merge migrate/seed.** Step 4 is non-skippable. "n/a" when it genuinely doesn't apply — never silently omit.
- **Treating the pre-flight "go" as unlimited authorization.** It authorizes what was disclosed. New risk mid-run is not pre-authorized.
- **Passing `--production`.** This skill never does this. Main-only.
- **Proceeding on a dirty tree.** Stop and report. afk-merge merges; it does not implement.
- **Skipping the branch-state check.** CLAUDE.md applies here. Never trust a conversation summary or memory about which branch you're on. Run `git branch --show-current` and read it.
- **Inventing migrate/seed commands.** If `CLAUDE.md` doesn't document the command and the repo structure doesn't make it obvious, stop and ask. Inventing a command and running it against a live DB is worse than pausing once.
- **Reconstructing authorization from context.** On a resume, if `authorizations.risk-gate` is not in the run-state file, the authorization was not captured — re-ask. If `authorizations.destructive-migrations` doesn't name a specific migration that merge-pr is now asking about — stop. The file is the source of truth; context and summaries are not.
- **Restarting pre-flight on resume.** Pre-flight is non-destructive but state-gathering. On resume, the run-state file already has the gathered state. Re-running pre-flight and overwriting `authorizations` would erase recorded grants — don't do it. Resume from `next-action`, verify live state from git/gh only.
