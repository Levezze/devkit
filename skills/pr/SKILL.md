---
name: pr
description: Generate a clean PR description and create the PR.
disable-model-invocation: true
---

Create a pull request for the current branch.

1. Review commit history from when branch diverged from main/master
2. Analyze all changes included in the PR
3. Create the PR via `gh pr create` with:
   - A concise title
   - A summary of what changed and why
   - A list of files changed (only if many files or complex changes)
4. No AI watermarks, no bot attributions

Keep it simple. Only add detail if the changes are complex (many commits/files) or if something was specifically discussed.
