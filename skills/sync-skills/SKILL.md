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
3. If the script only reports fixed metadata or symlink drift, summarize what changed.
4. If the script reports "Needs user decision", stop and show those gaps to the user. Do not overwrite non-symlink user skill directories or delete skills from any environment without explicit approval.
5. If files changed, run `./scripts/smoke.sh` before finishing.

## Policy

- Small fixes are missing skill symlinks, stale symlink targets, and generated `agents/openai.yaml` drift.
- Big gaps are installed skills that do not exist in `devkit/skills`, non-symlink skill directories/files in any target environment, or invalid skill frontmatter.
- Codex metadata is generated from each `SKILL.md` frontmatter description. Improve that description when the generated summary needs better wording.
- Running `node scripts/sync-skills.js` without `--apply` is a dry run and must not write files.
