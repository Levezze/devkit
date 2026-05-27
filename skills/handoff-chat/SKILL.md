---
name: handoff-chat
description: Open or post to a lightweight chat file shared between agents across repos. Each agent writes under a stable handle derived from its repo and working directory, addressing all participants or one specifically. The chat slug is auto-derived from subject + timestamp unless the user overrides it. Use when the user invokes `/handoff-chat <message>` (e.g. `/handoff-chat "Question about per-position slider labels..."`). For drafting a reply to an existing chat, use `/handoff-reply` instead.
disable-model-invocation: false
---

Maintain a chat file at `/tmp/handoff-chat-<slug>.md` so multiple agents — in the same repo or across repos — can converse without the user shuttling messages by hand. This skill **writes** to the chat (creating it on first use). To **read and respond** to messages from other agents, use the companion skill `/handoff-reply`.

This is the lighter sibling of `/handoff`. Use `/handoff` for formal cross-team requests with a structured spec; use `/handoff-chat` for ongoing back-and-forth, clarifying questions, status pings, coordination.

## Slug — automatic by default

The slug is auto-derived; the user does **not** pass it. Pattern:

```
<subject-kebab>-<YYYYMMDD-HHMM>
```

- **Subject**: a short kebab-case phrase capturing the topic. Extract it from the message (or, when posting into an existing chat, reuse the existing slug — do not re-derive).
- **Timestamp**: the `Started:` time of the chat, in local time, format `YYYYMMDD-HHMM`. Once set, it never changes — appending messages keeps the original slug.

Override only if the user explicitly asks (`--slug <explicit>` or natural language like "use slug X"). Otherwise auto-derive.

**Resolving the target chat when appending:**

1. If the user names an existing chat (by topic phrase, slug, or "the X chat"), match it against `ls /tmp/handoff-chat-*.md` and use that file.
2. If the user is clearly continuing the current session's chat (you already created one this conversation), use it.
3. If ambiguous (multiple chat files, no clear referent), list candidates with their subjects and most recent message time, and ask which to post to — or whether to start a new one.
4. Otherwise, treat this as a new chat: derive a fresh slug from the message.

## Identity

Each agent writes under a stable **handle**: `<repo>:<short-id>`.

- `<repo>` — basename of the git toplevel (or cwd if not a repo).
- `<short-id>` — first 6 chars of `sha1(pwd)`. Deterministic per working directory.

Compute it before writing:

```bash
REPO=$(basename "$(git rev-parse --show-toplevel 2>/dev/null || pwd)")
HASH=$(pwd | shasum | cut -c1-6)
HANDLE="${REPO}:${HASH}"
```

If the user passes `--as <name>`, use that instead. (Useful when two agents share a worktree, or the user wants a more descriptive name like `engine-slice-12`.)

Always record the handle in the **Participants** section the first time it appears in a chat — agents reading the file later need to know who's in the room.

## Process

1. **Parse the invocation**: `/handoff-chat <message...>` with optional `--to <handle>`, `--as <name>`, and (rare) `--slug <explicit>`.
   - The user does **not** pass a slug by default. Derive it (see "Slug — automatic by default" above).
   - If the message is missing or the intended subject is ambiguous, ask one tight question — don't fabricate.

2. **Resolve target chat / derive slug**: follow the resolution rules above. If creating a new chat, derive `<subject-kebab>-<YYYYMMDD-HHMM>` and that becomes the permanent slug. Read the file if it exists. Note current participants and the timestamp of the latest message — you'll cite both back to the user.

3. **Compute your handle** as above (or honor `--as`).

4. **Compose the message body**. Keep it conversational and tight. State the point, the ask, or the answer. Reference code with `path:line` when relevant. Don't restate things already in the chat. Don't reproduce the user's instruction verbatim — translate it into a message the receiver agent can act on.

5. **Append to the file**:
   - If creating: write the full template (see below) with the first message. Include the **Subject** line in the header so the slug is human-decodable.
   - If appending: add yourself to **Participants** if not already listed, then append a new entry under **Messages**. Preserve chronological order; never edit prior messages.

6. **Report back in chat** to the user with a small block — path, slug, subject, your handle, who you addressed. The user copies the path and pastes it into the receiving agent's session, prefixed with `/handoff-reply` (no slug needed if it's the only chat; otherwise `/handoff-reply <slug>`). No additional commentary outside the block.

   Example output (your entire response):

   ```text
   Chat: /tmp/handoff-chat-slider-labels-20260527-1423.md
   Slug: slider-labels-20260527-1423
   Subject: Slider labels — per-position shape
   From: mvp-engine:a7f3c2
   To: mvp-client:b8d1e9
   Tell the other agent: /handoff-reply slider-labels-20260527-1423
   ```

## Template (new chat)

```markdown
# Handoff Chat: <subject>

**Slug:** <subject-kebab>-<YYYYMMDD-HHMM>
**Started:** <YYYY-MM-DD HH:MM>
**Subject:** <one-line description — extract from the user's message or ask>

## Participants

- `<handle>` — <repo path on disk, e.g. /Users/.../mvp-engine> — joined <YYYY-MM-DD HH:MM>

## Messages

### <YYYY-MM-DD HH:MM> — `<handle>` → all
<message body>
```

## Message entry format (appending)

```markdown
### <YYYY-MM-DD HH:MM> — `<handle>` → <recipient handle or `all`>
<message body — markdown freely, code fences welcome>
```

Always use the literal recipient handle from the Participants list. `all` means "anyone reading this." Don't invent recipient names.

## Anti-patterns

- **Writing a full `/handoff` spec into a chat.** If the message is a structured cross-team request, switch to `/handoff` and reference the resulting file from the chat instead.
- **Editing prior messages.** Append only. If you misspoke, post a correction message.
- **Skipping the Participants registry.** Other agents lose track of who's who.
- **Inventing a recipient handle.** If you don't know who to address, use `all` or ask the user.
- **Replying inside `/handoff-chat`.** This skill writes; `/handoff-reply` reads-then-writes with user oversight. If new messages from other agents exist and you're reacting to them, route through `/handoff-reply` so the user gets a chance to scrutinize before you commit a response.
