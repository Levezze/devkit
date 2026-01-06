# Claude Settings

Interactive installer for Claude Code settings, agents, commands, and MCP configuration.

## Quick Start

```bash
git clone <your-repo-url>
cd claude-settings
npm install
node install.js
```

## Installation Modes

### Minimal
Installs only core settings:
- `settings.json` - Auto-approve settings, permissions
- `settings.local.json` - Permission allowlists
- `mcp.json` - MCP server configuration

### Full
Installs everything:
- Core settings
- 6 specialized agents
- 5 custom commands
- Plugin reference

### Categories
Select which packages to install:
- Settings
- Agents
- Commands
- Plugins

### Manual
Pick individual items to install.

## What's Included

### Settings
- Auto-approve settings for common tools
- Permission allowlists for bash commands
- MCP server enables

**Note:** Model selection is intentionally excluded. Configure your preferred model fresh on each machine.

### Agents
| Agent | Purpose |
|-------|---------|
| git-master | Git operations, conventional commits, PR descriptions |
| code-reviewer | Code quality review, best practices |
| testing-wizard | Test execution and coverage |
| documentation-scholar | Documentation generation |
| api-planner | API design and planning |
| senior-interviewer | Technical interview preparation |

### Commands
| Command | Purpose |
|---------|---------|
| /add-commit | Quick add and commit with conventional format |
| /pr | Generate PR descriptions from commits |
| /review-code | Comprehensive code review |
| /document | Generate documentation |
| /ask | Custom ask command |

## MCP Servers

After installation, see `CLAUDE_INSTRUCTIONS.md` for help setting up additional MCP servers like:
- context7 (documentation lookup)
- exa (web search)
- puppeteer (browser automation)
- And more

## Updating

To update your settings:

```bash
cd claude-settings
git pull
node install.js
```

Choose "Overwrite all remaining" when prompted to update all files.

## Customization

### Adding New Agents
1. Create a markdown file in `agents/`
2. Add the file to `src/packages.js` under the agents package

### Adding New Commands
1. Create a markdown file in `commands/`
2. Add the file to `src/packages.js` under the commands package

## License

MIT
