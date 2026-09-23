# Timeline

There is one timeline: the **rollup** in README §0.3. Each phase estimates only at its own level and writes into it. No phase document keeps a timeline of its own.

## Levels

| Phase | Estimates | In |
|---|---|---|
| 1 Intent | the **envelope**: budget or hard date | weeks or a date (1 wk = 5 working days) |
| 2 System | each module — frozen as its **baseline** (phase 2 off: one implicit M1, baseline = envelope ÷ (1 + buffer%)) | working days |
| 3 Code plan | each unit, **review time included** per its tier | working days, to 0.25 |
| 4 Walkthrough | revises the unit estimates it learns more about | working days |

Once a module has units, its **estimate** is the sum of its units, and its **baseline** stays at the phase-2 figure. A unit should be a day or less. A unit over two days should be split, or the plan says why it isn't.

## Buffer

`buffer = size% × sum(module estimates)`, using S 20, M 30, L 40, XL 40 of the slice. It has its own row in the rollup. During planning it is recomputed whenever estimates change. Once the build starts it is **fixed**, and overruns draw it down: `buffer left = buffer − Σ(actual − estimate)` over finished units.

## Alignment check

Runs after phases 2, 3 and 4, and on every resume. The result goes on the *Timeline* line of the checkpoint or resume card.

- **Module vs baseline:** a module's estimate more than 20% over its baseline → ⚠, naming the module.
- **Total vs envelope:** module estimates plus buffer over the envelope (or over the slice's share of it, for XL) → ⚠.

A ⚠ needs the user to choose: **cut scope**, **move the date**, or **accept**. The choice is recorded as a D.

- An accepted ⚠ is not re-asked while the overage stays the same or shrinks. The card shows `⚠ accepted (D-n)`.
- If the overage grows, ask again. Once the buffer is gone (planning: the total exceeds the envelope by more than the buffer; build: buffer left < 0), your recommendation is to move the date or cut scope, and you say plainly that accepting means there is no margin left.

## Actuals and overrun

- Record a unit's actual when it's done: working days from first commit to merge, taken from `git`/`gh` where possible, otherwise asked. Durations always come from the record, never from your own estimate. Check a figure the user gives you against the record, and ask again if they can't both be true.
- Once actuals exist, the **projection = actuals of finished units + estimates of the rest**, and **buffer left** is as defined above. ⚠ means the projection exceeds the envelope, which happens once overruns have spent the buffer. The resume card shows `<done> + <left> = <proj> · buffer left <b>`, or `—` when there are no estimates yet.
- A unit **50% or more over** its estimate gets an **overrun report** to the user, or to the orchestrator if one is running the build:

  ```
  ⚠ Overrun U<k>.<n> <name> (<repo>, <tier>)
  Estimate → actual   <e> d → <a> d (+<x>%)          source: <PR/issue | user>
  Reason              <what the user or record says | not given — asked>
  Effect              buffer <left | spent>; total <t> vs envelope <env>
  ```

  If the reason is missing, ask for it once. If the user doesn't give one, record `not given`; never infer it.
- A review running past **2× its tier's budget** is the same kind of signal ([`review-tiers.md`](review-tiers.md)).

## Planning time

`log.md` records each phase's start and end from `date`. The close-out reports the total, taken from those times.

## Rollup shape

A markdown table. Column widths follow the content.

| Item | Tier | Baseline | Estimate | Actual | Status | Issue |
|---|---|---|---|---|---|---|
| Envelope | | | 2–3 wk | | | |
| M1 upload-api (api) | | 4 d | 4.5 d | | planned | #12 |
| · U1.1 signed upload URL | deep | | 1.5 d | | planned | #13 |
| · U1.2 list route | light | | 0.5 d | | planned | #14 |
| M2 pet-page-card (client) | | 3 d | | | later | |
| Buffer (30%) | | | 2.3 d | | | |
| Total | | | 9.8 d | | ✅ / ⚠ accepted (D-n) | |

Status is one of: `planned` · `later` · `in progress` · `done` · `dropped (D-n)`.
