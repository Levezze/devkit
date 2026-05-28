# ADR 0001 — No `model:` pin in skill frontmatter

- Status: Accepted
- Date: 2026-05-28
- Applies to: `skills/*/SKILL.md` (notably `pr-review`, `fix-pr-review`)

## Context

`pr-review` and `fix-pr-review` were pinned to `model: claude-sonnet-4-6` (with
`effort: high`) to keep the heavy review/fix loop off Opus and save plan quota.

This broke any session running the 1M-context model variant. With an interactive
session on `claude-opus-4-8[1m]`, invoking either skill failed with:

```
API Error: Usage credits required for 1M context · run /usage-credits to turn
them on, or /model to switch to standard context
```

### Mechanism

When a skill's frontmatter pins a `model:`, Claude Code switches to that model but
**keeps the session's context-window variant**. A session on `…[1m]` therefore runs
the pinned model as `claude-sonnet-4-6[1m]`.

The 1M context window is billed differently per model:

- **Opus + 1M** — covered by the Max/Team/Enterprise plan. No extra credits.
- **Sonnet + 1M** — requires usage credits on every plan.

So an Opus 1M session works for free, but the moment a skill pins Sonnet it becomes
Sonnet 1M, which demands credits — hence the error. This session proved it directly:
identical session, only the model differed.

There is **no frontmatter field to force the standard (200k) context window**. The
error's own remedy text offers only session-level fixes (`/model` to standard, or
`/usage-credits`). `context: fork` runs the skill in a subagent but (a) is unverified
to escape the `[1m]` flag, and (b) strips conversation history — fatal for
`fix-pr-review`, which reads externally-pasted reviews from the invoking message and
performs a stateful edit → build → test → commit → push.

## Decision

**Do not pin a non-Opus `model:` in skill frontmatter.** Skills inherit the session
model. The `effort:` line was dropped alongside it for the same skills (it was added
in the same change and is not worth keeping in isolation).

A pin is only safe if the pinned model is covered at the session's context tier for
your plan. Since the default working sessions here run Opus 1M, any Sonnet pin
re-breaks. Inheriting the session model is free and matches the model the user already
chose.

## Consequences

- `pr-review` / `fix-pr-review` run on whatever model the session is on (Opus 1M by
  default) — no error, no credit charge.
- The original goal (keep these off Opus to save quota) is **not** met by a pin. If
  Opus burn on these skills becomes a measured problem, solve it at the session level:
  run them from a standard-context session (`/model` off 1M) where a Sonnet pin would
  again be free, or toggle the session model before invoking.
- New skills: only add `model:` if you have verified the pinned model is plan-covered
  at the context tiers you actually run. When in doubt, omit it.
