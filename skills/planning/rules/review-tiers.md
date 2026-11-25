# Review tiers

Every unit gets a tier in the code plan. The tier sets how the unit is reviewed, how much review time its estimate includes, and the label on its issue. The start card's walkthrough scope decides which tiers get walked.

| Tier | For | Review | Budget |
|---|---|---|---|
| **deep** | the product's heart (the logic the product exists for), money, data integrity, anything hard to undo | every reviewer the repo has (e.g. an automated review plus a PR audit), plus a human reads the diff | set per unit, generous |
| **standard** | most code | the repo's normal review | ~1 h |
| **light** | plumbing, glue, config, copy, UI polish | security and infrastructure only; code quality is not policed | ~30 min |

**Walkthrough:** deep units are always walked. Standard units are walked when the card's scope says *deep + standard*. When they are not walked, each open design choice in them becomes a Q during the code plan and is answered there. Light units are never walked.

**Security floor:** every tier checks auth, secrets, permissions, public exposure and infrastructure blast radius. A light unit that opens a bucket, a port or a credential gets a full-depth review of that part; only its code quality is reviewed lightly.

**Choosing a tier:** ask *"if this is wrong, who notices, and how bad is it?"* Users or data are harmed → deep. A developer notices and fixes it → standard. Nobody much notices → light. The product heart named on the card is deep by default.

**HITL / AFK is a separate axis.** HITL means a human must decide or act *during the build* (a design review, a credential, a manual step). A deep unit can be AFK; its human involvement happens at review.

**Tripwire:** a review running past 2× its budget means something upstream is wrong: the unit is too big, the design is unclear, or the tier is wrong. Stop and report it ([`timeline.md`](timeline.md)) instead of pushing through.
