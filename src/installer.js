import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { syncSkillMetadata } from './skill-sync.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Registry of known API keys: placeholder -> { label, url }
const API_KEYS = {
  CONTEXT7_API_KEY: {
    label: 'Context7 API key',
    url: 'https://context7.com/dashboard',
  },
};

// settings.json key that makes Opus auto-compact at ~200k. Claude Code triggers
// auto-compact at (window - 33000), where window = min(modelMax, autoCompactWindow).
// 233000 - 33000 = 200000. This needs the 1M model (modelMax = 1,000,000) so the
// window can actually reach 233000 — hence we must NOT also disable the 1M context.
// See README "Auto-compact at 200k".
export const AUTO_COMPACT_WINDOW_KEY = 'autoCompactWindow';
export const AUTO_COMPACT_WINDOW_VALUE = 233000;

// Legacy env flag from older devkit versions. It forced the 200k Opus variant
// (modelMax = 200000), which caps the auto-compact trigger at ~167k — the
// opposite of what we want now. The toggle removes it on enable (migration).
export const DISABLE_1M_KEY = 'CLAUDE_CODE_DISABLE_1M_CONTEXT';

// Pure toggle: returns { settings, changed }. enabled=true sets autoCompactWindow
// to our sentinel AND strips any stale DISABLE_1M env flag; enabled=false removes
// the key only when it still equals our sentinel (never clobbers a user's own
// custom window). Never mutates the input.
export function withAutoCompact200kPreference(settings, enabled) {
  if (enabled) {
    const hasKey = settings[AUTO_COMPACT_WINDOW_KEY] === AUTO_COMPACT_WINDOW_VALUE;
    const env = { ...(settings.env ?? {}) };
    const hadStaleFlag = env[DISABLE_1M_KEY] !== undefined;
    if (hadStaleFlag) delete env[DISABLE_1M_KEY];

    if (hasKey && !hadStaleFlag) return { settings, changed: false };

    const next = { ...settings, [AUTO_COMPACT_WINDOW_KEY]: AUTO_COMPACT_WINDOW_VALUE };
    if (settings.env !== undefined) {
      if (Object.keys(env).length) next.env = env;
      else delete next.env;
    }
    return { settings: next, changed: true };
  }

  // disable: only remove our own sentinel value
  if (settings[AUTO_COMPACT_WINDOW_KEY] === AUTO_COMPACT_WINDOW_VALUE) {
    const next = { ...settings };
    delete next[AUTO_COMPACT_WINDOW_KEY];
    return { settings: next, changed: true };
  }
  return { settings, changed: false };
}

// Read the current preference from the installed settings.json (used to default
// the installer prompt so a re-run never silently strips an existing override).
export function currentOpus200kPreference() {
  const settingsPath = expandPath('~/.claude/settings.json');
  if (!fileExists(settingsPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    return parsed[AUTO_COMPACT_WINDOW_KEY] === AUTO_COMPACT_WINDOW_VALUE;
  } catch {
    return false;
  }
}

// IO wrapper: patch the installed ~/.claude/settings.json in place. Idempotent —
// a no-op when the file is already in the desired state (so answering "no" on a
// fresh install never reformats the freshly-copied template).
export function applyOpus200kPreference(enabled) {
  const settingsPath = expandPath('~/.claude/settings.json');
  if (!fileExists(settingsPath)) return { changed: false, reason: 'no-settings' };

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
  } catch (error) {
    return { changed: false, reason: 'parse-error', error: error.message };
  }

  const { settings, changed } = withAutoCompact200kPreference(parsed, enabled);
  if (changed) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  }
  return { changed, reason: changed ? 'written' : 'already' };
}

// Load .env file into a key-value map
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  const vars = {};
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  } catch {
    // .env is optional
  }
  return vars;
}

// Save resolved vars back to .env for future runs
function saveEnv(vars) {
  const envPath = path.join(ROOT_DIR, '.env');
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
}

