import inquirer from 'inquirer';
import chalk from 'chalk';
import { packages, modes, getFilesForPackages, getAllItems } from './packages.js';
import { installFiles, mirrorSkillsToCodex } from './installer.js';

// Print header
function printHeader() {
  console.log('');
  console.log(chalk.cyan('  ╭──────────────────────────────────────╮'));
  console.log(chalk.cyan('  │') + chalk.bold('   Devkit Installer                   ') + chalk.cyan('│'));
  console.log(chalk.cyan('  ╰──────────────────────────────────────╯'));
  console.log('');
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
          name: `${chalk.bold('Minimal')} ${chalk.gray('(settings + permissions only)')}`,
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
async function selectPackages() {
  const { selectedPackages } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPackages',
      message: 'Select packages to install:',
      choices: Object.entries(packages).map(([key, pkg]) => ({
        name: `${pkg.name} ${chalk.gray(`(${pkg.files.length} items)`)}`,
        value: key,
        checked: key === 'settings' // Settings checked by default
      }))
    }
  ]);
  return selectedPackages;
}

// Select individual items (manual mode)
async function selectItems() {
  const allItems = getAllItems();

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
    const mode = await selectMode();
    let filesToInstall = [];

    switch (mode) {
      case 'minimal':
        filesToInstall = getFilesForPackages(modes.minimal.packages);
        break;

      case 'full':
        filesToInstall = getFilesForPackages(modes.full.packages);
        break;

      case 'categories': {
        const selectedPackages = await selectPackages();
        if (selectedPackages.length === 0) {
          console.log(chalk.yellow('\nNo packages selected. Exiting.'));
          return;
        }
        filesToInstall = getFilesForPackages(selectedPackages);
        break;
      }

      case 'manual': {
        const selectedItems = await selectItems();
        if (selectedItems.length === 0) {
          console.log(chalk.yellow('\nNo items selected. Exiting.'));
          return;
        }
        filesToInstall = selectedItems;
        break;
      }
    }

    // Show summary
    console.log('');
    console.log(chalk.cyan(`Files to install: ${filesToInstall.length}`));

    // Confirm
    const confirmed = await confirmInstall(filesToInstall.length);
    if (!confirmed) {
      console.log(chalk.yellow('\nInstallation cancelled.'));
      return;
    }

    // Install
    await installFiles(filesToInstall);

    // Mirror skill directories into Codex if installed
    await mirrorSkillsToCodex(filesToInstall);

  } catch (error) {
    if (error.name === 'ExitPromptError') {
      console.log(chalk.yellow('\nInstallation cancelled.'));
    } else {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  }
}
