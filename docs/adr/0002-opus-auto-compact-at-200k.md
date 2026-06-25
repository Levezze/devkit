# ADR 0002 — Auto-compact Opus at ~200k via `autoCompactWindow`

- Status: Accepted
- Date: 2026-06-25
- Applies to: the installer's opt-in Opus option (`src/installer.js`,
  `src/cli.js`), `claude/settings.json`
- Source: Claude Code bundle **v2.1.191** — reverse-engineered, **will drift**.
  Re-verify against the installed bundle before trusting the constants below.

## Context

Claude Code runs Opus on a 1M context window. Auto-compact only fires near the
window ceiling, so on the 1M window a normal 200k-sized conversation never
compacts and silently grows to 300k+. We want Opus to auto-compact at ~200k.

An earlier version of this option set `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` to force
the 200k Opus variant. That works in the sense that auto-compact then fires — but
only at ~167k (see below), never at 200k, and it throws away the safety headroom
of the larger ceiling. This ADR records the corrected mechanism.

## The mechanism (decoded from the bundle)

Auto-compact fires when:

```
tokens >= window - 33000
window  = min(modelMax, autoCompactWindow)
```

- `window` is resolved by `l9(model, settings.autoCompactWindow)`: the env var
  `CLAUDE_CODE_AUTO_COMPACT_WINDOW` wins if set; otherwise the `settings.json`
  key `autoCompactWindow` (`source:"settings"`). Both are clamped to
  `min(modelMax, value)` and to the range `[100000, 1000000]`
  (`autoCompactWindow: number().int().min(1e5).max(1e6)`).
- The `33000` is `20000` (output buffer `lzi`, applied by `ute`) `+ 13000`
  (floor in `gDn`). Both are hardcoded. The live decision path is
  `Gom → _He → ozi`, which returns `level:"compact"` at `tokens >= gDn(budget)`,
  where `budget = window - 20000`. (`gDn` also accepts a PCT override, but it can
  only *lower* the trigger, never raise it.)
- `modelMax` is `1,000,000` when 1M context is in play (model string carries the
  `[1m]` tag, or the 1M beta header + `j5`, or the `QF` account entitlement),
  else `200,000`. `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` (`ehe()`) forces it to
  `200,000`.

### Why 167k was a ceiling, not a knob

With `DISABLE_1M`, `modelMax = 200000`, so `window <= 200000`, so the trigger can
never exceed `200000 - 33000 = 167000`. To compact at 200k you need
`window = 233000`, which needs `modelMax >= 233000` — i.e. the **1M model, with
`DISABLE_1M` OFF**.

## Decision

Set the `settings.json` key:

```json
{ "autoCompactWindow": 233000 }
```

`window = min(1_000_000, 233000) = 233000` → trigger = `233000 - 33000` = **200000**.

- Use the `autoCompactWindow` **settings key**, not the `CLAUDE_CODE_AUTO_COMPACT_WINDOW`
  env var. The key is first-class and schema-validated, has a `/config` UI, needs
  no shell configuration, and distributes cleanly via the install template. (The
  env var would also work but takes *precedence* over the key — so never set both.)
- Do **not** set `CLAUDE_CODE_DISABLE_1M_CONTEXT`, and remove it on enable if an
  older install left it behind. Keeping it would cap `modelMax` at 200000 and drop
  the trigger to ~167k.
- Opt-in, off by default. The installer prompt defaults to "no".

## Consequences

- `/context` shows a 1M ceiling, not 200k. Functionally the conversation still
  compacts at ~200k, leaving ~800k of true headroom (no risk of hitting a hard
  wall mid-turn).
- Cost is effectively unchanged: compacting at ~200k keeps input around 200k, so
  the 1M premium tier (>200k input) is essentially never entered. The triggering
  turn brushes the boundary; this is negligible, not a hard guarantee.
- **Entitlement-dependent.** A user without 1M-context access falls to
  `modelMax = 200000` → `window = min(200000, 233000) = 200000` → trigger ~167k.
  It still compacts; it just fires earlier. Documented in the README.
- These constants are reverse-engineered from a specific bundle build and are not
  a public contract. If a future Claude Code changes the `33000` headroom, the
  clamp logic, or the schema bounds, re-derive before relying on `233000`.
