# Claude Settings + Machine Bootstrap

Portable development environment setup with Claude Code configuration.

## Quick Start

### Option 1: Complete Setup (New Machine)

Sets up your entire dev environment + Claude settings:

```bash
git clone <your-repo-url> ~/claude-settings
cd ~/claude-settings
./setup.sh
```

**Installs:** Homebrew, Zsh, Oh-My-Zsh, Powerlevel10k, Git, GitHub CLI, Node.js, pnpm, Python 3, Docker, CLI tools, Claude Code, and all Claude settings.

### Option 2: Bootstrap Only

Just dev tools, no Claude configuration:

```bash
./bootstrap.sh
```

### Option 3: Claude Settings Only

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
| AI | Claude Code |

Each component:
- Checks if already installed
- Prompts before installing
- Supports "skip all" / "reinstall all" for batch operations

### Claude Settings (`node install.js`)

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
| Commands | /add-commit, /pr, /review-code, /document, /ask |

**Note:** Model selection is intentionally excluded. Configure your preferred model fresh on each machine.

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
cd ~/claude-settings
git pull
./setup.sh          # Full update
# OR
node install.js     # Just Claude settings
```

Choose "Overwrite all remaining" when prompted to update all files.

---

## Customization

### Adding New Agents
1. Create a markdown file in `agents/`
2. Add the file to `src/packages.js` under the agents package

### Adding New Commands
1. Create a markdown file in `commands/`
2. Add the file to `src/packages.js` under the commands package

### Adding Bootstrap Components
Edit `bootstrap.sh` and add a new `install_*` function.

---

## Platform Support

- **macOS** (Intel + Apple Silicon)
- **Linux**
- **WSL2**

---

## License

MIT
