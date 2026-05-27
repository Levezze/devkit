---
name: handoff-reply
description: Read new messages in a `/handoff-chat` file from other agents and prepare a reply — but before writing, surface anything that needs the user's judgment as a short grill-me. The user answers; only then does the reply get appended. Use when the user invokes `/handoff-reply` (slug is auto-resolved from /tmp; explicit `/handoff-reply <slug>` only when needed to disambiguate).
disable-model-invocation: false
---

Read new messages in a chat file produced by `/handoff-chat` and prepare a response. **Never** post a reply directly when something in the incoming messages calls for the user's input, judgment, or a decision they should own. Instead, run a brief, targeted grill-me first; commit the reply only after the user has weighed in.

This skill exists because cross-agent chat will otherwise quietly route around the human — and the human is the one with the product context, the constraints not yet written down, and the authority to decide. Your job is to keep them in the loop without making it heavy.

## Process

1. **Parse the invocation**: `/handoff-reply [<slug>]` with optional `--as <name>`. The slug is **optional** — auto-resolve when omitted:
   - List `/tmp/handoff-chat-*.md`.
   - If exactly one exists, use it.
   - If multiple exist, pick the one with the most recent message **addressed to you (`→ <your handle>`) or to `all`, where the latest entry is not already yours**. If still ambiguous, list candidates (subject + last-message time + last sender) and ask which.
   - If none exist, say so and stop.
   - If a slug is passed explicitly, use it; if no matching file exists, say so and stop.

2. **Compute your handle** (same scheme as `/handoff-chat`):

   ```bash
   REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
   HASH=$(pwd | shasum | cut -c1-6)
   HANDLE="${REPO}:${HASH}"
   ```

   Or honor `--as <name>`.

3. **Read the chat file in full.** Identify:
   - The Participants registry.
   - The index (timestamp) of your last message (entries with `<handle>` matching yours). If you have no prior message, your "new" set is all messages.
   - All messages **after** your last message that are addressed to you (`→ <your handle>`) or to `all`.

4. **Analyze the new messages.** For each, classify what kind of response is needed. Look for:
   - **Decisions only the user can make** — product scope, priorities, what-counts-as-done, naming, UX tradeoffs, when to ship, what to defer.
   - **Claims you can't verify from the codebase alone** — assumptions about the other repo's behavior, contracts, or constraints.
   - **Disagreements with prior context** — the other agent contradicts something the user said in this conversation, or proposes a direction that conflicts with this repo's conventions.
   - **Ambiguity** — words like "should we", "is it OK if", "do you want" — these are explicit asks for judgment.
   - **Hidden assumptions in the other agent's reasoning** that, if wrong, would make the reply wrong.

   Mechanical answers (factual lookups in this repo, restating something obvious from code) do **not** need user grilling. But err toward asking — under-questioning is the failure mode.

5. **If the user's judgment is needed: grill, don't reply.**

   Output to the user a short structured block. **Do not write to the chat file yet.** Format:

   ```text
   Chat: /tmp/handoff-chat-<slug>.md
   Subject: <subject from chat header>
   New from: <who wrote, what they said in one line each>
   Before I reply, scrutinize:
     1. <thing to think about — phrased as a sharp question>
     2. <another>
     3. <another, optional>
   Open question(s) for you:
     - <direct ask the user must answer for the reply to be sound>
   ```

   Keep it tight — 3–5 items max. This is a mini `/grill-me`, not a full one. Each item should map to a real branch in the decision tree of the upcoming reply; don't pad. If the new messages truly raise nothing for the user, say so explicitly (`Nothing here needs your input — I'll draft and show you.`) and proceed to step 6.

   **Wait for the user.** When they answer, fold their answers into your draft. If their answer raises new branches, grill again rather than guessing.

6. **Draft the reply and show it to the user before writing.** Even when no grilling was needed, the user should see the draft. Output:

   ```text
   Draft reply (will append to /tmp/handoff-chat-<slug>.md as `<your handle>` → <recipient>):
   ---
   <draft message body>
   ---
   OK to post?
   ```

   Only after the user confirms ("yes", "post it", "go", or edits), append to the file using the same message-entry format as `/handoff-chat`:

   ```markdown
   ### <YYYY-MM-DD HH:MM> — `<your handle>` → <recipient handle or `all`>
   <message body>
   ```

   Register yourself under **Participants** if not already listed.

7. **Confirm to the user** with a one-line ack: path, your handle, who you addressed, and the next-step hint they can pass back to the other agent (`/handoff-reply <slug>`).

## Grilling well

The point is to surface what the user should think about, not to perform thoroughness. A good item:

- Maps to a real branch in the reply's decision tree.
- Names a specific tradeoff or assumption — not "is this OK?".
- Is answerable in a sentence or two.

Bad items: vague ("is the approach right?"), restating what the other agent already said, asking for permission to do the obvious. If you find yourself writing one of those, drop it.

## Anti-patterns

- **Auto-replying without surfacing decisions.** The whole point of this skill is to interpose the user. If you post a reply before grilling on a decision they should own, you've defeated the design.
- **Grilling for the sake of grilling.** Don't manufacture items when the new messages are mechanical. Say "nothing here needs your input" and move on.
- **Treating `/handoff-reply` like `/handoff-chat`.** This skill always reads first. If you have nothing to react to, you should be using `/handoff-chat` to initiate a new message instead.
- **Editing prior messages in the chat.** Append only. Corrections go in a new message.
- **Burying the grill items in prose.** The user is scanning. Use the structured block.
- **Skipping the draft-confirmation step.** Even sound replies should be visible to the user before they go on the record between agents.
