// Package definitions for Claude Code settings installer

export const packages = {
  settings: {
    name: 'Core Settings',
    description: 'Permissions, auto-approve settings, and MCP configuration',
    category: 'settings',
    defaultMode: 'copy',
    files: [
      { src: 'claude/CLAUDE.md', dest: '~/CLAUDE.md', name: 'CLAUDE.md', mode: 'link' },
      { src: 'claude/settings.json', dest: '~/.claude/settings.json', name: 'settings.json' },
      { src: 'claude/settings.local.json', dest: '~/.claude/settings.local.json', name: 'settings.local.json' },
      { src: 'claude/mcp.json', dest: '~/.mcp.json', name: 'mcp.json' },
    ]
  },
  agents: {
    name: 'Agents',
    description: 'Specialized subagents for different tasks',
    category: 'agents',
    defaultMode: 'link',
    files: [
      { src: 'claude/agents/git-master.md', dest: '~/.claude/agents/git-master.md', name: 'git-master' },
      { src: 'claude/agents/code-reviewer.md', dest: '~/.claude/agents/code-reviewer.md', name: 'code-reviewer' },
      { src: 'claude/agents/testing-wizard.md', dest: '~/.claude/agents/testing-wizard.md', name: 'testing-wizard' },
      { src: 'claude/agents/documentation-scholar.md', dest: '~/.claude/agents/documentation-scholar.md', name: 'documentation-scholar' },
      { src: 'claude/agents/api-planner.md', dest: '~/.claude/agents/api-planner.md', name: 'api-planner' },
      { src: 'claude/agents/senior-interviewer.md', dest: '~/.claude/agents/senior-interviewer.md', name: 'senior-interviewer' },
    ]
  },
  skills: {
    name: 'Skills',
    description: 'Custom slash command skills (shared with Claude Code and Codex). Each entry symlinks the whole skill directory so files added later appear automatically.',
    category: 'skills',
    defaultMode: 'link',
    files: [
      { src: 'skills/git-commit', dest: '~/.claude/skills/git-commit', name: '/git-commit' },
      { src: 'skills/pr', dest: '~/.claude/skills/pr', name: '/pr' },
      { src: 'skills/review-code', dest: '~/.claude/skills/review-code', name: '/review-code' },
      { src: 'skills/document', dest: '~/.claude/skills/document', name: '/document' },
      { src: 'skills/ask', dest: '~/.claude/skills/ask', name: '/ask' },
      { src: 'skills/grill-me', dest: '~/.claude/skills/grill-me', name: '/grill-me' },
      { src: 'skills/write-a-prd', dest: '~/.claude/skills/write-a-prd', name: '/write-a-prd' },
      { src: 'skills/prd-to-issues', dest: '~/.claude/skills/prd-to-issues', name: '/prd-to-issues' },
      { src: 'skills/tdd', dest: '~/.claude/skills/tdd', name: '/tdd' },
      { src: 'skills/evaluate', dest: '~/.claude/skills/evaluate', name: '/evaluate' },
      { src: 'skills/improve-codebase-architecture', dest: '~/.claude/skills/improve-codebase-architecture', name: '/improve-codebase-architecture' },
      { src: 'skills/ddd', dest: '~/.claude/skills/ddd', name: '/ddd' },
      { src: 'skills/documentation-pass', dest: '~/.claude/skills/documentation-pass', name: '/documentation-pass' },
      { src: 'skills/e2e-playwright-test', dest: '~/.claude/skills/e2e-playwright-test', name: '/e2e-playwright-test' },
      { src: 'skills/handoff', dest: '~/.claude/skills/handoff', name: '/handoff' },
      { src: 'skills/pr-review', dest: '~/.claude/skills/pr-review', name: '/pr-review' },
      { src: 'skills/ubiquitous-language', dest: '~/.claude/skills/ubiquitous-language', name: '/ubiquitous-language' },
    ]
  },
  plugins: {
    name: 'Plugins Reference',
    description: 'Plugin list for manual installation reference',
    category: 'plugins',
    defaultMode: 'copy',
    files: [
      { src: 'claude/plugins/installed_plugins.json', dest: '~/.claude/plugins/installed_plugins.json', name: 'plugins.json' },
    ]
  },
  shell: {
    name: 'Shell Config',
    description: 'Managed .zshrc with plugins, aliases, and tool inits (carapace, atuin, zoxide, fzf)',
    category: 'shell',
    defaultMode: 'copy',
    files: [
      { src: 'shell/zshrc', dest: '~/.zshrc', name: '.zshrc' },
    ]
  }
};

// Installation modes
export const modes = {
  minimal: {
    name: 'Minimal',
    description: 'Settings + permissions only',
    packages: ['settings']
  },
  full: {
    name: 'Full',
    description: 'Everything (settings, agents, skills, plugins, shell)',
    packages: ['settings', 'agents', 'skills', 'plugins', 'shell']
  }
};

// Resolve effective mode: per-file override beats package default beats 'copy'
function resolveMode(file, pkg) {
  return file.mode ?? pkg.defaultMode ?? 'copy';
}

// Get all files for given package names
export function getFilesForPackages(packageNames) {
  const files = [];
  for (const pkgName of packageNames) {
    const pkg = packages[pkgName];
    if (pkg) {
      for (const file of pkg.files) {
        files.push({ ...file, mode: resolveMode(file, pkg) });
      }
    }
  }
  return files;
}

// Get all items for manual selection
export function getAllItems() {
  const items = [];
  for (const [pkgName, pkg] of Object.entries(packages)) {
    for (const file of pkg.files) {
      items.push({
        ...file,
        mode: resolveMode(file, pkg),
        package: pkgName,
        packageName: pkg.name
      });
    }
  }
  return items;
}
