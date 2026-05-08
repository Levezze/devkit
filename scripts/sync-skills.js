#!/usr/bin/env node
import { syncAllSkills, ROOT_DIR } from '../src/skill-sync.js';

const apply = process.argv.includes('--apply');
const result = syncAllSkills({ rootDir: ROOT_DIR, apply });

const metadataCount = result.metadata.updated.length;
const linkCount = result.links.fixed.length;
const gapCount = result.links.bigGaps.length + result.metadata.errors.length;

if (metadataCount > 0) {
  console.log(`Updated Codex metadata for ${metadataCount} skill(s): ${result.metadata.updated.join(', ')}`);
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
