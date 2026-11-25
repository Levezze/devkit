---
name: planning
description: Plan a feature, architecture change, refactor or migration in deepening phases (intent, system, code plan, walkthrough), persisted as numbered documents, with a timeline, review tiers and an optional GitHub breakdown.
disable-model-invocation: true
---

# Planning

Plan work of any size in **deepening phases**: each phase zooms one level closer to the code, and each writes a document a human or an agent can pick up cold. The user steers from one **start card** at the beginning and one **checkpoint card** after every phase. Both cards have a fixed format, identical on every run, so the user learns to read them at a glance.

Two stages, kept apart:

- **Thinking** — the four phases. Always written to the plan folder.
- **Persisting outward** — issues, PRDs, an epic. Only what the user picks on the card, and only after they approve the exact list.

Invocations:

- `/planning <idea>` — new plan. Steps 1–6; a ❌ on any checkpoint card jumps to step 6.
- `/planning resume <slug or path>` — continue a plan. See [Resume](#resume).

## 1. Orient (facts are your job)

Look these up before asking anything. A question whose answer is on disk wastes a round.

- **Does it already exist?** Dispatch one research subagent per likely repo to survey the current state: relevant code, data, contracts, tests, recent PRs. Partial or complete existing support changes the scope, so the survey comes **before** the scale questions. Phase 2 builds on these reports.
- **Where plans live:** follow [`rules/location.md`](rules/location.md). The result is a proposed folder plus the reason.
- **Existing plan:** if a plan with this slug already exists there, offer `resume` instead.
- **Conventions:** each repo's `CLAUDE.md` / `AGENTS.md`, and whether `gh` is authenticated against a remote.
- **Product heart:** the logic the repo exists for. This becomes the proposed deep review tier.

If the survey changes what the idea means (for example, half of it has already shipped), say so in one paragraph before the scale questions.

## 2. Scale questions

Ask one round, in the [`rules/rounds.md`](rules/rounds.md) format. These are Q-1 to Q-4 (at most), each with your recommendation:

1. **Type** — feature, architecture, refactor, migration, or other. This names the folder (`features/`, `architecture/`, `refactors/`, `migrations/`, or the plural of what the user says).
2. **Repos** — which repos this touches.
3. **Envelope** — the time budget or hard date. 1 week = 5 working days.
4. **Slice** — all of it now, or only a first slice of something larger?

If a fact arrives before the card that invalidates an answer, re-ask that single question. Pick a **size** from the answers:

| Size | Looks like | Phases on by default | Walkthrough covers | Buffer | GitHub default |
|---|---|---|---|---|---|
| S | ≤ 3 days, one module, one repo | 1 (short) · 3 · 4 | deep units | 20% | issues |
| M | 1–3 weeks, a few modules | 1 · 2 · 3 · 4 | deep units | 30% | PRD + issues |
| L | 3–8 weeks, many modules or several repos | 1 · 2 · 3 · 4 | deep + standard | 40% | PRD + issues |
| XL | months, architecture, built in slices | 1 · 2 whole; 3 · 4 current slice | deep + standard | 40% of slice | epic |

The buffer is a percentage of the module sum. It gets a day value once modules have estimates (phase 2, or phase 3 when phase 2 is off) ([`rules/timeline.md`](rules/timeline.md)). If the envelope doesn't match the size's range, the card flags it.

## 3. Start card

Show it **exactly in this format**: every line present, in this order, with only the `<values>` changing. When a value doesn't fit the line, continue it on the next line, indented to the value column. Then ask the user to approve the card or edit specific lines.

```
PLAN  <slug>                          <type> · size <S|M|L|XL> (<guess|ok>)
─────────────────────────────────────────────────────────────────────────────
Envelope   <2–3 wk> · buffer <n>% of module sum   <✅ fits size | ⚠ <why>>
Repos      <repo-a>, <repo-b>                   (from: <request | survey>)
Slice      <all of it | first slice: …>
Exists     <nothing yet | what the survey found, one line>

Phases     <✅|❌> 1 Intent        why · who · when · what "done" means
           <✅|❌> 2 System        per repo: shape, modules, module days
           <✅|❌> 3 Code plan     per module: files, types, units, tiers
           <✅|❌> 4 Walkthrough   <deep units | deep + standard | all>

Docs       <proposed folder>
           (<reason>) · alt: <second option> · other
GitHub     <●|○> none <●|○> drafts <●|○> issues <●|○> PRD+issues <●|○> epic
           issues now for: <all units | current slice | —>
Review     deep: <proposed heart> · standard: rest · light: <plumbing, copy>
           security floor on every tier

Ends when  phases written → timeline aligned → GitHub step → README updated
```

When the user approves the card:

- The card's values become **D-1 onward**. Later edits to the card are new Ds.
- A docs folder outside the current repo counts as confirmed. Committing or pushing in any repo is not implied. It follows that repo's workflow, and the user says when.
- Create the plan folder with `README.md` and `log.md` from [`templates/`](templates/). Copy the card into README §0.2, record the Q-1…Q-4 answers in §0.4, and log the approval.

## 4. Phases

For each approved phase, in order:

1. Read its file: [`phases/1-intent.md`](phases/1-intent.md), [`phases/2-system.md`](phases/2-system.md), [`phases/3-code-plan.md`](phases/3-code-plan.md), [`phases/4-walkthrough.md`](phases/4-walkthrough.md). Each has a topic list, a document skeleton and a completion criterion.
2. Work the topics in rounds ([`rules/rounds.md`](rules/rounds.md)). Numbering follows [`rules/numbering.md`](rules/numbering.md).
3. Write the phase document. Update README §0.1 (where we are), §0.3 (rollup, per [`rules/timeline.md`](rules/timeline.md)), and §0.4–§0.6 (decisions, open questions, deferred). Log it with the time from `date`.
4. **Cold read.** Dispatch a fresh subagent with only the plan folder, this phase's topic list, and the instruction *"List what a reader cannot act on: ambiguous, contradictory, missing, or unestimated. Cite the §."* Fix a finding now, or turn it into a Q for the next round. That holds even when the Q belongs to an earlier phase; its answer is applied by *Going back*.
5. Show the checkpoint card. The user's reply is the sign-off. A ⚠ on the timeline line is answered in that same reply; the answer becomes a D that the next card lists. After phase 1 the timeline line shows `—` (no estimates yet).

```
CHECKPOINT  <slug> · phase <n> <name> written                        <date>
─────────────────────────────────────────────────────────────────────────────
Written    <file: §range; file: §range>
Decided    <this phase's D-ids | none>     Parked  <P-ids | none>
Open       <all open Q-ids | none>         Cold read  <n → Q-ids | clean>
Timeline   <sum> + buffer <b> = <total> vs <envelope>  <✅ | ⚠ +<x> d | —>
Revised    <earlier-phase §s edited this phase | none>
Next       ✅ <phase n+1 name | GitHub step | close>   ❌ stop (resume later)
```

## 5. GitHub step

Only if the card picked something other than *none*. Follow [`rules/github.md`](rules/github.md). Nothing is created until the user has approved the exact list of titles and bodies. Issue numbers go back into the rollup.

## 6. Close

1. Update README §0.1 so a cold reader can continue with `resume`. Name the next action (the next unwritten phase, if the user stopped early), say who or what it waits on (**the user** — which Q or approval — or **other work**), and list the modules still waiting for phases 3 and 4.
2. Report planning time, taken from the times in `log.md`, and list the Ds made this session. Decisions made during a resume appear here, because the resume card has no Decided line.

## Resume

In this order:

1. **Read** README §0.1–§0.5: where we are, the card, the rollup, the decisions (for the next free IDs), and open questions. Open other files only when a step needs them.
2. **Actuals.** Record them for units finished since the last session, from merged PRs and closed issues where possible, otherwise by asking. Check a user-given figure against the record (the log's last session time, git dates) and ask again if the two can't both be true. For each unit 50% or more over its estimate, write an **overrun report** ([`rules/timeline.md`](rules/timeline.md)).
3. **Re-run the alignment check** with the actuals. A new ⚠ becomes an open Q. A larger one reopens or updates the existing timeline Q rather than adding a second.
4. **Show the resume card**, preceded by any overrun reports:

```
RESUMED     <slug> · last: <§0.1 phase line>                         <date>
─────────────────────────────────────────────────────────────────────────────
Actuals    <U-id est→actual (+x%); … | none new>
Open       <all open Q-ids | none>
Timeline   <done> + <left> = <proj> · buffer left <b> vs <env>  <✅|⚠ +<x>|—>
Next       ✅ <open Qs | phase <n> | phases 3–4 M<k> | GitHub | build U-id>
           ❌ stop
```

5. **Answer open Qs** in a round, in every case. A question never waits a session for a branch that doesn't ask it.
6. **Continue.** Take each branch that applies, in this order:
   - **An approved phase has no document yet** (the user stopped at a checkpoint) → step 4 from that phase.
   - **GitHub step pending** → step 5. Pending means: the option is *drafts* and the bodies aren't written yet, or the option is *issues*, *PRD + issues* or *epic* and a current-slice unit has no issue number. Written drafts are not pending.
   - **A module still needs phases 3–4** (epic, or the next slice) → run them, then the GitHub step for that module.
   - **Build in progress** → nothing more. §0.1 names the next unit.

   Then close as in step 6.

## Subagents

- **Research:** the current-state survey (Orient), library and open-source options (phase 3), and any fact a question depends on. Run them in parallel. Only the questions that depend on a running survey wait for it.
- **Cold read:** once per phase (step 4.4). It often finds what the walkthrough's tier scope leaves out, so never skip it.
- **Walkthrough drafters (L, XL):** one per module, drafting the first pass of pseudocode for the units in scope. You own the questions to the user and the edits.

Subagents report to you, and you do all the writing in the plan folder.
