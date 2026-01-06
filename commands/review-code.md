Use the code-reviewer subagent to perform comprehensive code quality review, with automatic testing assessment via testing-wizard when needed.

**Usage:** `/review-code [optional context]`

**Examples:**
- `/review-code` - Review all current changes
- `/review-code before committing to main`
- `/review-code focusing on security concerns`
- `/review-code for the authentication implementation`
- `/review-code of the API endpoints`

The code-reviewer subagent will:
1. Analyze all current code changes and modifications
2. Review code quality, best practices, and DRY principles
3. Check for security issues and performance concerns
4. Assess language-specific patterns and standards
5. Determine if testing analysis is needed and invoke testing-wizard subagent
6. Provide actionable feedback with specific file/line references
7. Give overall assessment of commit-readiness

**Intelligent Testing Integration:**
- The code-reviewer will automatically assess whether testing analysis is required
- When needed, it will invoke the testing-wizard subagent to:
  - Check if tests were recently run
  - Run relevant test suites if needed
  - Analyze test coverage for the changes
  - Provide testing recommendations

**Review Focus Areas:**
- Language best practices and idiomatic code
- DRY principles and code duplication
- Security vulnerabilities and exposed secrets
- Performance bottlenecks and optimization opportunities
- Error handling and edge cases
- Code organization and architecture
- Documentation and code clarity

**Output:** Comprehensive review report with strengths, issues (categorized by severity), security assessment, performance analysis, and commit-readiness assessment.

Optional context: $ARGUMENTS