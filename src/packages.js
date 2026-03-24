// Package definitions for Claude Code settings installer

export const packages = {
  settings: {
    name: 'Core Settings',
    description: 'Permissions, auto-approve settings, and MCP configuration',
    category: 'settings',
    files: [
      { src: 'claude/CLAUDE.md', dest: '~/CLAUDE.md', name: 'CLAUDE.md' },
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
    description: 'Custom slash command skills (shared with Claude Code and Codex)',
    category: 'skills',
    files: [
      // Core skills
      { src: 'claude/skills/git-commit/SKILL.md', dest: '~/.claude/skills/git-commit/SKILL.md', name: '/git-commit' },
      { src: 'claude/skills/git-commit/agents/openai.yaml', dest: '~/.claude/skills/git-commit/agents/openai.yaml', name: '/git-commit (codex)' },
      { src: 'claude/skills/pr/SKILL.md', dest: '~/.claude/skills/pr/SKILL.md', name: '/pr' },
      { src: 'claude/skills/pr/agents/openai.yaml', dest: '~/.claude/skills/pr/agents/openai.yaml', name: '/pr (codex)' },
      { src: 'claude/skills/review-code/SKILL.md', dest: '~/.claude/skills/review-code/SKILL.md', name: '/review-code' },
      { src: 'claude/skills/review-code/agents/openai.yaml', dest: '~/.claude/skills/review-code/agents/openai.yaml', name: '/review-code (codex)' },
      { src: 'claude/skills/document/SKILL.md', dest: '~/.claude/skills/document/SKILL.md', name: '/document' },
      { src: 'claude/skills/document/agents/openai.yaml', dest: '~/.claude/skills/document/agents/openai.yaml', name: '/document (codex)' },
      { src: 'claude/skills/ask/SKILL.md', dest: '~/.claude/skills/ask/SKILL.md', name: '/ask' },
      { src: 'claude/skills/ask/agents/openai.yaml', dest: '~/.claude/skills/ask/agents/openai.yaml', name: '/ask (codex)' },
      // Interview & planning
      { src: 'claude/skills/grill-me/SKILL.md', dest: '~/.claude/skills/grill-me/SKILL.md', name: '/grill-me' },
      { src: 'claude/skills/grill-me/agents/openai.yaml', dest: '~/.claude/skills/grill-me/agents/openai.yaml', name: '/grill-me (codex)' },
      { src: 'claude/skills/write-a-prd/SKILL.md', dest: '~/.claude/skills/write-a-prd/SKILL.md', name: '/write-a-prd' },
      { src: 'claude/skills/write-a-prd/agents/openai.yaml', dest: '~/.claude/skills/write-a-prd/agents/openai.yaml', name: '/write-a-prd (codex)' },
      { src: 'claude/skills/prd-to-issues/SKILL.md', dest: '~/.claude/skills/prd-to-issues/SKILL.md', name: '/prd-to-issues' },
      { src: 'claude/skills/prd-to-issues/agents/openai.yaml', dest: '~/.claude/skills/prd-to-issues/agents/openai.yaml', name: '/prd-to-issues (codex)' },
      // TDD (multi-file)
      { src: 'claude/skills/tdd/SKILL.md', dest: '~/.claude/skills/tdd/SKILL.md', name: '/tdd' },
      { src: 'claude/skills/tdd/deep-modules.md', dest: '~/.claude/skills/tdd/deep-modules.md', name: '/tdd (deep-modules)' },
      { src: 'claude/skills/tdd/interface-design.md', dest: '~/.claude/skills/tdd/interface-design.md', name: '/tdd (interface-design)' },
      { src: 'claude/skills/tdd/mocking.md', dest: '~/.claude/skills/tdd/mocking.md', name: '/tdd (mocking)' },
      { src: 'claude/skills/tdd/refactoring.md', dest: '~/.claude/skills/tdd/refactoring.md', name: '/tdd (refactoring)' },
      { src: 'claude/skills/tdd/tests.md', dest: '~/.claude/skills/tdd/tests.md', name: '/tdd (tests)' },
      { src: 'claude/skills/tdd/agents/openai.yaml', dest: '~/.claude/skills/tdd/agents/openai.yaml', name: '/tdd (codex)' },
      // Post-implementation review
      { src: 'claude/skills/evaluate/SKILL.md', dest: '~/.claude/skills/evaluate/SKILL.md', name: '/evaluate' },
      { src: 'claude/skills/evaluate/agents/openai.yaml', dest: '~/.claude/skills/evaluate/agents/openai.yaml', name: '/evaluate (codex)' },
      // Architecture improvement (multi-file)
      { src: 'claude/skills/improve-codebase-architecture/SKILL.md', dest: '~/.claude/skills/improve-codebase-architecture/SKILL.md', name: '/improve-codebase-architecture' },
      { src: 'claude/skills/improve-codebase-architecture/REFERENCE.md', dest: '~/.claude/skills/improve-codebase-architecture/REFERENCE.md', name: '/improve-codebase-architecture (ref)' },
      { src: 'claude/skills/improve-codebase-architecture/agents/openai.yaml', dest: '~/.claude/skills/improve-codebase-architecture/agents/openai.yaml', name: '/improve-codebase-architecture (codex)' },
    ]
  },
  plugins: {
    name: 'Plugins Reference',
    description: 'Plugin list for manual installation reference',
    category: 'plugins',
    files: [
      { src: 'claude/plugins/installed_plugins.json', dest: '~/.claude/plugins/installed_plugins.json', name: 'plugins.json' },
    ]
  },
  shell: {
    name: 'Shell Config',
    description: 'Managed .zshrc with plugins, aliases, and tool inits (carapace, atuin, zoxide, fzf)',
    category: 'shell',
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
