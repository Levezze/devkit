---
name: merge-pr
description: Merge a PR to main with the full pre/post-merge gate (CI check, post-merge migrate+seed if needed, deploy wait, deployed smoke/e2e). Pass --production to forward-merge main→production with extra prod-specific checks. Repo-agnostic — detects stack from project files.
---

Run the full merge-and-promote gate for a PR. Two modes:

- **Default (target = main)**: standard merge-to-main with post-merge verification.
- **`--production`**: append a `main` → `production` forward-merge after the standard merge, with prod-specific checks.

Never invent your own merge sequence or skip steps "because it's a small change." Every gate is non-negotiable until proven otherwise. **Skip a step only when you can name the specific reason it doesn't apply in this repo** (no CI configured, no migrations dir, no deploy infra, etc.) — and say so explicitly in the report. "Looks like it doesn't apply" is not a reason; "this repo has no `.github/workflows`, so no CI gate" is.

## Repo-agnostic stack detection

Before doing anything, sniff the repo to know which commands map to which gates. Read these in parallel at the start of every invocation:

| Concern | Detect | Examples |
|---|---|---|
| Package manager / lang | Project root files | `package.json` (+ `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` / `bun.lockb`), `pyproject.toml` (+ `uv.lock` / `poetry.lock`), `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `mix.exs` |
| Task runner | Convention | `Makefile` (`make X`), npm scripts (`pnpm X` / `npm run X`), `uv run X`, `cargo X`, `just`, `task` |
| CI | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `.circleci/config.yml`, `Jenkinsfile`, BuildKite, etc. |
| Migrations | `prisma/migrations/`, `alembic/versions/`, `db/migrate/`, `migrations/`, `drizzle/migrations/`, `internal/db/migrations/`, Rails `db/migrate/` |
| Seeds | `prisma/seed*.ts` + `prisma/data/`, `seeds/` dir, `make seed` target, `pnpm db:seed`, `rake db:seed`, Django fixtures |
| Local prod-build path | `next build`, `vite build`, `astro build`, `cargo build --release`, `Dockerfile`, `tsc -p tsconfig.json` |
| Deploy infra | Cloud Build (GCP), Vercel, Netlify, Fly, GitHub Actions deploy job, Render, Railway, ECS, K8s manifests |
| Health endpoint | App-level convention: `/health`, `/healthz`, `/_health`, `/ping`, FastAPI `/docs`, Rails `/up` |
| E2E | `make test-e2e`, `pnpm test:e2e:deployed`, `pytest -m e2e`, `playwright test`, `cypress run` |
| Project docs | `CLAUDE.md`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md` — read these first for any merge/deploy override |

**Project docs win over defaults.** If `CLAUDE.md` says "deploy auto-runs on merge to main; check Cloud Build in europe-west1" or "no e2e exists, run `make smoke` instead" or "production migrations need `PROD_CONFIRM=yes` env var" — those override the generic defaults below. Read them before running any command in this skill.

## Invocation forms

- `/merge-pr` — resolve PR from current branch.
- `/merge-pr 489` — explicit PR number.
- `/merge-pr --production` — merge current PR to main, then forward-merge main → production.
- `/merge-pr 489 --production` — explicit PR + prod promote.

## Mode A — merge to main (default)

1. **Resolve PR number.** From args if passed, otherwise from current branch via `gh pr view --json number,baseRefName,headRefName`. If no PR found, stop and explain.

