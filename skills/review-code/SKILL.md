---
name: review-code
description: Code quality review with automatic testing assessment.
disable-model-invocation: true
---

Use the code-reviewer subagent to perform comprehensive code quality review, with automatic testing assessment via testing-wizard when needed.

The code-reviewer subagent will:
1. Analyze all current code changes and modifications
2. Review code quality, best practices, and DRY principles
3. Check for security issues and performance concerns
4. Determine if testing analysis is needed and invoke testing-wizard subagent
5. Provide actionable feedback with specific file/line references
6. Give overall assessment of commit-readiness

Optional context: $ARGUMENTS
