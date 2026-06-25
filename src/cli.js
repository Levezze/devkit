import inquirer from 'inquirer';
import chalk from 'chalk';
import { aiEnvironments, packages, modes, getFilesForPackages, getAllItems } from './packages.js';
import { installFiles, applyOpus200kPreference, currentOpus200kPreference } from './installer.js';

// Print header
function printHeader() {
  console.log('');
  console.log(chalk.cyan('  ╭──────────────────────────────────────╮'));
  console.log(chalk.cyan('  │') + chalk.bold('   Devkit Installer                   ') + chalk.cyan('│'));
  console.log(chalk.cyan('  ╰──────────────────────────────────────╯'));
  console.log('');
}

function parseEnvironmentList(value) {
  if (!value) return null;
  const valid = new Set(Object.keys(aiEnvironments));
  const selected = value
    .split(',')
    .map(item => item.trim())
    .filter(item => valid.has(item));
  return selected.length > 0 ? selected : null;
}

async function selectScope() {
  if (process.env.DEVKIT_AI_ONLY === '1') return true;
  if (process.env.DEVKIT_AI_ONLY === '0') return false;

  const { aiOnly } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'aiOnly',
      message: 'Only install AI coding related config? (skips shell config)',
      default: true
    }
  ]);
  return aiOnly;
}

async function selectEnvironments() {
  const envFromShell = parseEnvironmentList(process.env.DEVKIT_AI_ENVS);
  if (envFromShell) return envFromShell;

  const { selectedEnvironments } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedEnvironments',
      message: 'Select AI coding environments to configure:',
      choices: Object.entries(aiEnvironments).map(([key, env]) => ({
        name: `${env.name} ${chalk.gray(`(${env.description})`)}`,
        value: key,
        checked: true
      })),
      validate: selected => selected.length > 0 || 'Select at least one environment'
    }
  ]);
  return selectedEnvironments;
}

function filterPackagesForScope(packageNames, aiOnly) {
  if (!aiOnly) return packageNames;
  return packageNames.filter(packageName => packageName !== 'shell');
}

function packagesForChoices(selectedEnvironments, aiOnly) {
  return Object.entries(packages)
    .map(([key, pkg]) => {
      const files = getFilesForPackages([key], selectedEnvironments);
      return [key, pkg, files.length];
    })
    .filter(([key, _pkg, fileCount]) => fileCount > 0 && (!aiOnly || key !== 'shell'));
}

// Select installation mode
async function selectMode() {
  const { mode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: 'Select installation mode:',
      choices: [
        {
          name: `${chalk.bold('Minimal')} ${chalk.gray('(core instructions + settings only)')}`,
          value: 'minimal'
        },
        {
          name: `${chalk.bold('Full')} ${chalk.gray('(everything)')}`,
          value: 'full'
        },
        {
          name: `${chalk.bold('Categories')} ${chalk.gray('(select packages)')}`,
          value: 'categories'
        },
        {
          name: `${chalk.bold('Manual')} ${chalk.gray('(select individual items)')}`,
          value: 'manual'
        }
      ]
    }
  ]);
  return mode;
}

// Select packages (categories mode)
async function selectPackages(selectedEnvironments, aiOnly) {
  const { selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Select packages to install:',
      choices: packagesForChoices(selectedEnvironments, aiOnly).map(([key, pkg, fileCount]) => ({
        name: `${pkg.name} ${chalk.gray(`(${fileCount} items)`)}`,
        value: key,
        checked: key === 'settings' // Settings checked by default
      }))
    }
  ]);
  return selectedPackages;
}

// Select individual items (manual mode)
async function selectItems(selectedEnvironments, aiOnly) {
  const allItems = getAllItems(selectedEnvironments)
    .filter(item => !aiOnly || item.package !== 'shell');

  // Group items by package for better UX
  const choices = [];
  let currentPackage = null;

  for (const item of allItems) {
    if (currentPackage !== item.package) {
      if (currentPackage !== null) {
        choices.push(new inquirer.Separator());
      }
      choices.push(new inquirer.Separator(chalk.cyan(`── ${item.packageName} ──`)));
      currentPackage = item.package;
    }
    choices.push({
      name: item.name,
      value: item,
      checked: item.package === 'settings' // Settings items checked by default
    });
  }

  const { selectedItems } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedItems',
      message: 'Select items to install:',
      choices,
      pageSize: 20
    }
  ]);

  return selectedItems;
}