2. **Verify PR base is `main`** (or the repo's primary branch — check `gh repo view --json defaultBranchRef`). If base is `production`, `prod`, a release branch, or anything else not the default, STOP. Explain to the user that PRs to non-default branches are forbidden by the standard workflow (forward-merge or release branch). Do not proceed without explicit override.

3. **Verify CI is green on the PR's head SHA.** `gh run list --repo <owner>/<repo> --branch <head-branch> --limit 5`. Confirm the latest run for the PR's head SHA is SUCCESS. If red:
   - Stop, surface the failed checks, and require the user to type an explicit authorization out loud (e.g. "merge red, I authorize"). Quote their authorization back to confirm. No implicit approval, no default-mode auto-confirm.
   - Local verification is NOT a substitute for the GH Actions result. Green local + red CI = stop.
   - **A "green local" can itself be a false positive.** Piping a pass/fail gate through `tail`/`head`/`grep` (e.g. `biome check . | tail -2`, `pnpm lint | tail`) discards the gate's exit code — the pipeline reports the trimmed *output* while the gate actually exited non-zero. If CI is red on a check you "ran locally and it passed," suspect a masked exit code before suspecting flake: re-run the exact failing gate unpiped (or with `; echo "exit=${PIPESTATUS[0]}"`) and read its real status. Trust CI's conclusion over your masked local run.
   - **If the repo has no CI configured at all** (`statusCheckRollup: []`, empty `gh run list`, no `.github/workflows/` or other CI config), say so explicitly to the user and require explicit authorization to proceed on local verification alone. Don't silently treat "no CI" as "CI passed."

4. **Local production-build gate (when applicable).** Some repos exercise their production-build path ONLY at deploy time. Tests + typecheck + lint do NOT cover this path — Server Component constraints, route static analysis, image optimization, env-var binding, bundler config can all fail at build time without tripping any other gate.
   - Detect: build script in `package.json` and a framework that has a distinct prod build path (`next`, `vite`, `astro`, `remix`, `nuxt`, `sveltekit`); or a `Dockerfile` whose RUN steps include a build; or `cargo build --release`. Repo's `CLAUDE.md` may pin a specific command.
   - If detected: run the build (`pnpm build`, `npm run build`, `cargo build --release`, `docker build .`, or the repo's exact command) before step 6.
   - Skip when n/a: backend services where the "build" is `tsc` (already covered by typecheck), Python services without a bundling step, pure library repos that publish via CI, or repos where the deploy gate IS the remote build AND the remote build's logs are checked separately at step 9. **State the reason for the skip explicitly** ("Python service, no bundle step" / "Docker build runs in Cloud Build at step 9").
   - If local build fails: stop. The remote build will fail identically. Fix locally, push to the PR branch, restart the gate from step 3.

5. **Confirm with the user**: "Merge PR #N to main?" Wait for explicit yes. Don't proceed on assumption. If the invocation message itself contains broad authorization ("yes to all", "go", "merge it"), honor it for steps that don't involve destructive prod actions; still STOP at any step that requires `--production` or destructive-migration prompts (see Mode B).

6. **Merge.** Default to `gh pr merge <N> --squash`. Only deviate if the repo's `CLAUDE.md` explicitly mandates a different strategy (e.g. `--merge` for preserving multi-commit history on long branches, or `--rebase` for linear-history repos). NEVER pass `--no-verify` or hook-skip flags. If the user has overridden the strategy in the current conversation, honor that; otherwise squash.

7. **Checkout main (or default branch) and pull.** `git checkout <default> && git pull`.

8. **Detect post-merge work.**

   The PR's diff is the source of truth. `gh pr diff <N> --name-only` then map paths to actions:

   - **Migration files** added: run the repo's "apply migrations" command against the dev/staging DB (NOT production; that's Mode B step 15). Examples:
     - Prisma: `pnpm migrate:deploy:dev` or `pnpm prisma migrate deploy`
     - Alembic: `make migrate DEPLOY=1` (or whatever the repo's `make migrate` target is, with the env that targets dev)
     - Rails: `rake db:migrate RAILS_ENV=staging`
     - golang-migrate / sqlx / drizzle: repo-specific.
   - **Seed files** edited: run the repo's seed command against the dev/staging DB, if and only if the seed is intended to re-apply on every deploy. Some repos re-seed only on schema reset — read `CLAUDE.md` or the seed script's docstring. Examples:
     - Prisma: `pnpm dlx prisma db seed -- --deployed`
     - Repo Makefile: `make seed DEPLOY=1`
   - **Migration ordering matters.** If the deployed code is incompatible with the OLD schema, run the migration BEFORE the deploy completes. If it's compatible (additive change), order is less load-bearing but still prefer migrate-first. If the repo's `CLAUDE.md` documents an ordering rule, follow it verbatim. When in doubt, surface to user and ask.

9. **Wait for deploy to finish.** Merging triggers a redeploy on most repos. Running deployed e2e against the old revision tests nothing. The deploy infra varies:

   - **Cloud Build / Cloud Run (GCP)**: GCP assigns Cloud Build jobs to random regions. Check ALL of them every time:
     ```bash
     for region in us-east1 us-central1 us-west1 europe-west1 asia-east1 global; do
       echo "=== $region ===" && gcloud builds list --limit=3 --region=$region --format="table(id,status,startTime,tags)" 2>&1
     done
     ```
     Wait for WORKING → SUCCESS. If FAILED, stop and surface.
   - **GitHub Actions deploy job**: `gh run list --workflow=deploy.yml --limit=3` against the merge SHA. Wait for `completed/success`.
   - **Vercel / Netlify / Fly / Render**: provider CLI (`vercel inspect`, `netlify status`, `fly status`, `render services list`) or wait for the GitHub deployment status (`gh api repos/<owner>/<repo>/deployments?ref=<sha>`).
   - **No deploy infra detected**: state that explicitly and skip to step 10.

   If the deploy is QUEUED / pending for >10 min, surface to the user — don't silently keep polling.

10. **Run deployed smoke / e2e against the new revision.**

    - **Smoke** (always, if a deployed URL exists): hit the repo's health endpoint until 200. Detection order: `CLAUDE.md` override → `/health` → `/healthz` → `/ping` → FastAPI `/docs` → root `/`. Confirm the response body or status indicates the new revision is live (e.g. version string, build SHA, `env: <expected>`).
    - **E2E** (if a deployed e2e harness exists): run it. Detection: `make test-e2e` / `make e2e` target, `pnpm test:e2e:deployed` script, `pytest tests/e2e`, `playwright test --config=e2e.deployed.config.ts`. **State of dev server**: if the e2e harness expects a local dev server, restart it cleanly first (`pnpm kill && pnpm dev` or equivalent) — stale dev servers run old code on hot-reload frameworks (tsx watch, Next dev) and produce false greens.
    - If no e2e harness exists, smoke is the gate. Say so explicitly: "no e2e harness configured, smoke = `curl /health` = OK".

11. **Final state.** Kill any background dev server. **Confirm working dir is on the default branch** (`git rev-parse --abbrev-ref HEAD`). Report the merge SHA, the deploy ID (Cloud Build / Actions run / Vercel deployment), and the smoke/e2e result.

## Mode B — `--production` adds a forward-merge

After Mode A's step 11 completes successfully, perform the forward-merge:

12. **Prompt for prod authorization.** Required phrasing: "merge `main` → `production`? This is a live production promotion." Wait for the user to type an explicit `yes` (lowercase, exact). Do NOT accept "y", "ok", "go", "sure". If they type anything other than `yes`, abort and stay on `main`.

13. **Forward-merge.** Production promotions are NEVER done via PR. Forward-merge only:
    ```bash
    git checkout production && git pull
    git merge --no-ff main -m "Merge main into production"
    git push origin production
    ```
    `--no-ff` preserves the merge commit; the first-parent chain stays clean.

    If the repo uses a different prod-promotion convention (release tag, branch named `release`, etc.), follow `CLAUDE.md` — but the default is `production` branch + forward-merge.

14. **Wait for production deploy.** Same shape as step 9, against the prod trigger / environment. Wait for SUCCESS.

15. **Apply prod migrations if any.** If the PR added migration files, run the repo's prod migrate command. It MUST require explicit confirmation (interactive prompt OR an env-var gate like `PROD_CONFIRM=yes`). Examples:
    - Prisma + `pnpm migrate:deploy:prod` (interactive prompt)
    - Alembic + repo-specific `make migrate DEPLOY=1 PROD=1` (or whatever the repo encodes)
    - `PROD_CONFIRM=yes <cmd>` for non-TTY contexts — only if the user authorized unattended prod migrations in this conversation.

    **If the migration is destructive** (column drops, type changes that could fail on existing data, NOT NULL on a populated column, table renames): prompt the user explicitly with "This migration is destructive. Confirm you've coordinated a deploy window and have a recent backup. Type 'destructive ok' to proceed." Don't accept generic `yes`.

16. **Apply prod seed if any.** Same shape as step 15.

17. **Run prod e2e** (if the harness supports a prod target). This is the only gate that catches prod-only wiring bugs (real auth tokens, real provider webhooks, real env binding). If red, the promotion has already shipped — alert the user immediately and surface the failures; do NOT attempt to revert silently.

18. **Prod smoke.** Hit the prod health endpoint. Confirm HTTP 200 and the response indicates `env: production` (or equivalent). Confirm at least one gated endpoint behaves correctly under the prod auth layer (e.g. returns 401, not 500 — meaning the auth code is wired, not crashed).

19. **Return to default branch.** `git checkout main` (or whichever is default). NEVER leave the working directory on `production`. If you do, future commits in this session may accidentally land on prod.

20. **Final report.** Summarize: merge SHA on main, merge SHA on production, both deploy IDs, prod migration ID if applied, e2e/smoke result.

## Anti-patterns (do not do these)

- Do not merge a PR with red CI without explicit, quoted-back user authorization.
- Do not assume which region / queue / dashboard the deploy lives in — sweep or query, never guess.
- Do not merge a PR whose base is anything other than the repo's default branch (without explicit override).
- Do not `git push --force` to `main`, the default branch, or `production`. Never. Not even to "fix" something.
- Do not run prod migrations or prod seeds without either an interactive `yes` prompt or an authorized non-interactive env gate.
- Do not skip the dev-server restart cycle before any e2e on hot-reload frameworks — stale servers run old code and produce false greens.
- Do not promote to `production` via PR. Forward-merge only.
- Do not skip the prod e2e step because "it just takes too long". The prod e2e is the only gate that catches prod-only wiring bugs.
- Do not leave the working directory on `production` after a promotion. Always check out the default branch before reporting done.
- Do not run `--production` without first having completed the deployed-e2e/smoke step from Mode A. The skill enforces this ordering for a reason: catch issues against the same code as prod *before* it ships to prod.
- Do not invent commands. If you don't know the repo's migrate / seed / e2e command, stop and ask.

## Edge cases

- **PR base isn't default**: stop. Tell the user "PRs to non-default branches are forbidden by repo policy. To direct-merge to production, the user must explicitly state in the conversation 'yes, merge PR #N directly to production' and you must quote it back for confirmation."
- **No PR found for current branch**: ask the user for the PR number. Don't guess from the branch name.
- **Deploy is QUEUED for >10 min**: surface to the user. Don't silently keep polling; the user may want to investigate (quota, trigger misconfig, etc.).
- **Migration is destructive (column drops, type changes)**: prompt the user explicitly per step 15 wording.
- **`.env.production` / prod credentials file missing or incomplete**: surface to the user before running anything that needs it. Do not patch missing values; the source of truth is the prod secret manager (GCP Secret Manager, AWS Secrets Manager, Vercel env vars, etc.).
- **Repo has no `gh` remote configured**: every step that uses `gh` falls back to whatever the repo's actual workflow is (manual merge via web UI, GitLab `glab`, BitBucket `bb`). Surface and ask; don't invent.
- **Repo has no CLAUDE.md**: still run the skill, but state the assumptions you're making about migrate / seed / e2e commands and ask for confirmation before running them.
