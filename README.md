# Devkit

Portable development environment bootstrap and Claude Code + Codex configuration.

## Quick Start

### Option 1: Complete Setup (New Machine)

Sets up your entire dev environment + Claude/Codex config:

```bash
git clone <your-repo-url> ~/devkit
cd ~/devkit
./setup.sh
```

**Installs:** Homebrew, Zsh, Oh-My-Zsh, Powerlevel10k, Git, GitHub CLI, Node.js, pnpm, Python 3, Docker, CLI tools, Claude Code, Codex CLI, and all configuration.

### Option 2: Bootstrap Only

Just dev tools, no Claude configuration:

```bash
./bootstrap.sh
```

### Option 3: Claude Config Only

Machine already set up, just want Claude config:

```bash
npm install
node install.js
```

---

## What Gets Installed

### Bootstrap (`bootstrap.sh`)

| Category | Tools |
|----------|-------|
| Shell | Zsh, Oh-My-Zsh, Powerlevel10k |
| Package Manager | Homebrew |
| Version Control | Git, GitHub CLI |
| JavaScript | Node.js (via nvm), pnpm |
| Python | Python 3 |
| Containers | Docker |
| CLI Utilities | curl, wget, jq, tree, htop, ripgrep, fd, bat, eza |
| AI | Claude Code, Codex CLI |

Each component:
- Checks if already installed
- Prompts before installing
- Supports "skip all" / "reinstall all" for batch operations

### Claude Config (`node install.js`)

**Installation Modes:**
- **Minimal** - Settings + permissions only
- **Full** - Everything
- **Categories** - Select packages
- **Manual** - Pick individual items

**Included:**

| Type | Items |
|------|-------|
| Settings | `settings.json`, `settings.local.json`, `mcp.json` |
| Agents | git-master, code-reviewer, testing-wizard, documentation-scholar, api-planner, senior-interviewer |
| Skills | /git-commit, /pr, /review-code, /document, /ask, /grill-me, /write-a-prd, /prd-to-issues, /tdd, /improve-codebase-architecture, /evaluate, /ddd, /documentation-pass, /e2e-playwright-test, /handoff, /pr-review, /ubiquitous-language |

**Note:** Model selection is intentionally excluded. Configure your preferred model fresh on each machine.

---

## Source-of-truth model

Devkit is the single source of truth for skills, subagents, and `CLAUDE.md`. The installer creates **symlinks** from `~/.claude/skills/<name>` and `~/.codex/skills/<name>` directly into `~/projects/devkit/skills/<name>`. Editing a skill via either path edits the same file in devkit; `git -C ~/projects/devkit status` shows pending changes.

Settings files that take placeholder substitution (`mcp.json`) are still copied, not symlinked.

### Layout

```
devkit/
  skills/              # SHARED: SKILL.md (Claude) + agents/openai.yaml (Codex)
  claude/              # Claude-specific
    CLAUDE.md
    settings.json
    settings.local.json
    mcp.json
    agents/            # subagents
    plugins/
  shell/
  src/                 # installer
```

### Editing skills

Edit `~/.claude/skills/<name>/SKILL.md` (a symlink) or the devkit path — same file. When you're ready, commit from devkit. No reverse-sync step.

### Codex skill sharing

Each skill directory contains:
- `SKILL.md` — Claude Code skill definition
- `agents/openai.yaml` — Codex-compatible agent definition (`interface:` schema)

`bootstrap.sh` symlinks every `devkit/skills/<name>` into `~/.codex/skills/<name>` when Codex is installed. Codex auto-discovers skills by walking that directory.

### Path coupling caveat

Symlinks bind to the devkit checkout path. Moving or renaming `~/projects/devkit` breaks the links — re-run `node install.js` and the codex symlink loop in `bootstrap.sh` to fix.

---

## MCP Servers

After installation, see `CLAUDE_INSTRUCTIONS.md` for help setting up additional MCP servers:
- context7 (documentation lookup)
- exa (web search)
- puppeteer (browser automation)
- sequential-thinking
- And more

---

## Updating

```bash
cd ~/devkit
git pull
./setup.sh          # Full update
# OR
node install.js     # Just Claude config
```

Choose "Overwrite all remaining" when prompted to update all files.

---

## Agents

Each agent is a specialized subagent with scoped tool access and turn limits.

| Agent | Purpose | Tools | Max Turns |
|-------|---------|-------|-----------|
| git-master | Commits, PRs, version control. No AI watermarks. | All (needs Bash + Write for git) | 15 |
| code-reviewer | Read-only code quality review | Read, Glob, Grep | 15 |
| testing-wizard | Test execution and coverage analysis | Read, Glob, Grep, Bash | 20 |
| documentation-scholar | Technical documentation writing | All (needs Write for docs) | 20 |
| api-planner | API research and integration planning | Read, Glob, Grep, WebFetch, WebSearch | 15 |
| senior-interviewer | Mock technical interviews | Read, Write, Glob, Grep | 50 |

## Skills

| Skill | What it does |
|-------|-------------|
| /git-commit | Stage and commit changes with conventional commit format |
| /pr | Create a PR with clean description |
| /review-code | Two-step review: code quality first, then testing if needed |
| /document | Generate documentation via documentation-scholar |
| /ask | Research questions without writing code |
| /grill-me* | Stress-test a plan through relentless interview |
| /write-a-prd* | Create a PRD through interview, codebase exploration, and module design |
| /prd-to-issues* | Break a PRD into vertical-slice GitHub issues |
| /tdd* | Test-driven development with red-green-refactor loop |
| /improve-codebase-architecture* | Find and propose module-deepening refactors |
| /evaluate | Post-implementation review — quizzes you on design decisions and tradeoffs |
| /ddd | Design-Driven Development — visual checklist verification via Playwright MCP |
| /documentation-pass | Holistic documentation audit (CLAUDE.md, docs/, README, ADRs) |
| /e2e-playwright-test | LLM-piloted end-to-end smoke against a deployed app |
| /handoff | Generate a handoff document to another team, repo, or agent |
| /pr-review | Diligent end-of-cycle PR review (read-only, presents findings) |
| /ubiquitous-language | Extract DDD-style domain glossary from the conversation |

\* Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT)

---

## Customization

### Adding New Agents
1. Create a markdown file in `claude/agents/`
2. Add the file to `src/packages.js` under the agents package

### Adding New Skills
1. Create a directory in `skills/<skill-name>/`
2. Add a `SKILL.md` inside it (Claude Code reads frontmatter: `name`, `description`, optionally `disable-model-invocation`, `allowed-tools`)
3. Add `agents/openai.yaml` for Codex compatibility (use `interface:` schema with `display_name`, `short_description`, `default_prompt`)
4. Register both files in `src/packages.js` under the skills package
5. Run `node install.js` — symlinks appear in `~/.claude/skills/` and `~/.codex/skills/` automatically

### Adding Bootstrap Components
Edit `bootstrap.sh` and add a new `install_*` function.

---

## Platform Support

- **macOS** (Intel + Apple Silicon)
- **Linux**
- **WSL2**

---

## Credits

The following skills are adapted from [Matt Pocock's skills collection](https://github.com/mattpocock/skills) (MIT):
- /grill-me
- /write-a-prd
- /prd-to-issues
- /tdd
- /improve-codebase-architecture

## License

MIT
