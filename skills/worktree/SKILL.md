---
name: worktree
description: Enter an isolated git worktree on an auto-named branch, mid-session. Derives the branch name from current conversation context (issue numbers, PRDs, handoffs, grill sessions) so a fresh chat can spin up a properly-named feature branch in one command. Use when the user invokes `/worktree` or `/worktree <arg>`.
disable-model-invocation: false
---

# Worktree

Enter an isolated git worktree on an auto-named branch for the current session.

## When to use

Invoke when:
- The user explicitly types `/worktree` or `/worktree <arg>`.
- The agent determines that isolating the current task in a worktree is the right call — e.g. after a `/grill-me` or `/write-a-prd` session that produced a clear feature scope, at the start of a non-trivial implementation, or when the user asks to start a feature without specifying isolation.

In all cases, run this skill's full flow (pre-flight + naming + confirm). Do NOT call `EnterWorktree` directly outside this flow — branch naming discipline matters and ad-hoc invocation skips it.

## Step 1 — Pre-flight: refuse on dirty tree

Run `git status --porcelain`. If there is any output:

1. **Stop. Do not call `EnterWorktree`.**
2. Print the dirty files grouped by category (staged / unstaged / untracked).
3. Ask the user via `AskUserQuestion` with these four options:
   - **Commit first** — invoke the `/git-commit` skill, then re-enter this flow.
   - **Stash** — run `git stash push -u -m "pre-worktree stash"`, then proceed.
   - **Proceed anyway** — leave the dirty files in the source tree (they stay there; the new worktree starts clean from HEAD). Warn the user explicitly that those files will not be in the worktree.
   - **Cancel** — abort entirely.
4. Honor the choice before continuing to Step 2.

The reason for refusing rather than silently continuing: uncommitted changes left behind are easy to forget. The slice-6/7 agent-collision incident is the canonical example.

## Step 2 — Resolve the branch name

Arguments come from `$ARGUMENTS`.

### Heuristic

- **Literal branch name** — if the argument matches `^[a-z][a-z0-9._-]*/[a-z0-9._-]+$` (i.e. a `<type>/<slug>` shape such as `feat/slice-8-insights` or `fix/auth-leak`), use it as-is. Skip derivation.
- **Hint** — if the argument is present but does not match the literal pattern (e.g. `slice-8`, `auth leak`), treat it as a topic hint and combine with context from Step 2a below to form the full branch name.
- **No argument** — derive the branch name entirely from conversation context (Step 2a).

### Step 2a — Derive from context (hint or no-arg path)

Scan the current conversation in priority order. Stop at the first hit.

1. **Explicit issue number** — if the user mentioned `#N` or `issue N`, form `feat/slice-<S>-<topic>` when a slice number S is also present, or `feat/issue-<N>-<topic>` otherwise. Topic = issue title if mentioned, else the most-discussed noun in the session.
2. **Recent `/handoff` output** — if a handoff slug was produced in this session, read `/tmp/handoff-<slug>.md`. Branch = `feat/<slug>` for change-in-flight handoffs, `chore/<slug>` for coordination-only ones.
3. **Recent `/grill-me` or `/write-a-prd` session** — pull the topic from the PRD title or grill subject.
4. **Conversation topic** — if the user has discussed a single coherent feature over multiple turns, infer `feat/<topic-from-turns>`.
5. **Fallback** — none of the above yielded a confident name. Use `AskUserQuestion` with 2–3 suggested names (based on partial signals) plus an "other" path.

### Type prefix selection

| Intent               | Prefix    |
| -------------------- | --------- |
| New feature          | `feat/`   |
| Bug fix              | `fix/`    |
| Tooling/deps/refactor | `chore/` |
| Docs only            | `docs/`   |

When unsure, default to `feat/`. Let the user override via a retry with an explicit arg.

### Normalization

Validate the final name against `EnterWorktree`'s constraints: each `/`-separated segment contains only letters, digits, dots, underscores, and dashes; total length ≤ 64 chars. If the derived name fails: lowercase everything, replace spaces and illegal chars with `-`, collapse consecutive `-`, truncate to 64. If it still fails, fall back to `AskUserQuestion`.

Never suffix branch names with timestamps or random tokens — readable names matter for PRs.

## Step 3 — Enter the worktree

Call `EnterWorktree` with `{ "name": "<final-branch-name>" }`.

The project-level `worktree.baseRef: "head"` setting means the new worktree branches from the current local HEAD commit. This is the desired behavior: the worktree starts where the current branch is, not from a stale `origin/main`.

## Step 4 — Confirm

After `EnterWorktree` succeeds, output a single short confirmation:

```text
Worktree active on `<branch>`. Source tree paused at `<original-branch>`.
```

Then run `git status` and show the output (should be clean — nothing staged, nothing modified, nothing untracked). If it is not clean, flag it immediately.

To leave the worktree later: `ExitWorktree { action: "remove" }` to clean up, or `ExitWorktree { action: "keep" }` to preserve the branch for later. This skill does not auto-exit.

## Anti-patterns

- Do NOT enter a worktree because the user said "branch" — they may mean `git checkout -b`. Only fire on explicit `/worktree`.
- Do NOT silently commit dirty files to clear the pre-flight.
- Do NOT invent slice numbers. If "slice" appears in context but no number is present, ask.
- Do NOT suffix names with timestamps or random tokens.
- Do NOT call `EnterWorktree` if already inside a worktree (the tool will error; report this to the user instead).
