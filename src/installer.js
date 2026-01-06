import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Expand ~ to home directory
function expandPath(filePath) {
  if (filePath.startsWith('~')) {
    return path.join(process.env.HOME, filePath.slice(1));
  }
  return filePath;
}

// Overwrite strategy state
let overwriteStrategy = null; // null, 'all', 'none'

// Check if file exists
function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
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

// Copy a single file
async function copyFile(file) {
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
  }

  // Ensure destination directory exists
  ensureDir(destDir);

  // Copy the file
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(chalk.green(`  ✓ Copied ${file.name}`));
    return { success: true, skipped: false, file };
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to copy ${file.name}: ${error.message}`));
    return { success: false, skipped: false, file };
  }
}

// Install files
export async function installFiles(files) {
  // Reset overwrite strategy for each installation
  overwriteStrategy = null;

  const results = {
    copied: 0,
    skipped: 0,
    failed: 0
  };

  console.log('');
  console.log(chalk.cyan('Installing...'));
  console.log('');

  for (const file of files) {
    const result = await copyFile(file);
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
