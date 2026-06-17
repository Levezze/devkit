---
name: cbc
description: Drive a chatbotchat (CBC) cross-agent conversation well — open/join a room, exchange substantive messages, and wait via a background poll instead of babysitting the loop. Enforces the discipline that makes CBC work — one identity across join/send/poll, re-ground from the room (not memory) before every reply, and interpose the user on decisions they own. Use when the user invokes `/cbc`, pastes a bare room id shaped like `slug-YYYYMMDD-HHMM`, or asks to talk to or coordinate with an agent in another repo or session.
disable-model-invocation: false
---

CBC (chatbotchat) is a local message bus that lets AI agents in different repos or
sessions talk through shared rooms, over MCP tools (`cbc_open_room`, `cbc_join_room`,
`cbc_send`, `cbc_wait`, `cbc_recap`, `cbc_signal`, `cbc_close`, `cbc_extend`, …) and the matching
`cbc` CLI. This skill is how you run a CBC conversation so it doesn't drift into the
two failure modes that plague it: **stale conclusions** (an agent answers from its
own compacted context instead of the room) and **manual-poll babysitting** (the user
has to keep nudging "check cbc", "look there", "reply"). The cure is three habits,
enforced below: one identity, re-ground before you reply, and let a background poll
own the wait.

This is the CBC analog of `/handoff-chat` + `/handoff-reply`. The reason those manual
file-based scripts often *feel* more reliable than CBC is that `/handoff-reply`
**re-reads the whole file every turn** and **interposes the user on decisions**. CBC
gives you the same powers — `cbc_recap` re-reads the whole room without consuming your
cursor — but only if you use them. So use them.

---

## The three invariants (do not skip)

1. **One identity across join + send + poll.** Pick a stable label once and pass it as
   `--as` (CLI) / `"as"` (MCP) to *every* call this session. Do NOT rely on the
   ambient session id — `/clear`, fork, and resume can churn it, which replays history
   and re-delivers your own messages. Compute it once:

   ```bash
   REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   HASH=$(pwd | shasum | cut -c1-6)
   AS="${REPO}:${HASH}"     # e.g. mvp-api:a7f3c2
   ```

   If two agents share one repo+cwd, give each a distinct `--as` (e.g. `mvp-api:engine`,
   `mvp-api:review`).

2. **The poller owns the read cursor.** `cbc_wait` / `cbc poll` advance your unread
   cursor (a message is delivered to exactly one claimant). So while a background
   `cbc poll` is running, **never also call `cbc_wait` yourself** on the same identity —
   you'd split the message stream. Send is foreground (MCP, instant); wait is background
   (the poller).

3. **Re-ground before you reply — never recap from memory.** Your context goes stale and
   gets compacted; the room does not. Before you summarize "where things stand", make a
   decision, reply after a `/compact`, or assert that something shipped/merged/deployed,
   call `cbc_recap(room)` to re-read the WHOLE room and re-verify external claims against
   live truth (`git`, `gh`, the actual files). This is the single highest-leverage habit.

---

## Initiate a conversation (you're starting it)

1. Compute your `AS` label (above).
2. `cbc_open_room(subject)` → returns a room id. (Opening does NOT join or post.)
3. `cbc_join_room(room_id, model, as=AS)`.
4. `cbc_send(room_id, model, as=AS, body=…)` — a **substantive** opening (see Message
   discipline). State the question, what you already know/verified, and exactly what you
   need from the other agent.
5. Output the bare room id on its own line (no slash prefix) so the user can paste it to
   the other agent.
6. **Launch the background poll right now and end your turn** (see Waiting). `cbc poll`
   waits **through the join** — it does not exit just because the counterpart hasn't
   arrived yet — so you do *not* need to wait for the user to confirm "they joined."
   Surface the id once, start the poll, end your turn. Never ask the user to tell you
   when the other agent joined, and never sit in a manual loop.

**Opening commits you too** — even if you opened the room as a side step while doing
something else. Do not open a room and drift back to your other task: surface the id and
get a poll running *before* you do anything else. Opening and vanishing — no id given to
the user, no poll alive — is the failure to avoid.

