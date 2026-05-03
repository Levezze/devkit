---
name: e2e-playwright-test
description: "LLM-piloted end-to-end smoke against a deployed app. Drives Playwright MCP through a repo-specific checklist stored at docs/guides/e2e-playwright-test.md. If the guide is missing or has unfilled slots, runs a /grill-me interview to populate it. Args: --demo | --dev | --local | --prod (env), optional --user <N> (1..N from guide), --record-only (observe + update fixtures, skip pass/fail). Use when user wants to run e2e, smoke-test the app, validate a deploy, or mentions /e2e-playwright-test."
---

# e2e-playwright-test

## Philosophy

End-to-end testing is **observation against a checklist**, not deterministic assertions. The script is plain English in `docs/guides/e2e-playwright-test.md`. The runner is an LLM piloting Playwright MCP. When reality drifts from the recorded checklist (a button label changed, a new question appeared in the questionnaire), the LLM **improvises the right action AND records the drift** so the next run uses the updated expectation.

This trades reproducibility for resilience. A deterministic Playwright spec breaks every time the UI ships a copy change. An LLM-piloted run keeps going and updates the script.

## When to use

- After deploying to demo / dev / prod, to validate the user-facing flow.
- After an upstream API contract change, to verify the client absorbs it.
- Before merging a PR that touches onboarding, subscription, or pet flows.
- Operator-driven only. Not a CI tool — it requires Playwright MCP and a live browser.

## Prerequisites

- **Playwright MCP** is available. Without it, abort and tell the user to enable the Playwright MCP server.
- **Current working directory is a repo** with a `docs/guides/` directory. The skill writes to `docs/guides/e2e-playwright-test.md` in that repo.
- **A test user** in the target environment. The skill asks for credentials at run time — do **not** embed passwords in the guide.

## Workflow

### 1. Preflight

- Confirm Playwright MCP is loaded. Fetch the schemas via ToolSearch if not already resolved (`select:mcp__playwright__browser_navigate,mcp__playwright__browser_click,...`).
- Locate `docs/guides/e2e-playwright-test.md` from `git rev-parse --show-toplevel`. If absent, **bootstrap** (next step).

### 2. Bootstrap (only when guide is missing or has empty slots)

Run a short `/grill-me`-style interview to populate the guide. Ask the user, one block at a time, and write each answer into the guide as you receive it:

1. **Environment table** — for each of `local`, `dev`, `demo`, `prod`:
   - Client URL (e.g., `https://demo.aevark.com`).
   - Dev-gate key var name + value (or whether the gate is bypassed in this env).
   - API URL (often already in `.env.*` — propose the value, ask user to confirm).
2. **Test users** — at least one email per env. Tell the user passwords stay out of the guide; the skill asks for them at run time.
3. **Pet A / Pet B fixtures** — propose sensible defaults (a DOG and a CAT with realistic name, breed, sex, DOB, weight, neutered, etc.). User confirms or amends.
4. **Questionnaire answers** — initially empty. Propose a leave-as-`[record on first run]` placeholder for every question; the first run captures actual answers and the user reviews.
5. **Expected dashboard content** — what the user-facing dashboard renders post-onboarding. Propose: pet name, species, age, "Schedule appointment" CTA, journey path = `first_appointment`. User confirms.

After the interview, write the guide and **stop**. Show the user the file path; ask them to skim before proceeding to the run.

### 3. Arg parsing

`$ARGUMENTS` is the user's free-form arg string. Parse:

- **Env flag** (required, exactly one): `--demo`, `--dev`, `--local`, `--prod`. Default to `--demo` if missing.
- **`--user <N>`** (optional): pick the Nth test user from the guide's "Test users" table for the chosen env. Default: the first user not yet in the guide's "Used users log" for this env, or user 1 if log is empty.
- **`--record-only`** (optional): skip pass/fail; observe and write any drift / new fixtures into the guide. Useful after a UI change, to refresh the checklist without burning a test user.
- **`--prod`** triggers a confirmation prompt before any browser action. Production has real Stripe and real users — never act without explicit "yes, continue".

Ask the user for the test user's password before navigating. Never log passwords.

### 4. Run loop

