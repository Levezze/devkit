---
name: review-code
description: Code quality review with optional testing assessment.
disable-model-invocation: true
---

Perform a two-step code quality review:

**Step 1:** Use the code-reviewer subagent to review all current code changes for quality,
best practices, DRY principles, security, and performance. It will provide a structured
report with commit-readiness assessment.

**Step 2:** If code-reviewer's report indicates testing gaps or if the changes are significant,
ALSO use the testing-wizard subagent to run tests and analyze coverage.

Present both reports together as a unified assessment.

Optional context: $ARGUMENTS
