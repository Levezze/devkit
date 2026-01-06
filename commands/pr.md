Use the git-master subagent to generate a comprehensive PR/MR description based on the current branch's commit history.

**Usage:** `/pr`

The git-master subagent will:
1. Review commit history from when branch diverged from main/master
2. Analyze all changes that will be included in the PR/MR
3. Check recent PRs/MRs for naming patterns and conventions
4. Generate comprehensive PR description with:
   - **PR title** (based on commit types and scope)
   - Summary of changes
   - Type of change (feature, bug fix, etc.)
   - Testing performed
   - Breaking changes (if any)
   - Checklist of requirements
5. Save PR description to `PR_DESCRIPTION.md` in project root with title as first line

**Note:** This command generates the PR description file. You'll need to:
1. Push the branch: `git push -u origin branch-name`
2. Create PR/MR manually using the generated `PR_DESCRIPTION.md`

The PR description will follow professional standards without any AI watermarks or bot attributions. It will adapt to your project's established patterns and conventions.