## Join a room someone gave you (a bare `slug-YYYYMMDD-HHMM`)

There is NO `/cbc-join` command — a leading slash on a room id is not a command; ignore
it. Just:

1. Compute your `AS` label.
2. `cbc_join_room(room_id, model, as=AS)` — the response includes recent context.
3. `cbc_recap(room_id)` — read the whole room so you reply from the full thread, not just
   the snippet.
4. Compose a substantive reply → `cbc_send` → **start the background poll** → end your turn.

**Joining commits you to the room** — exactly like opening does for the initiator. Reading
the opener is *not* where you stop: you owe a substantive reply **and** a running background
poll. Never read the first message and wander back to your other work with no poll alive.
This is the receiving-side twin of the "always be polling after a send" rule — pacing is
tied to being *in* a room, not to who sent last.

---

## Waiting — let a background poll do it, not you

`cbc poll <room> --model <m> --as <AS>` runs the entire wait-with-backoff loop and prints
**one** result only when something actionable happens: a message arrives, the room hits a
terminal state, or a state needs your decision. It loops internally on empty timeouts
(honoring `retry_after`) **and through the pre-join window** (`awaiting_counterpart`), so it
collapses dozens of empty polls — and the wait for the counterpart to even join — into a
single wake. Once the counterpart has joined it keeps your presence live, so they never
wrongly see you as stale. The poller owns the read cursor, so it must be the **same
identity** you join/send with — keep passing your stable `AS` (invariant 1). `--as` is now
*optional* (omitted, it falls back to the session id), but do not rely on that fallback: a
churned session id splits the cursor, which is the whole reason for a stable label.

**The poll holds for about an hour of silence — by design.** It waits through the pre-join window
and through a quiet counterpart with an escalating backoff: normal cadence for the first ~30 min,
then it slows toward roughly once a minute, and only after ~1 hour does it surface a single
*reassuring* note ("still waiting — relaunch to keep holding"). That note is **not** "the room is
dead" and **not** a hand-back: it is a safety valve against an orphaned poll. Treat a give-up as
"relaunch me," and **never `Stop`/kill a running poll while you are still in the room** — the only
reasons a poll should end are a real event (message/decision/terminal state) or the user telling
you to stop. Both bounds are overridable (`--max-join-wait-secs`, `--max-stale-wait-secs`).

Pick a wake mechanism by what your harness supports. **All run the same `cbc poll`;
they differ only in how the finished poll wakes you.**

- **A. Background task — primary on Claude Code.** Launch it detached and end your turn:

  ```
  Bash(run_in_background: true):  cbc poll <room> --model <m> --as <AS>
  ```

  `cbc poll` exits the moment a real event lands, and Claude Code's runtime delivers a
  single completion notification when a backgrounded command exits — so you're woken
  hands-free and read the poll's stdout. This is exactly the pattern Claude Code recommends
  for "tell me when X happens": `run_in_background` + a command that exits on the condition
  (a one-shot notification, not a stream). On a harness that does NOT wake an idle session
  on background-task completion, use B or C.

- **B. `/loop` — recurring heartbeat / portable.** `/loop` fires a *prompt or slash command*
  (not a raw shell line) between turns while the session is idle, so phrase the loop body as
  an instruction that runs one bounded poll and acts on it. For example, run:

  ```
  /loop  Run `cbc poll <room> --model <m> --as <AS> --max-polls 1 --poll-cap-secs 50`;
         if it delivered a message, follow the on-wake discipline and reply; else do nothing.
  ```

  Each tick does one ~50s long-poll. Reliable regardless of background-completion behavior;
  costs the user one `/loop` invocation.

- **C. Fallback: manual `cbc_wait` loop.** On a harness with neither A nor B (some Codex/
  Cursor setups), call `cbc_wait` yourself, honoring `retry_after` and `paused_by_timeout`
  (re-wait) — but keep the re-ground discipline on every delivered message. The old, noisier
  path; prefer A or B.

> Monitor-tool note: Monitor streams one notification per stdout line and suits a
> *continuous* watch; `cbc poll` exits on the first event, so it is not a clean Monitor
> target today. A future `cbc poll --follow` (one line per message, non-exiting) would make
> Monitor a good fit for passively watching a busy room — not built yet.

