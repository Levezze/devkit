# Persisting outward

The plan folder is the source of truth. Issues and PRDs are **views** onto it that link back to its §s, never wholesale copies, because copies drift.

## Options

| Option | Fits | Creates |
|---|---|---|
| **none** | solo work, a spike, planning only | nothing outside the plan folder |
| **drafts** | the user wants to see or edit the bodies first | issue and PRD bodies as markdown in `<plan>/issues/`; nothing on the tracker |
| **issues** | S; one module | 1–5 issues, no PRD |
| **PRD + issues** | M/L finished in one go | one PRD, and one issue per unit (or per tight group of units) |
| **epic** | XL; architecture; months, built in slices | one epic, plus a PRD per module **written when that module is next**; issues only for the current slice |

**Just in time.** In an epic, later modules stay as rollup rows (`later`) until `/planning resume` reaches them. At that point they get their phases 3 and 4, then their PRD and issues. Written months early, those tickets would be stale before anyone built them.

**Multi-repo.** The PRD or epic lives in the repo that owns the parent contract. Each issue lives in the repo its unit changes. Cross-repo links use `owner/repo#n`.

## Tracker

The default is GitHub via `gh`. If the repo uses another tracker and a connector for it is live in this session (Linear, Jira, …), use the same options there. If `gh` is not authenticated, fall back to **drafts** and say so.

## Steps

For **drafts**, only steps 3 and 5 apply: write the bodies to `<plan>/issues/`, and put `draft` in the rollup's *Issue* column. Switching from drafts to a tracker option later means running every step. Redraft bodies whose units have already finished, or drop them.

1. **Links must resolve.** Issue bodies link to plan §s, so the plan folder has to be committed and pushed where readers can open it. If it isn't, ask the user to approve that first, or to accept links that won't resolve yet.
2. **Labels.** Propose `review:deep|standard|light`, plus `HITL`/`AFK` if the repo already uses them. Create a missing label only after the user approves it. Tier and HITL/AFK always appear in the body, whether or not they are labels.
3. **Draft everything** — every title and body, shown as one list.
4. **Create after approval**, blockers first, so *Blocked by* can cite real numbers.
5. **Write each number** into the rollup's *Issue* column. Questions raised during this step go into README §0.5 like any other.

## Bodies

**Epic / PRD:**

```markdown
## Why
<§1.1 in two sentences> — full intent: <link to 1-intent.md>

## Scope
<module or slice summary; in / out> — system: <link to §2.r.n>

## Modules / units
- [ ] M1 <name> — <link> (est <d>)

## Plan
<link to the plan folder README>
```

**Issue (one unit):**

```markdown
Part of <PRD/epic link> · plan: <link to §3.k.8> · walkthrough: <link to §4.k.u | none>

## What to build
<end-to-end behaviour, 2–4 lines>

## Acceptance
- [ ] <checkable criterion>

Estimate: <d> · Tier: <deep|standard|light> · <HITL|AFK>
Blocked by: <issue | none>
```
