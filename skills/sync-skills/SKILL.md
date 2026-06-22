---
name: sync-skills
description: Synchronize devkit skills across Claude Code, Codex, and Cursor, repairing small symlink or Codex metadata drift and reporting larger gaps for user decisions.
disable-model-invocation: false
---

# Sync Skills

Run this when the user wants to check or repair skill synchronization across Claude Code, Codex, and Cursor.

## Model-tier freshness

Before changing, generating, validating, or recommending anything related to `x-devkit-model-tier`, model aliases, or "highest" model behavior, browse the current official provider documentation. Do not rely on model cutoff knowledge.

Check official sources for:

- Claude Code model configuration and current strongest/highest-tier alias or model guidance.
- OpenAI/Codex current frontier coding or professional-work model guidance.
- Cursor current model selection guidance, including whether Auto/Max Mode or named models are the recommended strongest setting.

If browsing is unavailable, stop and tell the user that model-tier sync is blocked because the current strongest models could not be verified. Never downgrade, replace, or hard-code model choices from memory.

## Workflow

1. Perform the model-tier freshness check above if any skill has `x-devkit-model-tier` or if the requested sync touches model policy.
2. From the devkit repo root, run `node scripts/sync-skills.js --apply`. To limit link repair to selected environments, pass `--envs=claude,codex,cursor` with the desired subset or set `DEVKIT_AI_ENVS`.
   - To intentionally import an external installed skill into devkit, pass `--force-import=<skill>`, for example `--force-import=notebooklm`.
   - If the same external skill exists in multiple selected sources, qualify it as `--force-import=claude/notebooklm`, `--force-import=codex/notebooklm`, or `--force-import=cursor/notebooklm`.
3. If the script only reports fixed metadata or symlink drift, summarize what changed.
4. If the script reports "Needs user decision", stop and show those gaps to the user. Do not overwrite non-symlink user skill directories or delete skills from any environment without explicit approval.
   - If a gap is a skill the user installed separately and does not want devkit to manage (so it gets flagged on every run), add it to the ignore list rather than re-flagging it. See "Ignore list" below.
5. If files changed, run `./scripts/smoke.sh` before finishing.

## Ignore list

`sync-skills.ignore` at the repo root suppresses the "installed skill is not present in devkit/skills" gap for named skills — for skills installed separately that devkit should not manage and should stop nagging about.

- The file is **gitignored**; entries are per-user and never reach this public repo. Only `sync-skills.ignore.example` is committed (copy it to start).
- Format: one entry per line; blank lines and `#` comments (whole-line or trailing) skipped. A bare `<name>` ignores in every environment; `<env>/<name>` (env = `claude`/`codex`/`cursor`) ignores only there. Entries are matched as exact strings, not validated — a typo is inert, never fatal.
- The list only suppresses gap *reporting*. It never deletes anything and does not affect linking devkit-managed skills into the environments.

## Replicate list

`sync-skills.replicate` at the repo root lists skills that **another tool owns** — installed into the Claude Code user scope (`~/.claude/skills/<name>`) by, e.g., the `cbc` binary — that you want devkit to **fan out** to Codex and Cursor without importing or owning them. For each listed name with an installed owner copy, sync symlinks `~/.codex/skills/<name>` and `~/.cursor/skills/<name>` to the owner copy.

- devkit does **not** import or manage these skills — the owning tool installs and updates them. Listing a skill here also suppresses the "installed but not in devkit" gap for it (no need to also add it to the ignore list).
- The file is **gitignored**; entries are per-user. Only `sync-skills.replicate.example` is committed (copy it to start).
- Format: one bare skill name per line; blank lines and `#` comments (whole-line or trailing) skipped.
- If the owner copy isn't installed, the entry is **inert** — nothing happens. An empty or absent list is a complete no-op, so devkit has zero dependency on the owning tool.
- A **real** (non-symlink) directory already at a target path is reported as a big gap, never clobbered.
- **Caveat:** replicated skills get the symlink only — no generated Codex `agents/openai.yaml`. Codex still loads the skill; it just lacks the generated `interface:` metadata that devkit-owned skills carry.

## Policy

- Small fixes are missing skill symlinks, stale symlink targets, and generated `agents/openai.yaml` drift.
- Big gaps are installed skills that do not exist in `devkit/skills`, non-symlink skill directories/files in any target environment, or invalid skill frontmatter.
- `--force-import=<skill>` turns one named external installed skill into an explicit user decision: copy it into `devkit/skills`, generate Codex metadata from its frontmatter, and replace the original installed directory with the managed symlink.
- Codex metadata is generated from each `SKILL.md` frontmatter description. Improve that description when the generated summary needs better wording.
- Running `node scripts/sync-skills.js` without `--apply` is a dry run and must not write files.
