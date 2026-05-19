---
name: merge-pr
description: Merge a PR to main with the full pre/post-merge gate (CI check, post-merge migrate+seed if needed, Cloud Build wait, deployed e2e). Pass --production to forward-merge main→production with extra prod-specific checks.
---

Run the full merge-and-promote gate for a PR. Two modes:

- **Default (target = main)**: standard merge-to-main with post-merge verification.
- **`--production`**: append a `main` → `production` forward-merge after the standard merge, with prod-specific checks.

Never invent your own merge sequence or skip steps "because it's a small change." The whole point of this skill is that every step is non-negotiable until proven otherwise.

## Scope

This skill encodes the AevArk/mvp-api merge workflow. The specifics — Prisma migrate + seed commands, Cloud Build region sweep, Hono `/health` endpoint, the `pnpm test:e2e:deployed` / `:prod` harness, the `git merge --no-ff` forward-merge promotion model — are mvp-api conventions. For other repos, follow the same gate **structure** (CI check → confirm → merge → wait-for-deploy → e2e → optional prod promote) but substitute the repo's equivalent commands. If you find yourself reaching for this skill in a non-mvp-api repo and ~half the steps don't apply, stop and ask the user whether they want a generalized variant rather than improvising.

The `--production` flow additionally requires the Clerk-JWT auth path in mvp-api's e2e harness (added in AevArk/mvp-api PR #489). Until that PR has landed on `main`, step 16 will hit the dev-bypass auth on prod and 401 every call.

## Invocation forms

- `/merge-pr` — resolve PR from current branch.
- `/merge-pr 489` — explicit PR number.
- `/merge-pr --production` — merge current PR to main, then forward-merge main → production.
- `/merge-pr 489 --production` — explicit PR + prod promote.

## Mode A — merge to main (default)

1. **Resolve PR number.** From args if passed, otherwise from current branch via `gh pr view --json number,baseRefName,headRefName`. If no PR found, stop and explain.

2. **Verify PR base is `main`.** `gh pr view <N> --json baseRefName`. If base is `production` (or anything else), STOP. Explain to the user that PRs to `production` are forbidden by the project's git workflow (forward-merge only). Do not proceed without explicit override.

3. **Verify CI is green on the PR's head SHA.** `gh run list --repo <owner>/<repo> --branch <head-branch> --limit 5`. Confirm the latest run for the PR's head SHA is SUCCESS. If red:
   - Stop, surface the failed checks, and require the user to type an explicit authorization out loud (e.g. "merge red, I authorize"). Quote their authorization back to confirm. No implicit approval, no default-mode auto-confirm.
   - Local verification is NOT a substitute for the GH Actions result. Green local + red CI = stop.

4. **Confirm with the user**: "Merge PR #N to main?" Wait for explicit yes. Don't proceed on assumption.

5. **Merge.** Default to `gh pr merge <N> --squash`. Only deviate if the repo's `CLAUDE.md` explicitly mandates a different strategy (e.g. `--merge` for preserving multi-commit history on long branches). NEVER pass `--no-verify` or hook-skip flags. If the user has overridden the strategy in the current conversation, honor that; otherwise squash.

6. **Checkout main and pull.** `git checkout main && git pull`.

