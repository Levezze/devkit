Use the git-master subagent to add and commit files with proper conventional commit format. Never uses AI watermarks or bot attributions.

**Usage:** `/add-commit [additional details]`

**Examples:**
- `/add-commit` - Standard commit of all staged/modified files
- `/add-commit the authentication changes only` - Commit specific changes
- `/add-commit fix validation bug` - Commit with specific focus
- `/add-commit refactor database connection logic` - Refactoring commit
- `/add-commit with breaking changes to API` - Commit with breaking changes

The git-master subagent will:
1. Check git status and diff to understand changes
2. Detect project's commit convention (conventional commits, angular, etc.)
3. Create appropriate commit message (feat, fix, docs, style, refactor, test, chore)
4. Add relevant files to staging area
5. Commit with professional message (no watermarks)
6. Ensure atomic, focused commits

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance and tooling
- `perf`: Performance improvement
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert a previous commit

**Commit Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

The commit will be atomic, have a clear message explaining the "why", and follow the project's established patterns without any AI signatures.

Additional details: $ARGUMENTS