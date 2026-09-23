# Rounds

How a phase's topics turn into questions and answers.

## Format

Ask the whole **frontier** in one message: every open question whose prerequisites are already settled. Number each with the next free Q-id and give your recommendation:

```
❓ **Q-7** — **<title>**: <question, with the options if there are any>

➡️ <your recommended answer, and why in one line>
```

A question that depends on another question still open in the same round waits for the next round. A question keeps its Q-id once answered; it is marked `→ D-n` in README §0.5 and moves to §0.4.

## Bounds

- **The topic list is the tree.** Each phase file lists its topics; stay on them. A good question that belongs to a **later** phase goes into that phase's list. One that belongs to an **earlier** phase (usually surfaced by code facts or a cold read) is asked now, and its answer is applied by *Going back*.
- **Depth limit: three rounds per topic.** Still open after three rounds → park it as `P-n` in README §0.6, with one line on why and what would unblock it. Parking is a legitimate outcome.
- **Facts are your job, decisions are the user's.** Dispatch a research subagent for anything on disk or on the web. Put only real choices to the user.
- **User shorthands:** *"your call"* makes your recommendation the decision, recorded as `D-n (agent's call)`. *"park"* creates a `P-n`. *"skip"* marks the topic N/A with a reason.

## Going back

A later phase may overturn an earlier one; the walkthrough regularly does this to the code plan.

1. Edit each affected section in place. Directly under its heading, add *revised from <§4.2.3 | Q-9 | cold read, phase 3> — <one-line reason, D-n>*.
2. Keep every § number: numbers never move ([`numbering.md`](numbering.md)).
3. If the change overturns a decision, strike through the old D's row in README §0.4 and add *superseded by D-n*.
4. Update the rollup if an estimate changed. Add one log line per event, listing every § it touched.
5. List those §s on the next checkpoint card's *Revised* line.

Stay in the current phase. The start card is not re-shown.
