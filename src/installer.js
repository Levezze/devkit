import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';

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
    console.log(chalk.green("Done! Run 'claude' to start using your settings."));
  }

  return results;
}

// Mirror skill directories into ~/.codex/skills/<name> as symlinks.
// No-ops silently if Codex isn't installed (~/.codex/skills missing).
// Only acts on entries whose dest is under ~/.claude/skills/ — these are the
// canonical skill directories. Always runs after installFiles when skills are
// included; the codex side never goes stale relative to the claude side.
export async function mirrorSkillsToCodex(files) {
  const codexSkillsDir = path.join(process.env.HOME, '.codex', 'skills');
  if (!fileExists(codexSkillsDir)) return { mirrored: 0, skipped: 0 };

  const skillEntries = files.filter(f =>
    f.mode === 'link' && f.dest.startsWith('~/.claude/skills/')
  );
  if (skillEntries.length === 0) return { mirrored: 0, skipped: 0 };

  console.log('');
  console.log(chalk.cyan('Mirroring skills to Codex...'));

  const result = { mirrored: 0, skipped: 0 };
  for (const file of skillEntries) {
    const srcPath = path.join(ROOT_DIR, file.src);
    const skillName = path.basename(file.dest);
    const codexPath = path.join(codexSkillsDir, skillName);

    if (isCorrectSymlink(codexPath, srcPath)) {
      result.skipped++;
      continue;
    }
    if (fileExists(codexPath)) fs.rmSync(codexPath, { recursive: true, force: true });
    try {
      fs.symlinkSync(srcPath, codexPath);
      console.log(chalk.green(`  ✓ Linked ${skillName} → Codex`));
      result.mirrored++;
    } catch (error) {
      console.log(chalk.red(`  ✗ Failed to mirror ${skillName}: ${error.message}`));
    }
  }
  if (result.mirrored === 0 && result.skipped > 0) {
    console.log(chalk.gray(`  ○ ${result.skipped} already current`));
  }
  return result;
}
