---
name: pr
description: Generate a clean PR description and create the PR.
---

Create a pull request for the current branch.

1. Review commit history from when branch diverged from main/master
2. Analyze all changes included in the PR
3. Determine the current GitHub user via `gh api user --jq .login`
4. Choose appropriate labels from the repo's available labels (`gh label list`) based on the nature of the changes (e.g. `bug` for fixes, `enhancement` for features, `documentation` for docs)
5. Identify related GitHub issues from commit messages, branch name, or conversation context
6. Create the PR via `gh pr create` with:
   - A concise title
   - Body starting with `Closes #x, closes #y, ...` for all related issues (so they auto-close on merge)
   - A summary of what changed and why
   - A list of files changed (only if many files or complex changes)
   - `--assignee @me` to self-assign
   - `--label` flags for each relevant label identified in step 4
6. No AI watermarks, no bot attributions
7. After the PR is created, end your reply with the handoff block below. Same fields, same order, every time — the user pastes it verbatim into other agents to brief them. Output the block as-is in chat (not in the PR body). No extra commentary before or after.

   ```text
   ## PR Handoff

   - **PR:** <full URL>
   - **Title:** <PR title>
   - **Base ← Head:** <base branch> ← <head branch>
   - **Why:** <one sentence — the motivation / triggering problem>
   - **How:** <1–2 sentences — the approach taken; name the load-bearing files or modules>
   - **Scope:** <one line — what's in the diff at a glance, e.g. "20 source files + regenerated client (separate commit)">
   - **Verification:** <what's been run (tests, typecheck) and what's still pending (manual QA, deploy checks)>
   - **Caveats:** <open follow-ups, intentional out-of-scope, anything a reviewer needs to know before merging — or "none">
   ```

   Rules: every field on one line; use "none" rather than dropping a field; do not pad — a one-line Why is better than a paragraph.

Keep it simple. Only add detail if the changes are complex (many commits/files) or if something was specifically discussed.