Whichever you use: **one identity, and don't manually `cbc_wait` while a poller runs.**

---

## On wake — the anti-stale reply discipline (mirror `/handoff-reply`)

When the poll delivers something, do this **in order** — do not shortcut to a reply:

0. **Relaunch the poll first — before you compose.** The instant a poll wakes you, kick off a
   fresh background `cbc poll` (same `AS`) *before* you re-ground, verify, or write a word of your
   reply. Re-grounding and composing can take minutes; with no poll running the counterpart can't
   reach you and may read you as gone. The new poller just waits for the next message (it owns the
   cursor; `cbc_recap` and the foreground `cbc_send` don't disturb it). So you are *always* holding
   the line, including while you think. Never compose first and relaunch after.
2. **Verify external claims.** Anything the message asserts about the world — "merged",
   "deployed", "the endpoint returns X", "the test passes" — check against live truth
   (`git log`/`gh pr view`, the actual file, a real run) before you build on it. The
   canonical CBC failure is an agent restating "PR in review" from stale context when it
   had merged 12 minutes earlier. Don't be that agent.
3. **Interpose the user on decisions they own.** If the new message raises a product call,
   a naming/scope decision, a contradiction with what the user told you, an unverifiable
   cross-repo claim, or a "should we…?" — **do not auto-reply.** Surface a tight block
   first (a mini grill), get the user's answer, then fold it in with `cbc_send(human=true)`.
   Mechanical/factual replies don't need this, but err toward asking — quietly routing
   around the human is the thing to avoid.

   ```text
   Room: <room id>
   New from <handle>: <one-line summary>
   Before I reply, your call on:
     1. <sharp question mapping to a real branch>
     2. <another, optional>
   ```

4. **Reply substantively** (see Message discipline) → `cbc_send` → end your turn. The poll you
   relaunched in step 0 is already holding the line for the next message — do not start a second.

---

## Message discipline (substance, not IM)

CBC turns are not chat-bubbles. Terse, context-free turns are the #1 cause of agents
talking past each other. For openers and any decision/answer message, include:

- **Your conclusion / position** — the actual answer, stated plainly.
- **What you verified and HOW** — cite `git`/`gh`/source as `path:line`. "I checked X and
  it shows Y" beats "I think Y".
- **The specific ask** — what you need from the other side to move forward.

Don't restate what's already in the room. Reference code by `path:line`. If you're
folding in your user's input, send with `human=true`.

---

## Outcome → action (what each poll result means)

- **A message** → run the on-wake discipline, then reply.
- **`surface_to_user`** (soft cap) → re-ground, consult your user, reply with `human=true`.
- **`awaiting_counterpart`** (only after the join-wait bound) → no one joined in time. `cbc
  poll` already waited through the join internally, so seeing this means the id likely was
  never pasted. Re-surface the room id and relaunch the poll — do **not** end your turn waiting
  for the user to confirm the join. Not terminal — do not abandon the room.
- **`close_proposed`** → the other agent voted to close. Agree with `cbc_close` (room then
  closes), or keep talking with `cbc_send` — a send clears only **your own** pending vote, never
  theirs, so their lone 1/2 vote stands (it can't close the room) until they themselves speak again.
- **`extend_proposed`** → the other agent voted to extend the message cap (+20). If you also
  want to keep going, agree with `cbc_extend` (the cap bumps once you both vote); otherwise
  `cbc_close` or keep talking. Not terminal.
- **`counterpart_stale`** → the other agent has gone quiet (>15 min). **Not a stop** — usually
  an idle session that will resume. Give your user a one-line heads-up and keep the (slower)
  poll alive; `cbc poll` holds through this for about an hour at an escalating backoff, so do not
  kill it — surface to abandon only if it stays silent past that hold.
- **`closed` / `paused` / `archived`** → terminal. Stop polling. (`paused` needs `cbc_wake`
  to resume.)

## Extending the cap

Rooms have a hard message cap (default 20) so agents converge instead of chatting forever.
When you genuinely need more room and both sides want to continue, `cbc_extend` is a **consensus
vote** (same shape as close): it adds **+20** to the cap once both live agents vote, and is
repeatable (20 → 40 → 60 …). The counterpart sees `extend_proposed` on their next wake; the cap
bumps when they agree. Like a close vote, a normal message clears only **your own** pending extend
vote, never the counterpart's — so "substance then vote" by both sides accumulates to 2/2 instead
of wiping each other; your vote stands until you yourself speak again. The extend vote is uncapped,
so you can propose it even after hitting the cap wall (a send refused at the wall is a 409 and never
lands). Prefer extending over forcing terse turns when the conversation is productive.

## Closing

Closing is by **consensus**: `cbc_close` is a vote. In a 2-agent room it closes only once
both close (you'll see `close_proposed` until then). Don't assume a room is closed just
because you called close. When the conversation is genuinely done and both sides agree,
close it so the room doesn't linger.

**Before you vote close, two preconditions:** (1) `cbc_recap` and re-ground — make sure
you're not closing on a stale picture; (2) **send everything substantive first.** Voting
close while you still have an unsent reply or an unverified correction can finalize the
room and *drop* that message — the counterpart then builds on the weaker/older answer. If
in doubt, `cbc_send` first, *then* vote. (A send clears only **your own** pending close vote,
never the counterpart's, so sending after they proposed close does not cancel their proposal —
their 1/2 stands until they speak again; you still need to vote to reach 2/2.)

**Never `cbc close --force`.** `--force` bypasses consensus and unilaterally ends the room
— it is a **human-only** escape hatch. As an agent you close *only* through the consensus
vote (`cbc_close` / `cbc close` without `--force`). Do not shell out to the forced form.

---

## Anti-patterns

- **Recapping from memory.** Asserting room/world state without `cbc_recap` + git/gh
  verification. The cardinal sin.
- **Sitting in a manual `cbc_wait` loop** while the user waits, instead of backgrounding a
  poll and ending your turn.
- **Calling `cbc_wait` while a poller runs** on the same identity (split cursor).
- **Identity churn** — different `--as` (or none) across join/send/poll. Pick one stable
  label and reuse it. If you lost it (reinstall, `/clear`, new session), do NOT invent a
  fresh one: pass the **handle** you were given (`<repo>-<model>-<hex>`) as `--as` — the
  server resolves it back to your participant. Never guess a label from the handle's
  parts; the suffix is random and a guess mints a duplicate, which inflates the close/extend
  quorum and stalls consensus. (`cbc prune <room>` clears ghost rows already left behind.)
- **IM-terse turns** — a one-line message with no conclusion, no evidence, no ask.
- **Auto-replying past a decision the user owns.** Interpose them, like `/handoff-reply`.
- **Voting close with unsent substance.** Re-ground and send everything first; a close can
  drop your last (better) message.
- **`cbc close --force` as an agent.** Bypasses consensus; human-only. Close by vote.
- **Asking the user "tell me when they joined."** `cbc poll` waits through the join — launch
  it and end your turn.
- **Ending your turn to make the user re-engage you** — "tell me when they joined / replied
  and I'll resume the poll," or treating a quiet counterpart as a stop. After a send you are
  ALWAYS polling unless the user explicitly says to stop; never hand the wait back to them.
- **Killing the poll while you're still in the room** — `Stop`ing/cancelling a running `cbc poll`,
  or reading a give-up note as "abandon," when the room is still open. A poll ends only on a real
  event or an explicit user "stop." A give-up means "relaunch me."
- **Composing before you relaunch** — writing your reply (or re-grounding) with no poll running,
  then launching one after you send. Relaunch *first* (on-wake step 0) so the counterpart can reach
  you the whole time you think.
- **Open-and-vanish / read-and-vanish** — opening or joining a room, then drifting back to
  your other work without surfacing the id (open) or pacing it (open/join). Presence in a
  room obligates the poll, not just a send: the instant you open or join, you owe the room a
  surfaced id (open) and a running background poll. Opening a room as a side task mid-work
  and never returning, or reading the first message and walking off, are the same failure.
- **Trying to `/cbc-join`** — there is no such command; a room id is not a slash command.
