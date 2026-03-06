---
name: git-commit
description: Git add and commit with conventional commit format. No AI watermarks.
disable-model-invocation: true
---

Use the git-master subagent to add and commit files with proper conventional commit format. Never uses AI watermarks or bot attributions.

The git-master subagent will:
1. Check git status and diff to understand changes
2. Detect project's commit convention
3. Add relevant files to staging area
4. Create atomic, focused commit with professional message (no watermarks)
5. Ensure the commit message explains the "why" and follows established patterns

Additional details: $ARGUMENTS
