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
| Skills | /git-commit, /pr, /review-code, /document, /ask, /grill-me, /write-a-prd, /prd-to-issues, /tdd, /improve-codebase-architecture |

**Note:** Model selection is intentionally excluded. Configure your preferred model fresh on each machine.

---

## Codex Skill Sharing

Skills are shared between Claude Code and Codex CLI. Each skill directory contains:
- `SKILL.md` — Claude Code skill definition
- `agents/openai.yaml` — Codex-compatible agent definition

The bootstrap script automatically symlinks skills to `~/.codex/skills/` when Codex is installed. Skills work identically in both tools.

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

\* Adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (MIT)

---

## Customization

### Adding New Agents
1. Create a markdown file in `claude/agents/`
2. Add the file to `src/packages.js` under the agents package

### Adding New Skills
1. Create a directory in `claude/skills/<skill-name>/`
2. Add a `SKILL.md` inside it
3. Add `agents/openai.yaml` for Codex compatibility
4. Add the files to `src/packages.js` under the skills package

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
