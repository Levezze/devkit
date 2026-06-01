#!/usr/bin/env node
import { syncAllSkills, ROOT_DIR, readIgnoreList } from '../src/skill-sync.js';

const apply = process.argv.includes('--apply');
const envsArg = process.argv.find(arg => arg.startsWith('--envs='));
const forceImportArg = process.argv.find(arg => arg.startsWith('--force-import='));
const environments = (envsArg?.slice('--envs='.length) || process.env.DEVKIT_AI_ENVS || '')
  .split(',')
  .map(environment => environment.trim())
  .filter(Boolean);
const forceImports = (forceImportArg?.slice('--force-import='.length) || '')
  .split(',')
  .map(skill => skill.trim())
  .filter(Boolean);
const result = syncAllSkills({
  rootDir: ROOT_DIR,
  apply,
  environments: environments.length > 0 ? environments : undefined,
  forceImports,
  ignoredSkills: readIgnoreList(ROOT_DIR),
});

const importCount = result.imports.imported.length;
const metadataCount = result.metadata.updated.length;
const linkCount = result.links.fixed.length;
const gapCount = result.links.bigGaps.length + result.metadata.errors.length + result.imports.errors.length;

if (importCount > 0) {
  const verb = apply ? 'Imported' : 'Would import';
  console.log(`${verb} ${importCount} external skill(s):`);
  for (const item of result.imports.imported) {
    console.log(`- ${item.environment}/${item.skill} -> devkit/skills/${item.skill}`);
  }
}

if (result.imports.current.length > 0) {
  for (const item of result.imports.current) {
    console.log(`Import skipped for ${item.skill}: ${item.reason}.`);
  }
}

if (metadataCount > 0) {
  const verb = apply ? 'Updated' : 'Would update';
  console.log(`${verb} Codex metadata for ${metadataCount} skill(s): ${result.metadata.updated.join(', ')}`);
} else {
  console.log('Codex metadata is current.');
}

if (linkCount > 0) {
  const verb = apply ? 'Fixed' : 'Would fix';
  console.log(`${verb} ${linkCount} small skill link issue(s):`);
  for (const item of result.links.fixed) {
    console.log(`- ${item.environment}/${item.skill}: ${item.reason}`);
  }
} else {
  console.log('Skill symlinks are current.');
}

if (result.imports.errors.length > 0) {
  console.log('');
  console.log('Import errors:');
  for (const item of result.imports.errors) {
    console.log(`- ${item.skill}: ${item.message}`);
  }
}

if (result.metadata.errors.length > 0) {
  console.log('');
  console.log('Metadata errors:');
  for (const item of result.metadata.errors) {
    console.log(`- ${item.skill}: ${item.message}`);
  }
}

if (result.links.bigGaps.length > 0) {
  console.log('');
  console.log('Needs user decision:');
  for (const item of result.links.bigGaps) {
    console.log(`- ${item.environment}/${item.skill}: ${item.reason}`);
  }
}

process.exit(gapCount > 0 ? 2 : 0);
