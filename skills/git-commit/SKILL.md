---
name: git-commit
description: Git add and commit with conventional commit format. No AI watermarks.
disable-model-invocation: false
---

Use the git-master subagent to add and commit files with proper conventional commit format. Never uses AI watermarks or bot attributions.

## Branch protection

NEVER commit directly to `main`, `demo`, or `production`. If the current branch is one of these, STOP and ask the user to create or switch to a feature branch first. Only commit to protected branches if the user EXPLICITLY instructs you to.

The git-master subagent will:
1. Check git status and diff to understand changes
2. **Verify current branch is NOT `main`, `demo`, or `production`** — abort if it is
3. Detect project's commit convention
4. Add relevant files to staging area
5. Create atomic, focused commit with professional message (no watermarks)
6. Ensure the commit message explains the "why" and follows established patterns

Additional details: $ARGUMENTS
