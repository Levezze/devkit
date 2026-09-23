# Where the plan lives

The plan is one folder: `<docs root>/<type>/<slug>/`, where `<type>` is the plural folder name from the scale questions (`features`, `architecture`, `refactors`, `migrations`, …). For multi-repo work it still lives in **one** place, with a system doc per repo. Detect a sensible default and put it on the start card. The user always has the last word.

## Detection order

1. **A shared docs repo.** This is a sibling git repo that the team commits planning or design docs to, and the other repos link to it for docs. A symlink used only for fixtures or assets doesn't count; if you're unsure, ask. Propose `<that repo>/docs/planning/<type>/<slug>/`. This is the default for multi-repo work.
2. **A planning area in this repo**, such as `docs/planning/`, `docs/plans/` or `planning/`, that is tracked in git. Use it and match its existing layout. If two tracked candidates are equally good, ask. Untracked folders are someone's local notes: mention them, but never propose them as the default.
3. **An unusual docs structure.** A tracked folder clearly holds feature or design docs, but under a name or layout you don't recognise. **Ask**: show what you found, propose a path inside it that matches its layout, and offer option 4. Clear intent is not a substitute for the user's confirmation.
4. **Nothing found.** Propose `docs/planning/<type>/<slug>/` in the repo that owns the work, and ask. For multi-repo work, that is the repo that owns the parent contract.

## Online documentation services

If the user keeps docs in a hosted service (Notion, Confluence, or similar), offer it **only when a connector for that service is live in this session**. Each plan document becomes a page under one parent page, keeping the same § numbers and IDs. With no live connector, write the markdown locally and tell the user it is a local working copy for them to move.

## On the card

The *Docs* line shows the proposed folder, the reason (*shared docs repo* / *matches tracked docs/plans/* / *nothing found*), and one alternative. A folder outside the current repo counts as confirmed once the card is approved. Committing there is a separate step and needs the user's say-so.
