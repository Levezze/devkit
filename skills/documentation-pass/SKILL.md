---
name: documentation-pass
description: Holistic documentation audit. Runs documentation-scholar over CLAUDE.md, docs/, README, and ADRs against the current codebase and the invoking chat's context. Returns findings + a plan; waits for approval before applying. Use after major refactors, architecture decisions, or when CLAUDE.md feels cluttered/stale.
disable-model-invocation: false
---

# Documentation Pass

Audit-and-update workflow for project documentation. Use after major refactors, architecture decisions, or when `CLAUDE.md` is starting to feel bloated, mutable, or stale.

## How it works

This skill **does not edit files in its first turn.** It produces a findings + suggestions + apply plan, surfaces them in chat, and waits for explicit user approval. Only on a follow-up turn does it apply the changes.

The skill delegates the audit to the `documentation-scholar` subagent. The subagent does NOT have access to the conversation that invoked the skill, so the orchestrator must pass it a summary of the current chat's relevant decisions and changes.

## Rules of thumb for `CLAUDE.md`

`CLAUDE.md` is loaded into every session for this project. It is the most expensive surface to bloat. Two filters apply on every audit:

**1. No mutable or temporary state.** File paths, route lists, specific module names, "current schema", architecture snapshots — these change with normal feature work. They belong in code (where they're authoritative), in feature docs, or in an ADR (frozen by definition). Examples to remove on sight:

- `## Important API Endpoints` listing every route
- "Current schema" sections enumerating models
- Lists of every module / every flag / every environment variable
- "We just added X" running notes

**2. Only content relevant to ≥90% of chats.** If a piece of guidance only matters when working on one feature, one workflow, or one subsystem, it does not belong here. Things that DO belong:

- Stack and tooling (the runtime, ORM, validator, linter)
- Workflow rules followed every session (branch protection, commit conventions, "never edit X without doing Y")
- Hard-won "stop making this mistake" guidance (e.g. "Cloud Build assigns random regions, always check ALL regions")
- Project-specific scripts an agent must use correctly (seed scripts, dev auth bypass, dev users, migrations on merge)
- Environment file inventory and what each is for

When in doubt: would the next ten chats all benefit from this line? If no, cut.

## Rules for `docs/`, `README.md`, `docs/README.md`

- Reflect *current* state truthfully. Prune stale "we plan to..." or "we used to...".
- Avoid exhaustive enumeration that goes stale (every route, every model, every flag). Describe the *shape* and point at the source of truth (`prisma/schema.prisma`, the routes file).
- `README.md` and `docs/README.md` are entry points. If they reference structure that has moved, fix the references.
- File paths in prose are brittle. Reference by concept ("the questionnaire service"), not by coordinate (`src/.../questionnaire.service.ts:42`), unless the path is the whole point.

## ADR rules

- **Never edit existing ADRs.** They are an audit trail. If a decision is superseded, write a new ADR that says so and links the old one.
- If the invoking chat introduced a material architectural decision (new layer, new pattern, schema rationale, deprecation), add a NEW ADR using the documentation-scholar's template.
- Threshold for adding an ADR: would a future engineer want to know *why* this was decided, not just *what* it is? If yes, write one.

## Brittle-doc anti-patterns the audit flags

- File paths in prose ("see `src/foo/bar.ts:42`") — move with refactors.
- "Current X is Y" snapshots — point at the source instead.
- Exhaustive enumeration meant to be comprehensive — desyncs silently.
- Roadmap content masquerading as docs — belongs in an issue.
- Outdated migration history embedded in the README.
- Examples that import from paths that no longer exist.

## Workflow

1. **Orchestrator summarizes the chat.** In one paragraph, capture: what was refactored or built in this conversation, what architectural decisions were made, what new patterns were established, what was deprecated. This is the input documentation-scholar cannot otherwise see.

2. **Orchestrator spawns `documentation-scholar`** with a prompt that includes:
   - The chat-context summary from step 1.
   - A directive to inspect: `CLAUDE.md`, `docs/` (recursive), `README.md`, `docs/README.md`, the project's ADR directory (typically `docs/architecture/adr/` or `docs/adrs/`).
   - A directive to also inspect: `git log --oneline -30`, `gh pr list --state merged --limit 10` (or equivalent), to see what actually shipped recently.
   - The rules from this SKILL.md (CLAUDE.md filters, ADR rules, anti-patterns).
   - The output contract (see step 3).

3. **Subagent returns a structured response:**
   - **Findings**: per-file. What's stale, what violates the rules, what's missing.
   - **Suggested edits**: specific, line-referenced. Cuts and rewrites, not vague "consider revising".
   - **Proposed new ADRs**: title + status + 1-2 line rationale each. Full ADR drafts come in the apply phase, not the audit phase.
   - **Apply plan**: ordered list of file operations the user can approve as a unit or piecewise.

4. **Orchestrator surfaces the response to the user verbatim** and waits for explicit "go" / "apply" / "approve A and C, drop B" before doing anything else. No auto-apply.

5. **On approval, orchestrator delegates the apply** to documentation-scholar (or applies directly, depending on scope). Each ADR added gets its own write; CLAUDE.md / README edits go through Edit, not Write, to preserve unrelated content.

## Output contract

- First turn: **plan only**, in chat. No file writes in the audit phase.
- Follow-up turn after explicit user approval: **apply**.
- Never modify existing ADRs.
- Never write a new ADR without the user's go-ahead on it specifically.

Context: $ARGUMENTS
