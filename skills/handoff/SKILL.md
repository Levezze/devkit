---
name: handoff
description: Generate a handoff document from the requesting side's perspective to another team, repo, or agent. Enforces strict separation of concerns — describe what you have, what you need, and why, without prescribing how the receiver should implement it. Use when the user invokes `/handoff <target> <topic>` (e.g. `/handoff api for slider question labels`, `/handoff design for subscribe CTA`).
disable-model-invocation: false
---

Write a handoff document from the **requesting side's perspective** to another team, repo, or agent. Output is always a markdown file at `/tmp/handoff-<slug>.md` unless the user explicitly specifies a different path.

## Core principle — Separation of Concerns

You are writing **from the requester, to the receiver**. Stay on your side of the fence.

**Do include:**
- What you have today (your current shape, your current consumers).
- What you're changing on your side.
- Why — the user value, the trigger.
- What you need from the receiver, stated as a need not a solution.
- Your constraints (backward-compat you need to preserve, timing, caps).
- The contract shape you'd consume, framed as desire not demand.
- Open questions the receiver is better placed to answer.

**Do NOT include:**
- How the receiver should implement it (schemas, table designs, endpoint URLs, library choices, migration strategies, test approaches on their side).
- Prescriptive "you should...", "add this column", "write this migration", "use Postgres JSONB".
- The receiver's internal architecture decisions.
- Timing or estimates for the receiver.
- Their deployment sequence.

If you catch yourself writing prescriptive language for the receiver, stop and rewrite from the "we have / we need / we'd consume" angle. Leave design space.

### Good vs bad framing

**Bad (prescriptive):**
> Add a `per_position_labels` JSONB column to the `question_scale_config` table. Update the workspace editor to author these. Run a migration with empty defaults.

**Good (needs-based):**
> We need a way to associate per-position label text (and optional detail copy) with a scale question. The workspace editor will author this. We don't currently have a place in the scale answerConfig shape for this data. The shape we'd consume looks like `{positionInt → {label, detail?}}`, but the storage and API shape are your call.

---

## Process

1. **Parse the invocation**: `/handoff <target> <topic>` — where target is the receiver (e.g. `api`, `design`, `platform`, `backend`, a repo name) and topic is the feature/change. If either is unclear, ask before writing.

2. **Gather context**: draw from the current conversation. If conversation context is thin, ask the user 1–3 targeted questions. Don't fabricate.

3. **Draft the handoff** using the template below. Enforce SoC throughout — any sentence that starts "you should" or prescribes receiver-side mechanics is a rewrite signal.

4. **Write the file** to `/tmp/handoff-<slug>.md`. Slug format: `<target>-<topic-kebab>` (e.g. `api-slider-question-labels.md`). Only write elsewhere if the user said so.

5. **Report back in chat** with a structured, email-header-style block. The user copies the whole block verbatim and pastes into the receiving agent / PR / Slack / wherever. No commentary outside the block. No recap of the handoff content.

   Fields (in this order):

   - **From:** the requesting side — repo name + short scope (e.g. `mvp-client onboarding polish`).
   - **To:** the receiver — repo name or team (e.g. `mvp-api`, `design`, `platform`).
   - **File:** the full path to the handoff markdown file.
   - **Subject:** a concise one-line summary of what's being requested. Names the thing + the nature of the ask. No period at the end.

   Example chat output (your entire response):

   ```text
   From: mvp-client onboarding polish
   To: mvp-api
   File: /tmp/handoff-api-slider-question-labels.md
   Subject: Scale question labels — per-position shape for slider UX
   ```

---

## Template

```markdown
# Handoff: <topic> → <target>

**From:** <requesting side, e.g. "mvp-client onboarding polish">
**Date:** <YYYY-MM-DD>
**Related:** <issue/PR/PRD link if known from conversation>

## Context

Short narrative: what we're building on our side and why. 2–5 sentences. Name the user value. Link the driving issue if available.

## Current state (our side)

The shape of things as they exist today — our types, our consumers, our integration points. Concrete but scoped to our surface area. Skip internal details the receiver doesn't need.

## What we're changing (our side)

What we're adding or modifying on our end. Keep this tight and behavioral — what the change accomplishes, not every file touched.

## What we need from you

Stated as a need, not a solution. The capability we require, the data shape we'd consume, the behavior we expect. Examples:

- "We need X to carry Y" rather than "add column Y to X".
- "The shape we'd consume looks like Z" rather than "design it as Z".

If a receiver-side design constraint matters to us (e.g. we need it backward-compatible because we have users on the old shape), say so.

## Why

The reason — user value, business driver, what prompted this. So the receiver can make intelligent design tradeoffs on their side.

## Our constraints

Anything from our side that affects the receiver's choices:
- Backward-compat we need to preserve
- Timing windows (releases, freezes)
- Payload / latency / size caps we work within
- Environments involved (dev, demo, production)

## Not our place

Explicit list of decisions we are NOT prescribing. This is a SoC signal to the receiver: "these are yours to decide." Examples:
- Storage shape
- API versioning scheme
- Migration strategy
- Test strategy on your side

## Open questions for you

Things we can't decide from our side. Frame as questions, not requirements:
- "Should this ship behind a feature flag on your side?"
- "Is this best as a new field or an extension of the existing one?"

## How to reach us

Repo, channel, or person. Default to the requesting repo + the conversation author if unknown.
```

---

## Invocation examples

- `/handoff api for slider question labels`
  → `/tmp/handoff-api-slider-question-labels.md`

- `/handoff design for subscribe CTA glass treatment`
  → `/tmp/handoff-design-subscribe-cta-glass-treatment.md`

- `/handoff platform for onboarding feature flag`
  → `/tmp/handoff-platform-onboarding-feature-flag.md`

- `/handoff backend perPosition labels schema --to docs/handoffs/api-labels.md`
  → writes to the specified path instead of `/tmp/`.

---

## Anti-patterns to avoid

- **Writing a specification** instead of a handoff. You're not designing the receiver's system — you're describing your need and leaving them room.
- **Nested implementation plans**. Don't list "step 1, step 2, step 3 of how the API team should do this." That's their work.
- **Copy-paste PRD content**. A PRD is requirement-level; a handoff is interface-level and cross-team. Reframe.
- **Prescribing data shapes as requirements**. The shape you'd "like to consume" is a preference, not a contract — the receiver may counter-propose.
- **Including your own implementation plan**. The receiver doesn't need your to-do list. One sentence on your side's timing is enough.
- **Forgetting the "Why"**. Without it, the receiver can't make tradeoff decisions.
