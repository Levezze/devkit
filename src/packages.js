// Package definitions for Claude Code settings installer

export const packages = {
  settings: {
    name: 'Core Settings',
    description: 'Permissions, auto-approve settings, and MCP configuration',
    category: 'settings',
    files: [
      { src: 'config/settings.json', dest: '~/.claude/settings.json', name: 'settings.json' },
      { src: 'config/settings.local.json', dest: '~/.claude/settings.local.json', name: 'settings.local.json' },
      { src: 'config/mcp.json', dest: '~/.mcp.json', name: 'mcp.json' },
    ]
  },
  agents: {
    name: 'Agents',
    description: 'Specialized subagents for different tasks',
    category: 'agents',
    files: [
      { src: 'agents/git-master.md', dest: '~/.claude/agents/git-master.md', name: 'git-master' },
      { src: 'agents/code-reviewer.md', dest: '~/.claude/agents/code-reviewer.md', name: 'code-reviewer' },
      { src: 'agents/testing-wizard.md', dest: '~/.claude/agents/testing-wizard.md', name: 'testing-wizard' },
      { src: 'agents/documentation-scholar.md', dest: '~/.claude/agents/documentation-scholar.md', name: 'documentation-scholar' },
      { src: 'agents/api-planner.md', dest: '~/.claude/agents/api-planner.md', name: 'api-planner' },
      { src: 'agents/senior-interviewer.md', dest: '~/.claude/agents/senior-interviewer.md', name: 'senior-interviewer' },
    ]
  },
  skills: {
    name: 'Skills',
    description: 'Custom slash command skills',
    category: 'skills',
    files: [
      { src: 'skills/add-commit/SKILL.md', dest: '~/.claude/skills/add-commit/SKILL.md', name: '/add-commit' },
      { src: 'skills/pr/SKILL.md', dest: '~/.claude/skills/pr/SKILL.md', name: '/pr' },
      { src: 'skills/review-code/SKILL.md', dest: '~/.claude/skills/review-code/SKILL.md', name: '/review-code' },
      { src: 'skills/document/SKILL.md', dest: '~/.claude/skills/document/SKILL.md', name: '/document' },
      { src: 'skills/ask/SKILL.md', dest: '~/.claude/skills/ask/SKILL.md', name: '/ask' },
    ]
  },
  plugins: {
    name: 'Plugins Reference',
    description: 'Plugin list for manual installation reference',
    category: 'plugins',
    files: [
      { src: 'reference/plugins.json', dest: '~/.claude/plugins/installed_plugins.json', name: 'plugins.json' },
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
