// Package definitions for Claude Code settings installer

export const packages = {
  settings: {
    name: 'Core Settings',
    description: 'Permissions, auto-approve settings, and MCP configuration',
    category: 'settings',
    files: [
      { src: 'claude/settings.json', dest: '~/.claude/settings.json', name: 'settings.json' },
      { src: 'claude/settings.local.json', dest: '~/.claude/settings.local.json', name: 'settings.local.json' },
      { src: 'claude/mcp.json', dest: '~/.mcp.json', name: 'mcp.json' },
    ]
  },
  agents: {
    name: 'Agents',
    description: 'Specialized subagents for different tasks',
    category: 'agents',
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
    description: 'Custom slash command skills',
    category: 'skills',
    files: [
      { src: 'claude/skills/add-commit/SKILL.md', dest: '~/.claude/skills/add-commit/SKILL.md', name: '/add-commit' },
      { src: 'claude/skills/pr/SKILL.md', dest: '~/.claude/skills/pr/SKILL.md', name: '/pr' },
      { src: 'claude/skills/review-code/SKILL.md', dest: '~/.claude/skills/review-code/SKILL.md', name: '/review-code' },
      { src: 'claude/skills/document/SKILL.md', dest: '~/.claude/skills/document/SKILL.md', name: '/document' },
      { src: 'claude/skills/ask/SKILL.md', dest: '~/.claude/skills/ask/SKILL.md', name: '/ask' },
    ]
  },
  plugins: {
    name: 'Plugins Reference',
    description: 'Plugin list for manual installation reference',
    category: 'plugins',
    files: [
      { src: 'claude/plugins/installed_plugins.json', dest: '~/.claude/plugins/installed_plugins.json', name: 'plugins.json' },
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
    description: 'Everything (settings, agents, skills, plugins)',
    packages: ['settings', 'agents', 'skills', 'plugins']
  }
};

// Get all files for given package names
export function getFilesForPackages(packageNames) {
  const files = [];
  for (const pkgName of packageNames) {
    if (packages[pkgName]) {
      files.push(...packages[pkgName].files);
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
        package: pkgName,
        packageName: pkg.name
      });
    }
  }
  return items;
}