For each checklist item in the guide's "Checklist" section, in order:

1. **Plan the action** — read the item, decide what Playwright primitives to call.
2. **Execute** — `browser_navigate`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, etc.
3. **Observe** —
   - `browser_snapshot` (DOM accessibility tree) for structure checks.
   - `browser_take_screenshot` for visual checks.
   - `browser_console_messages` for unexpected `console.error`.
   - `browser_network_requests` to verify expected API calls and status codes.
4. **Compare** — does the observed state match the guide's recorded expectation?
   - **Match** → mark ✅, continue.
   - **Drift, intent preserved** (button renamed, form reordered, copy edited) → improvise the equivalent action, record the drift in a buffer for the user, mark ⚠️, continue.
   - **Genuine break** (route 404, selector vanished with no equivalent, network 5xx that wasn't documented) → mark ❌, capture screenshot + DOM + console + network for the report, **stop the run** so the user can fix and retry with a different test user.
5. **Pause for human action when the script says so** — Stripe checkout, MFA codes from a real inbox, anything that requires the user. Wait for explicit user input before resuming.

### 5. Always-on observers

Independent of the checklist, throughout every run:

- **Console**: any `error`-level message that isn't on the guide's allowlist is a finding. The skill aggregates and reports them at the end.
- **Network**: watch for the documented contract calls (e.g., `POST /v1/journeys/paths { register }` should return 409 on first signup post-API-PR-#344). Flag any deviation.
- **No flash redirects**: if `pathname` transitions through `/dashboard` mid-onboarding without the user clicking "Go to dashboard", that's a finding (see CLAUDE.md "Source of truth" rules).
- **DEV/DEMO badge**: present on every header in non-prod envs.

### 6. Reporting

End the run with a single message:

```
e2e-playwright-test against <env> with <email>

[checklist]
✅ Step 1 — Landing → Sign in
✅ Step 2 — Dev gate
...
⚠️ Step 7 — Pet form (drift: "Date of birth" label is now "Birthday")
❌ Step 12 — Second pet journey shows "follow_up", expected "first_appointment"

Console errors: 0
Network: 1 unexpected 500 on /v1/profile/prefill
Screenshots: 8 (paths listed)

Drift queued for guide update:
- Pet form: "Date of birth" → "Birthday"
- Questionnaire: new question "Has your pet been spayed/neutered?" appeared

Want me to write the drift updates into docs/guides/e2e-playwright-test.md? (yes / review-first / skip)
```

If the run hit ❌, **do not propose fixes**. Surface the finding; let the user decide.

### 7. Used users log

After every run (regardless of outcome), append a row to the guide's "Used users log":

```
| 2026-05-02 | demo | client-test-1+demo@aevark.com | ✅ pass |
```

This lets the next invocation pick the next unused user via `--user <N+1>`. Three users = three retries. After exhaustion, ask the user to reseed.

## Anti-patterns

- **Don't** write deterministic Playwright spec files alongside this skill. The whole point is LLM-piloted resilience.
- **Don't** hard-code selectors in the guide. Use semantic descriptions ("the green Subscribe button", "the input labeled 'Pet name'") and let the LLM resolve them.
- **Don't** embed passwords or API keys in the guide. Public dev-gate keys (e.g., `aevark-dev-2026` already shipped in `.env.demo`) are fine; user passwords are not.
- **Don't** silently skip a failing step. Every ❌ stops the run and the user is notified.
- **Don't** auto-merge drift updates without showing the user. Drift is signal — the user reviews before the guide changes.
- **Don't** use `--record-only` to mask a real failure. If a step fails because the API broke, that's a finding, not drift.

## Composition with other skills

- **`/grill-me`** powers the bootstrap interview. The skill invokes that pattern internally; do not call `/grill-me` separately.
- **`/ddd`** is for appearance verification (3 viewports, screenshot loop). e2e-playwright-test is for **flow** verification (signup → onboarding → second pet → logout). Don't conflate them. If the user wants both, run them as separate invocations.
- **`/pr-review`** runs after this skill on PR-related work. e2e-playwright-test answers "does the live flow work"; pr-review answers "does the diff hold up to scrutiny."