// Scan source files for __PLACEHOLDER__ tokens, return unique keys
function findPlaceholders(files) {
  const keys = new Set();
  for (const file of files) {
    const srcPath = path.join(ROOT_DIR, file.src);
    try {
      const content = fs.readFileSync(srcPath, 'utf-8');
      for (const match of content.matchAll(/__([A-Z0-9_]+)__/g)) {
        keys.add(match[1]);
      }
    } catch { /* skip missing files */ }
  }
  return keys;
}

// Prompt user for any missing API keys before installation
async function resolveApiKeys(files) {
  const envVars = loadEnv();
  const needed = findPlaceholders(files);
  let changed = false;

  for (const key of needed) {
    if (envVars[key]) continue;

    const info = API_KEYS[key];
    const label = info?.label ?? key;

    console.log('');
    if (info?.url) {
      console.log(chalk.cyan(`  ${label}`));
      console.log(chalk.gray(`  Get one at: ${info.url}`));
    }

    const { value } = await inquirer.prompt([{
      type: 'input',
      name: 'value',
      message: `Enter your ${label} (or press Enter to skip):`,
    }]);

    if (value.trim()) {
      envVars[key] = value.trim();
      changed = true;
    }
  }

  if (changed) {
    saveEnv(envVars);
    console.log(chalk.gray('  Saved to .env for future runs'));
  }

  return envVars;
}

// Substitute __PLACEHOLDER__ tokens in file content
function substituteEnvVars(content, envVars) {
  return content.replace(/__([A-Z0-9_]+)__/g, (match, key) => {
    return envVars[key] ?? match;
  });
}

// Expand ~ to home directory
function expandPath(filePath) {
  if (filePath.startsWith('~')) {
    return path.join(process.env.HOME, filePath.slice(1));
  }
  return filePath;
}

// Overwrite strategy state
let overwriteStrategy = null; // null, 'all', 'none'

// Check if file exists (lstat — does not follow symlinks)
function fileExists(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

// Returns true if destPath is already a symlink resolving to expectedTarget.
// linkFile always passes an absolute srcPath to symlinkSync, so readlink returns
// an absolute path; path.resolve(dir, absolute) returns absolute unchanged.
// The dir prefix is harmless and keeps the comparison correct if a future change
// switches to relative symlinks.
function isCorrectSymlink(destPath, expectedTarget) {
  try {
    const stat = fs.lstatSync(destPath);
    if (!stat.isSymbolicLink()) return false;
    const actual = fs.readlinkSync(destPath);
    return path.resolve(path.dirname(destPath), actual) === path.resolve(expectedTarget);
  } catch {
    return false;
  }
}

// Prompt for overwrite handling
async function handleExistingFile(destPath, fileName) {
  // If we have a global strategy, use it
  if (overwriteStrategy === 'all') return true;
  if (overwriteStrategy === 'none') return false;

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: chalk.yellow(`${destPath} already exists. How to handle?`),
      choices: [
        { name: 'Overwrite this file', value: 'overwrite' },
        { name: 'Skip this file', value: 'skip' },
        { name: 'Overwrite all remaining', value: 'overwrite-all' },
        { name: 'Skip all remaining', value: 'skip-all' }
      ]
    }
  ]);

  switch (action) {
    case 'overwrite':
      return true;
    case 'skip':
      return false;
    case 'overwrite-all':
      overwriteStrategy = 'all';
      return true;
    case 'skip-all':
      overwriteStrategy = 'none';
      return false;
  }
}