// Opt-in (off by default): make Opus auto-compact at ~200k by setting
// "autoCompactWindow": 233000 in settings.json (keeps the 1M model so the window
// can reach it). Only offered when Claude's settings.json is part of the install.
async function selectOpus200k() {
  if (process.env.DEVKIT_OPUS_200K === '1') return true;
  if (process.env.DEVKIT_OPUS_200K === '0') return false;
  // Non-interactive (CI/headless/piped): never block on stdin — keep current state.
  if (!process.stdin.isTTY) return currentOpus200kPreference();

  const { autoCompact200k } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'autoCompact200k',
      message: 'Auto-compact Opus at ~200k tokens (sets autoCompactWindow=233000)?',
      default: currentOpus200kPreference()
    }
  ]);
  return autoCompact200k;
}

// Confirm installation
async function confirmInstall(fileCount) {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Install ${fileCount} file(s)?`,
      default: true
    }
  ]);
  return confirm;
}

// Main CLI function
export async function runCLI() {
  printHeader();

  try {
    const aiOnly = await selectScope();
    const selectedEnvironments = await selectEnvironments();
    const mode = await selectMode();
    let filesToInstall = [];

    switch (mode) {
      case 'minimal':
        filesToInstall = getFilesForPackages(modes.minimal.packages, selectedEnvironments);
        break;

      case 'full':
        filesToInstall = getFilesForPackages(
          filterPackagesForScope(modes.full.packages, aiOnly),
          selectedEnvironments
        );
        break;

      case 'categories': {
        const selectedPackages = await selectPackages(selectedEnvironments, aiOnly);
        if (selectedPackages.length === 0) {
          console.log(chalk.yellow('\nNo packages selected. Exiting.'));
          return;
        }
        filesToInstall = getFilesForPackages(
          filterPackagesForScope(selectedPackages, aiOnly),
          selectedEnvironments
        );
        break;
      }

      case 'manual': {
        const selectedItems = await selectItems(selectedEnvironments, aiOnly);
        if (selectedItems.length === 0) {
          console.log(chalk.yellow('\nNo items selected. Exiting.'));
          return;
        }
        filesToInstall = selectedItems;
        break;
      }
    }

    // Opus auto-compact-at-200k preference — only relevant when Claude settings.json is installed
    const claudeSettingsInstalled = filesToInstall.some(file => file.dest === '~/.claude/settings.json');
    const opus200k = claudeSettingsInstalled ? await selectOpus200k() : false;

    // Show summary
    console.log('');
    console.log(chalk.cyan(`Environments: ${selectedEnvironments.map(env => aiEnvironments[env].name).join(', ')}`));
    console.log(chalk.cyan(`Files to install: ${filesToInstall.length}`));

    // Confirm
    const confirmed = await confirmInstall(filesToInstall.length);
    if (!confirmed) {
      console.log(chalk.yellow('\nInstallation cancelled.'));
      return;
    }

    // Install
    await installFiles(filesToInstall);

    // Apply Opus auto-compact-at-200k preference after settings.json is in place (idempotent)
    if (claudeSettingsInstalled) {
      const result = applyOpus200kPreference(opus200k);
      if (result.changed) {
        console.log(chalk.green(opus200k
          ? '  ✓ Opus set to auto-compact at ~200k (autoCompactWindow=233000)'
          : '  ✓ Opus auto-compact override removed (back to default)'));
      } else if (opus200k && result.reason !== 'already') {
        console.log(chalk.yellow(`  ! Could not set auto-compact preference (${result.reason}); add "autoCompactWindow": 233000 to ~/.claude/settings.json by hand`));
      }
    }

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nInstallation cancelled.'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  }
}
