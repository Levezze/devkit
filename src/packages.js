import { discoverSkillNames } from './skill-sync.js';

// Package definitions for AI coding settings installer

export const aiEnvironments = {
  claude: {
    name: 'Claude Code',
    description: 'Claude Code CLI settings, agents, and skills'
  },
  codex: {
    name: 'Codex',
    description: 'Codex global instructions and skills'
  },
  cursor: {
    name: 'Cursor',
    description: 'Cursor global instructions, agents, and skills'
  }
};

const skillNames = discoverSkillNames();

function skillFilesForEnvironment(environment, destRoot) {
  const label = aiEnvironments[environment].name;
  return skillNames.map(skill => ({
    src: `skills/${skill}`,
    dest: `${destRoot}/${skill}`,
    name: `${label} /${skill}`,
    environments: [environment],
  }));
}

export const packages = {
  settings: {
    name: 'Core Instructions & Settings',
    description: 'Global instructions, permissions, auto-approve settings, and MCP configuration',
    category: 'settings',
    defaultMode: 'copy',
    files: [
      { src: 'claude/CLAUDE.md', dest: '~/CLAUDE.md', name: 'Claude CLAUDE.md', mode: 'link', environments: ['claude'] },
      { src: 'claude/settings.json', dest: '~/.claude/settings.json', name: 'Claude settings.json', environments: ['claude'] },
      { src: 'claude/settings.local.json', dest: '~/.claude/settings.local.json', name: 'Claude settings.local.json', environments: ['claude'] },
      { src: 'claude/mcp.json', dest: '~/.mcp.json', name: 'Claude mcp.json', environments: ['claude'] },
      { src: 'claude/CLAUDE.md', dest: '~/.codex/AGENTS.md', name: 'Codex AGENTS.md', mode: 'link', environments: ['codex'] },
      { src: 'claude/CLAUDE.md', dest: '~/.cursor/AGENTS.md', name: 'Cursor AGENTS.md', mode: 'link', environments: ['cursor'] },
      { src: 'claude/CLAUDE.md', dest: '~/.cursor/CLAUDE.md', name: 'Cursor CLAUDE.md', mode: 'link', environments: ['cursor'] },
    ]
  },
  agents: {
    name: 'Agents',
    description: 'Specialized subagents for different tasks (Claude Code and Cursor)',
    category: 'agents',
    defaultMode: 'link',
    files: [
      { src: 'claude/agents/git-master.md', dest: '~/.claude/agents/git-master.md', name: 'Claude git-master', environments: ['claude'] },
      { src: 'claude/agents/code-reviewer.md', dest: '~/.claude/agents/code-reviewer.md', name: 'Claude code-reviewer', environments: ['claude'] },
      { src: 'claude/agents/testing-wizard.md', dest: '~/.claude/agents/testing-wizard.md', name: 'Claude testing-wizard', environments: ['claude'] },
      { src: 'claude/agents/documentation-scholar.md', dest: '~/.claude/agents/documentation-scholar.md', name: 'Claude documentation-scholar', environments: ['claude'] },
      { src: 'claude/agents/api-planner.md', dest: '~/.claude/agents/api-planner.md', name: 'Claude api-planner', environments: ['claude'] },
      { src: 'claude/agents/senior-interviewer.md', dest: '~/.claude/agents/senior-interviewer.md', name: 'Claude senior-interviewer', environments: ['claude'] },
      { src: 'claude/agents/git-master.md', dest: '~/.cursor/agents/git-master.md', name: 'Cursor git-master', environments: ['cursor'] },
      { src: 'claude/agents/code-reviewer.md', dest: '~/.cursor/agents/code-reviewer.md', name: 'Cursor code-reviewer', environments: ['cursor'] },
      { src: 'claude/agents/testing-wizard.md', dest: '~/.cursor/agents/testing-wizard.md', name: 'Cursor testing-wizard', environments: ['cursor'] },
      { src: 'claude/agents/documentation-scholar.md', dest: '~/.cursor/agents/documentation-scholar.md', name: 'Cursor documentation-scholar', environments: ['cursor'] },
      { src: 'claude/agents/api-planner.md', dest: '~/.cursor/agents/api-planner.md', name: 'Cursor api-planner', environments: ['cursor'] },
      { src: 'claude/agents/senior-interviewer.md', dest: '~/.cursor/agents/senior-interviewer.md', name: 'Cursor senior-interviewer', environments: ['cursor'] },
    ]
  },
  skills: {
    name: 'Skills',
    description: 'Custom slash command skills shared across Claude Code, Codex, and Cursor. Each entry symlinks the whole skill directory so files added later appear automatically.',
    category: 'skills',
    defaultMode: 'link',
    files: [
      ...skillFilesForEnvironment('claude', '~/.claude/skills'),
      ...skillFilesForEnvironment('codex', '~/.codex/skills'),
      ...skillFilesForEnvironment('cursor', '~/.cursor/skills'),
    ]
  },
  plugins: {
    name: 'Plugins Reference',
    description: 'Plugin list for manual installation reference',
    category: 'plugins',
    defaultMode: 'copy',
    files: [
      { src: 'claude/plugins/installed_plugins.json', dest: '~/.claude/plugins/installed_plugins.json', name: 'plugins.json', environments: ['claude'] },
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

function fileMatchesEnvironments(file, selectedEnvironments) {
  if (!file.environments) return true;
  return file.environments.some(environment => selectedEnvironments.includes(environment));
}

// Get all files for given package names
export function getFilesForPackages(packageNames, selectedEnvironments = Object.keys(aiEnvironments)) {
  const files = [];
  for (const pkgName of packageNames) {
    const pkg = packages[pkgName];
    if (pkg) {
      for (const file of pkg.files) {
        if (!fileMatchesEnvironments(file, selectedEnvironments)) continue;
        files.push({ ...file, mode: resolveMode(file, pkg) });
      }
    }
  }
  return files;
}

// Get all items for manual selection
export function getAllItems(selectedEnvironments = Object.keys(aiEnvironments)) {
  const items = [];
  for (const [pkgName, pkg] of Object.entries(packages)) {
    for (const file of pkg.files) {
      if (!fileMatchesEnvironments(file, selectedEnvironments)) continue;
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