// Ensure directory exists
function ensureDir(dirPath) {
  if (!fileExists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy a single file, substituting env vars
async function copyFile(file, envVars) {
  const srcPath = path.join(ROOT_DIR, file.src);
  const destPath = expandPath(file.dest);
  const destDir = path.dirname(destPath);

  // Check if source exists
  if (!fileExists(srcPath)) {
    console.log(chalk.red(`  ✗ Source not found: ${file.src}`));
    return { success: false, skipped: false, file };
  }

  // Check if destination exists
  if (fileExists(destPath)) {
    const shouldOverwrite = await handleExistingFile(destPath, file.name);
    if (!shouldOverwrite) {
      console.log(chalk.gray(`  ○ Skipped ${file.name}`));
      return { success: true, skipped: true, file };
    }
    // Remove existing dest (could be file or symlink) before writing
    fs.rmSync(destPath, { force: true });
  }

  // Ensure destination directory exists
  ensureDir(destDir);

  // Copy the file, substituting env vars in text files
  try {
    const content = fs.readFileSync(srcPath, 'utf-8');
    const processed = substituteEnvVars(content, envVars);
    fs.writeFileSync(destPath, processed, 'utf-8');
    console.log(chalk.green(`  ✓ Copied ${file.name}`));
    return { success: true, skipped: false, file };
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to copy ${file.name}: ${error.message}`));
    return { success: false, skipped: false, file };
  }
}

// Symlink a single file/dir from devkit into the destination
async function linkFile(file) {
  const srcPath = path.join(ROOT_DIR, file.src);
  const destPath = expandPath(file.dest);
  const destDir = path.dirname(destPath);

  if (!fileExists(srcPath)) {
    console.log(chalk.red(`  ✗ Source not found: ${file.src}`));
    return { success: false, skipped: false, file };
  }

  // Already a correct symlink → silent no-op
  if (isCorrectSymlink(destPath, srcPath)) {
    return { success: true, skipped: true, file };
  }

  if (fileExists(destPath)) {
    const shouldOverwrite = await handleExistingFile(destPath, file.name);
    if (!shouldOverwrite) {
      console.log(chalk.gray(`  ○ Skipped ${file.name}`));
      return { success: true, skipped: true, file };
    }
    fs.rmSync(destPath, { recursive: true, force: true });
  }

  ensureDir(destDir);

  try {
    fs.symlinkSync(srcPath, destPath);
    console.log(chalk.green(`  ✓ Linked ${file.name}`));
    return { success: true, skipped: false, file };
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to link ${file.name}: ${error.message}`));
    return { success: false, skipped: false, file };
  }
}

// Install files
export async function installFiles(files) {
  // Reset overwrite strategy for each installation
  overwriteStrategy = null;

  if (files.some(file => file.src.startsWith('skills/'))) {
    const syncResult = syncSkillMetadata(ROOT_DIR, { apply: true });
    if (syncResult.updated.length > 0) {
      console.log(chalk.gray(`  Synced Codex metadata for ${syncResult.updated.length} skill(s)`));
    }
    for (const error of syncResult.errors) {
      console.log(chalk.red(`  ✗ Failed to sync ${error.skill} metadata: ${error.message}`));
    }
    if (syncResult.errors.length > 0) {
      throw new Error('Skill metadata sync failed. Fix the errors above before installing.');
    }
  }

  // Resolve API keys before copying
  const envVars = await resolveApiKeys(files);

  const results = {
    copied: 0,
    skipped: 0,
    failed: 0
  };

  console.log('');
  console.log(chalk.cyan('Installing...'));
  console.log('');

  for (const file of files) {
    const result = file.mode === 'link'
      ? await linkFile(file)
      : await copyFile(file, envVars);
    if (result.success) {
      if (result.skipped) {
        results.skipped++;
      } else {
        results.copied++;
      }
    } else {
      results.failed++;
    }
  }

  console.log('');
  console.log(chalk.cyan('─'.repeat(40)));
  console.log('');

  if (results.copied > 0) {
    console.log(chalk.green(`  ✓ ${results.copied} file(s) installed`));
  }
  if (results.skipped > 0) {
    console.log(chalk.gray(`  ○ ${results.skipped} file(s) skipped`));
  }
  if (results.failed > 0) {
    console.log(chalk.red(`  ✗ ${results.failed} file(s) failed`));
  }

  console.log('');

  if (results.copied > 0 || results.skipped > 0) {
    console.log(chalk.green('Done! Restart your AI coding tools to pick up the settings.'));
  }

  return results;
}
