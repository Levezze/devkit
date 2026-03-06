# Claude Code Setup Instructions

This document contains instructions for Claude Code to help set up MCP servers and additional tools.

## MCP Servers to Install

After running the installer, you can ask Claude Code to help install these MCP servers by pasting the prompt below.

### Recommended MCP Servers

1. **context7** - Documentation lookup for any library
2. **exa** - AI-powered web search
3. **sequential-thinking** - Structured reasoning and problem-solving
4. **puppeteer** - Browser automation
5. **duckduckgo-search** - Web search fallback
6. **claude-context** - Codebase indexing and semantic search

### Installation Prompt

Copy and paste this into Claude Code:

```
Set up my MCP servers. Add these to my ~/.mcp.json using the latest installation methods:

1. context7 - Documentation lookup for libraries
2. exa - AI-powered web search
3. sequential-thinking - Structured reasoning
4. puppeteer - Browser automation
5. duckduckgo-search - Web search
6. claude-context - Codebase indexing and semantic search

For each server:
1. Look up the latest npm package name and version
2. Add the configuration to ~/.mcp.json
3. Verify the configuration is correct

shadcn is already configured.
```

## Manual MCP Configuration

If you prefer to configure MCP servers manually, add them to `~/.mcp.json`:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["package-name@latest"]
    }
  }
}
```

## Installed Components

### Agents

| Agent | Description |
|-------|-------------|
| git-master | Git operations, commits, PR descriptions |
| code-reviewer | Code quality, best practices, DRY principles |
| testing-wizard | Test execution, coverage analysis |
| documentation-scholar | Documentation generation |
| api-planner | API design and planning |
| senior-interviewer | Technical interview prep |

### Commands

| Command | Description |
|---------|-------------|
| /git-commit | Add and commit with conventional format |
| /pr | Generate PR descriptions |
| /review-code | Code quality review |
| /document | Generate documentation |
| /ask | Custom ask command |

## Troubleshooting

### MCP Server Not Working

1. Check if the server is configured in `~/.mcp.json`
2. Verify the npm package exists: `npm info <package-name>`
3. Try running manually: `npx <package-name>`
4. Check Claude Code logs for errors

### Settings Not Applied

1. Verify files exist in `~/.claude/`
2. Restart Claude Code
3. Check file permissions

### Permission Issues

Make sure your user has write access to:
- `~/.claude/`
- `~/.config/claude-code/`
- `~/.mcp.json`

## Updating Settings

To update settings from this repository:

1. Pull the latest changes: `git pull`
2. Run the installer again: `node install.js`
3. Choose to overwrite existing files when prompted
