---
name: evaluate
description: Post-implementation review — summarizes what was built, then quizzes you on design decisions and tradeoffs. Use after finishing a feature (via /tdd or otherwise) to verify you understand what was done and why.
---

# Evaluate

Post-implementation review. Two phases: the agent summarizes what was built, then quizzes you on it.

## Phase 1: Summary

### 1. Determine scope

Figure out what was implemented. In order of preference:

1. `git diff main...HEAD --stat` and `git log main..HEAD --oneline` — if on a feature branch
2. Ask the user for the base branch if `main` doesn't exist or looks wrong
3. If not in a git repo, ask the user to point you at the relevant files

Also check: is there a PRD issue linked to this work? Look for issue references in commit messages or branch name. If found, fetch it with `gh issue view` — useful context for assessing whether the implementation matches the plan.

### 2. Read the changed files

Read every file that was added or significantly modified. Skim files with only minor changes (imports, config). You need to understand the actual implementation, not just the diff hunks.

### 3. Present the summary

Structure as follows:

**What was built** — One paragraph. What does this feature/fix do from the user's perspective?

**Architecture** — An ASCII diagram showing how the new/modified components relate to each other and to existing code. Use box-and-arrow ASCII art — this runs in a terminal, not a markdown renderer. Only include components relevant to the change.

Example:
```
  [OrderController] ──▸ [OrderService] ──▸ [PaymentGateway]
                              │
                              ▾
                        [OrderRepo]
```

**File tree** — Changed files in their directory context. Mark new files with `(new)` and modified files with `(mod)`.

**Key decisions** — Bullet list of non-obvious implementation choices. Why THIS way? What were the alternatives? If a PRD exists, note deviations from the original plan.

**Test coverage** — Which behaviors are tested? Which are not? Name the test files and what they verify.

### 4. Ask for corrections

After presenting the summary, ask: "Does this match your understanding? Anything I got wrong or missed?"

Fix inaccuracies before moving to Phase 2.

---

## Phase 2: Quiz

### Purpose

Force the user to engage with implementation details. Not a comprehension test — a conversation about tradeoffs, risks, and design quality.

### Rules

- Ask **one question at a time**. Wait for the answer before proceeding.
- Show the **relevant code snippet** with each question, along with the file path and line number (e.g. `src/orders/order.service.ts:42`). The user should not need to open their editor, but should be able to jump there if they want to.
- Ask **5-7 questions** total. Quality over quantity.
- If the user's answer reveals a misunderstanding or a genuine issue, say so directly.
- If the answer is solid, say so briefly and move on. Do not pad with praise.

### Question categories

Pick the ones most relevant to THIS implementation. You do not need to hit every category.

**Design rationale** — "This module exposes [interface]. Why this shape instead of [alternative]?"

**Error paths** — "What happens when [dependency] fails here?" (Show the handling, or the lack of it.)

**Test gaps** — "This behavior [X] is not covered by tests. Intentional? What is the risk?"

**Coupling** — "This depends on [Y]. If Y changes its interface, what breaks?"

**Naming and abstractions** — "This is called [name]. Does that still make sense given what it does?"

**Future maintenance** — "If you needed to add [plausible extension], how much would you change?"

### Wrap up

Brief honest assessment:

- What is solid about the implementation
- What you would reconsider (if anything)
- Concrete suggestions (specific and actionable, or nothing)

Do NOT produce a written artifact. The value is the conversation.