7. **Detect post-merge work.**
   - **Migration**: if PR added files under `prisma/migrations/`, run `pnpm migrate:deploy:dev` (or the project's equivalent for the dev/staging Neon branch).
   - **Seed**: if PR edited `prisma/data/**`, `prisma/seed*.ts`, or `prisma/seed-shared/**`, run `pnpm dlx prisma db seed -- --deployed` (or project equivalent). The `--` delimiter forwards args.

8. **Wait for Cloud Build to finish.** Merging to `main` triggers a Cloud Run redeploy. Running the deployed e2e against the old revision tests nothing.
   - GCP assigns Cloud Build jobs to **random regions**. Check ALL of them, every time, until you find the new build:
     ```bash
     for region in us-east1 us-central1 us-west1 europe-west1 asia-east1 global; do
       echo "=== $region ===" && gcloud builds list --limit=3 --region=$region --format="table(id,status,startTime,tags)" 2>&1
     done
     ```
   - Wait for WORKING → SUCCESS. Don't proceed on QUEUED or WORKING.
   - If the build FAILED, stop. Surface the failure ID and ask the user.

9. **Restart dev server, then run deployed e2e.**
   - `pnpm kill && pnpm dev` (background). NEVER skip this — `tsx watch` is flaky on Hono route changes and a stale dev server silently runs old code.
   - Poll `/health` (no `/v1` prefix) until 200.
   - `pnpm test:e2e:deployed` — must be green. If red, stop and report.

10. **Final state.** Kill dev server (`pnpm kill`). Confirm working dir is on `main`. Report the merge SHA, the Cloud Build ID, and the deployed-e2e summary.

## Mode B — `--production` adds a forward-merge

After Mode A's step 10 completes successfully, perform the forward-merge:

11. **Prompt for prod authorization.** Required phrasing: "merge `main` → `production`? This is a live production promotion." Wait for the user to type an explicit `yes` (lowercase, exact). Do NOT accept "y", "ok", "go", "sure". If they type anything other than `yes`, abort and stay on `main`.

12. **Forward-merge.** Production promotions are NEVER done via PR. Forward-merge only:
    ```bash
    git checkout production && git pull
    git merge --no-ff main -m "Merge main into production"
    git push origin production
    ```
    `--no-ff` preserves the merge commit; the first-parent chain stays clean.

13. **Wait for production Cloud Build.** Same all-regions check as step 8. The production trigger may be in `europe-west1` (Developer Connect) while the `main` trigger is `global` — never assume. Wait for SUCCESS before proceeding.

14. **Apply prod migrations if any.** If the PR added migration files, run the prod migrate script. It will require explicit confirmation:
    - Interactive: `pnpm migrate:deploy:prod` (prompts; type `yes`).
    - CI / non-TTY: prepend `PROD_CONFIRM=yes` if and only if the user has authorized unattended prod migrations in this conversation.

15. **Apply prod seed if any.** If the PR edited prod-affecting seed data, run `pnpm dlx prisma db seed -- --prod` (interactive) or `PROD_CONFIRM=yes pnpm dlx prisma db seed -- --prod` (CI).

16. **Run prod e2e.** `pnpm test:e2e:prod` (or `PROD_CONFIRM=yes pnpm test:e2e:prod` for CI). This authenticates via real Clerk session JWTs and exercises the full surface against live prod. Must be green. If red, the promotion has already shipped to prod — alert the user immediately and surface the failures; do NOT attempt to revert silently.

17. **Prod smoke.** `curl <prod URL>/health` — confirm HTTP 200 and `env: production` in the response body. Confirm at least one endpoint is reachable through the auth gate (e.g. `/v1/questionnaire/types` should return 401, not 500).

18. **Return to `main`.** `git checkout main`. NEVER leave the working directory on `production`. If you do, future commits in this session may accidentally land on prod.

19. **Final report.** Summarize: merge commit SHA on `main`, merge commit SHA on `production`, both Cloud Build IDs, prod migration ID if applied, e2e result.

## Anti-patterns (do not do these)

- Do not merge a PR with red CI without explicit, quoted-back user authorization.
- Do not assume the Cloud Build region — always sweep all of them.
- Do not merge a PR whose base is `production` or any non-`main` branch.
- Do not `git push --force` to `main` or `production`. Never. Not even to "fix" something.
- Do not run prod migrations or prod seeds without either an interactive `yes` prompt or `PROD_CONFIRM=yes` from a user-authorized invocation.
- Do not skip the `pnpm kill && pnpm dev` cycle before any e2e — stale servers run old code and produce false greens.
- Do not promote to `production` via PR. Forward-merge only.
- Do not skip the prod e2e step because "it just takes too long". The prod e2e is the only gate that catches Clerk JWT lifetime issues, Stripe webhook divergence, and prod-only env wiring bugs.
- Do not leave the working directory on `production` after a promotion. Always `git checkout main` before reporting done.
- Do not run `--production` without first having completed the deployed-e2e step from Mode A. The skill enforces this ordering for a reason: the deployed e2e catches issues against the same code as prod *before* it ships to prod.

## Edge cases

- **PR base isn't main**: stop. Tell the user "PRs to non-main branches are forbidden by repo policy. To direct-merge to production, the user must explicitly state in the conversation 'yes, merge PR #N directly to production' and you must quote it back for confirmation."
- **No PR found for current branch**: ask the user for the PR number. Don't guess from the branch name.
- **Cloud Build is QUEUED for >10 min**: surface to the user. Don't silently keep polling; the user may want to investigate (quota, trigger misconfig, etc.).
- **Migration is destructive (column drops, type changes)**: prompt the user explicitly: "This migration is destructive. Confirm you've coordinated a deploy window and have a recent backup. Type 'destructive ok' to proceed." Don't accept generic `yes`.
- **Prod e2e gates on `PROD_CONFIRM=yes` env var**: the harness honors this; CI invocations pass it. Interactive invocations type `yes` at the prompt. Don't set `PROD_CONFIRM=yes` from within the skill unless the user authorized it in the current conversation.
- **`.env.production` missing or incomplete**: surface to the user before running anything that needs it. Do not patch missing values; the source of truth is GCP Secret Manager and the env file should mirror it.
