# Devkit

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](#license)
[![AI tools](https://img.shields.io/badge/AI-Claude%20Code%20%7C%20Codex%20%7C%20Cursor-blue)](#ai-coding-config)
[![Platforms](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20WSL2-lightgrey)](#platform-support)

Devkit is a portable setup kit for a modern development machine and a shared AI coding workflow. It bootstraps common CLI tooling, then installs the same reusable instructions, skills, and subagents across Claude Code, Codex, and Cursor.

It is designed around one simple idea: keep your AI coding habits in source control, then symlink them into each tool instead of copying slightly different versions around your machine.

```mermaid
flowchart LR
  repo["devkit repo"]
  skills["skills/*"]
  agents["claude/agents/*"]
  instructions["claude/CLAUDE.md"]

  repo --> skills
  repo --> agents
  repo --> instructions

  skills --> claudeSkills["~/.claude/skills"]
  skills --> codexSkills["~/.codex/skills"]
  skills --> cursorSkills["~/.cursor/skills"]

  agents --> claudeAgents["~/.claude/agents"]
  agents --> cursorAgents["~/.cursor/agents"]

  instructions --> claudeMd["~/CLAUDE.md"]
  instructions --> codexMd["~/.codex/AGENTS.md"]
  instructions --> cursorMd["~/.cursor/AGENTS.md"]
```

This repository is not affiliated with Anthropic, OpenAI, Cursor, or Anysphere. It is a personal toolkit that may be useful as a starting point for your own setup.

## What It Does

Devkit has two layers:

| Layer | Script | Purpose |
|-------|--------|---------|
| Machine bootstrap | `./bootstrap.sh` or `./setup.sh` | Installs Homebrew, shell tooling, Git, Node, Python, Docker, CLI utilities, and selected AI coding tools |
| AI coding config | `node install.js` | Symlinks shared instructions, skills, and subagents into Claude Code, Codex, and/or Cursor |

During setup, Devkit asks:

- Whether you only want AI coding related tools and config
- Which AI coding environments to install or configure: Claude Code, Codex, Cursor
- Which config package mode to use: minimal, full, categories, or manual

Model selection is intentionally excluded. Choose models inside each tool on each machine.

## Quick Start

### Complete Setup

Use this on a new machine or a machine you want Devkit to manage end to end.

```bash
git clone https://github.com/Levezze/devkit.git ~/devkit
cd ~/devkit
./setup.sh
```

### Bootstrap Only

Use this when you want machine tooling plus the option to install AI coding config.

```bash
./bootstrap.sh
```

### AI Coding Config Only

Use this when Node is already installed and you only want the Claude Code, Codex, and/or Cursor configuration.

```bash
npm install
node install.js
```

## What Gets Installed

### Machine Tools

| Category | Tools |
|----------|-------|
| Shell | Zsh, Oh-My-Zsh, Powerlevel10k |
| Package manager | Homebrew |
| Version control | Git, GitHub CLI |
| JavaScript | Node.js via nvm, pnpm |
| Python | Python 3 |
| Containers | Docker |
| CLI utilities | curl, wget, jq, tree, htop, ripgrep, fd, bat, eza, carapace, atuin |
| AI coding | Claude Code, Codex CLI, Cursor |

Each component checks whether it is already installed and prompts before reinstalling.

### AI Coding Config

| Type | Installed to |
|------|--------------|
| Global instructions | `~/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.cursor/AGENTS.md`, `~/.cursor/CLAUDE.md` |
| Claude settings | `~/.claude/settings.json`, `~/.claude/settings.local.json`, `~/.mcp.json` |
| Skills | `~/.claude/skills/<name>`, `~/.codex/skills/<name>`, `~/.cursor/skills/<name>` |
| Subagents | `~/.claude/agents/<name>.md`, `~/.cursor/agents/<name>.md` |
| Optional shell config | `~/.zshrc` |

Settings files that need placeholder substitution are copied. Instructions, skills, and subagents are symlinked back to this repo.

Skills can opt into a Devkit model-tier hint:

```yaml
x-devkit-model-tier: highest
```

For generated Codex metadata, Devkit appends a highest-tier instruction to the skill prompt. For tools that load `SKILL.md` directly, put the same expectation in the skill body. Provider-native enforcement differs by tool, so this field is a portable policy hint rather than a universal hard guarantee.

When `/sync-skills` touches model-tier behavior, it must first check current official provider documentation. It should never infer the strongest Claude, OpenAI/Codex, or Cursor model from stale model knowledge, and it should stop rather than downgrade or hard-code a model it cannot verify.

For Claude Code, high-tier skills can also use native skill frontmatter:

```yaml
model: best
effort: xhigh
```

As of the current Claude Code docs, `best` resolves to the most capable available model and is currently equivalent to `opus`; on Anthropic API, `opus` resolves to Opus 4.7 on Claude Code v2.1.111 or later. `xhigh` is the recommended default effort level for Opus 4.7. Use `max` only when you deliberately want unconstrained deeper reasoning for the current session.

#### Auto-compact Opus at ~200k

Claude Code ships Opus on a 1M context window, so auto-compact only fires near
1M tokens — a 200k-sized conversation never compacts and silently grows. If you
want Opus to auto-compact at ~200k instead, this option sets it up.

**How the trigger works.** Claude Code fires auto-compact when
`tokens >= window - 33000`, where `window = min(modelMax, autoCompactWindow)`.
Setting `autoCompactWindow` to **233000** gives `233000 - 33000 = 200000` — so
compaction kicks in at ~200k. The `33000` (a 20k output buffer + a 13k floor) is
hardcoded in Claude Code; it is the reason you cannot compact at *exactly* the
ceiling. Mechanism decoded from the Claude Code bundle — see
[`docs/adr/0002-opus-auto-compact-at-200k.md`](docs/adr/0002-opus-auto-compact-at-200k.md).

**Keep the 1M model on.** The window is clamped to `min(modelMax, autoCompactWindow)`.
To reach 233000 you need `modelMax = 1,000,000`, i.e. the normal 1M Opus. So this
option does **not** set `CLAUDE_CODE_DISABLE_1M_CONTEXT` — and if an older devkit
version left that flag in your settings, enabling this option removes it (the flag
caps `modelMax` at 200000, which would drop the trigger back to ~167k).

`/context` will still show a 1M ceiling — that's expected. The conversation just
compacts at ~200k, leaving ~800k of headroom; cost is unchanged because input
stays around 200k and never enters the 1M premium tier.

> **Requires 1M-context access.** If your account does not have Claude Code's 1M
> context, `modelMax` is 200000, the window clamps to `min(200000, 233000) = 200000`,
> and the trigger lands at ~167k instead of 200k. It still compacts — just a bit
> earlier. There is no way to push it past `modelMax - 33000`.

The installer offers this as an **opt-in, off by default**. When Claude's
`settings.json` is part of the install, it asks:

```text
? Auto-compact Opus at ~200k tokens (sets autoCompactWindow=233000)? (y/N)
```

Answering yes patches `~/.claude/settings.json` to add:

```json
"autoCompactWindow": 233000
```

The patch is idempotent and preserves your other settings (and strips a stale
`CLAUDE_CODE_DISABLE_1M_CONTEXT` env flag if present). Re-running the installer and
answering no removes the key again — but only when it still equals `233000`, so a
custom value you set yourself is never clobbered. For non-interactive installs, set
`DEVKIT_OPUS_200K=1` (or `0`) to skip the prompt. You can also set
`"autoCompactWindow"` by hand at any time. Restart Claude Code to apply — settings
are read at launch.

## Source Of Truth

The repo layout is intentionally small:

```text
devkit/
  skills/              # Shared SKILL.md files and Codex openai.yaml files
  claude/
    CLAUDE.md          # Shared global instruction source
    settings.json
    settings.local.json
    mcp.json
    agents/            # Claude/Cursor subagent definitions
    plugins/
  shell/
  src/                 # Installer implementation
  scripts/smoke.sh     # Filesystem contract smoke test
```

Because skills are symlinked as whole directories, adding `examples.md`, `scripts/`, or other supporting files under `skills/<name>/` makes them immediately available to every selected tool after installation.

If you move the checkout, rerun `node install.js` so the symlinks point at the new path.

## Included Agents

| Agent | Purpose |
|-------|---------|
| `git-master` | Commits, PRs, and version control workflows without AI watermarks |
| `code-reviewer` | Read-only code quality review |
| `testing-wizard` | Test execution and coverage analysis |
| `documentation-scholar` | Technical documentation writing |
| `api-planner` | API research and integration planning |
| `senior-interviewer` | Mock technical interviews |

## Included Skills

| Skill | What it does |
|-------|--------------|
| `/ask` | Answer questions without writing code |
| `/ddd` | Design-Driven Development visual verification for UI work |
| `/document` | Generate technical documentation via `documentation-scholar` |
| `/documentation-pass` | Audit and update docs after meaningful codebase change |
| `/e2e-playwright-test` | Run an LLM-guided Playwright smoke test |
| `/evaluate` | Review an implementation and quiz the tradeoffs |
| `/fix-pr-review` | Reconcile external PR reviews with your own review and apply warranted fixes |
| `/git-commit` | Stage and commit changes with conventional commit messages |
| `/grill-me` | Stress-test a plan through a structured interview |
| `/handoff` | Write a handoff document for another team, repo, or agent |
| `/improve-codebase-architecture` | Find module-deepening architecture improvements |
| `/pr` | Create a clean pull request description and PR |
| `/pr-review` | Run a diligent end-of-cycle PR review |
| `/prd-to-issues` | Break a PRD into vertical-slice GitHub issues |
| `/review-code` | Review code quality and testing risk |
| `/sync-skills` | Audit and repair Claude Code, Codex, and Cursor skill synchronization |
| `/tdd` | Build with a red-green-refactor loop |
| `/ubiquitous-language` | Extract a DDD-style domain glossary |
| `/write-a-prd` | Interview, explore, and write a product requirements document |

## Updating

```bash
cd ~/devkit
git pull
./setup.sh          # Full update
# or
node install.js     # AI coding config only
```

Choose "Overwrite all remaining" if you want the installer to refresh every managed file.

## Testing The Installer

The smoke test runs the installer against a temporary `HOME` and verifies the filesystem contract: symlinked skill directories, Cursor agents, copied settings, idempotency, and valid skill frontmatter.

```bash
./scripts/smoke.sh
```

## Customizing

### Add A Skill

1. Create `skills/<skill-name>/SKILL.md`.
2. Write a clear first sentence in the frontmatter `description`; that sentence becomes the generated Codex summary.
3. Add `x-devkit-model-tier: highest` only for skills that should request the strongest available model/reasoning tier.
4. Run `/sync-skills` or `node scripts/sync-skills.js --apply`.
5. Run `node install.js` if you need to reinstall the managed symlinks on this machine.

`node install.js` discovers `skills/*/SKILL.md` automatically and regenerates `agents/openai.yaml` from the frontmatter description when needed.

`node scripts/sync-skills.js` without `--apply` is a dry run. Use `--envs=claude,codex,cursor` or `DEVKIT_AI_ENVS` to limit link repair to a selected environment subset.

If a tool installer puts a new skill directly into Claude, Codex, or Cursor, import it intentionally:

```bash
node scripts/sync-skills.js --apply --force-import=notebooklm
```

If more than one selected environment has that external skill, qualify the source, such as `--force-import=claude/notebooklm`.

### Add An Agent

1. Create `claude/agents/<agent-name>.md`.
2. Add Claude and Cursor targets in `src/packages.js`.
3. Run `node install.js`.

### Add A Bootstrap Component

Add a new `install_*` function in `bootstrap.sh`, then call it from `main`.

## MCP Servers

After installation, see `CLAUDE_INSTRUCTIONS.md` for optional MCP setup notes, including context7, exa, puppeteer, and sequential-thinking.

## Platform Support

- macOS, Intel and Apple Silicon
- Linux
- WSL2

Cursor auto-install is currently macOS-only through Homebrew Cask. On Linux or WSL2, install Cursor manually and then run `node install.js`.

## Credits

Some skills were adapted from [Matt Pocock's skills collection](https://github.com/mattpocock/skills) under the MIT license, including:

- `/grill-me`
- `/write-a-prd`
- `/prd-to-issues`
- `/ubiquitous-language`
- `/improve-codebase-architecture`
- `/tdd`

## License

MIT
