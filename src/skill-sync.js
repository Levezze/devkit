import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

const ENVIRONMENTS = {
  claude: ['.claude', 'skills'],
  codex: ['.codex', 'skills'],
  cursor: ['.cursor', 'skills'],
};

const YAML_HEADER = 'interface:\n';
const MODEL_TIERS = new Set(['highest']);
const MODEL_TIER_INSTRUCTIONS = {
  highest: 'Use the highest available model and reasoning tier for this skill.',
};

function exists(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function isUserSkillName(name) {
  return !name.startsWith('.');
}

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

function readSymlinkTarget(destPath) {
  try {
    const stat = fs.lstatSync(destPath);
    if (!stat.isSymbolicLink()) return null;
    return fs.readlinkSync(destPath);
  } catch {
    return null;
  }
}

function yamlString(value) {
  return JSON.stringify(value);
}

function titleCaseSkillName(name) {
  const acronyms = new Map([
    ['api', 'API'],
    ['ddd', 'DDD'],
    ['e2e', 'E2E'],
    ['mcp', 'MCP'],
    ['pr', 'PR'],
    ['prd', 'PRD'],
    ['tdd', 'TDD'],
    ['ui', 'UI'],
  ]);

  return name
    .split('-')
    .map(part => acronyms.get(part) ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function firstSentence(description) {
  const normalized = normalizeWhitespace(description);
  const match = normalized.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0].trim() : normalized;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    throw new Error('SKILL.md is missing YAML frontmatter');
  }

  const end = content.indexOf('\n---', 4);
  if (end === -1) {
    throw new Error('SKILL.md frontmatter is not closed');
  }

  const lines = content.slice(4, end).split('\n');
  const metadata = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const scalarMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!scalarMatch) continue;

    const [, key, rawValue] = scalarMatch;
    const trimmed = rawValue.trim();

    if (trimmed === '>' || trimmed === '>-' || trimmed === '|' || trimmed === '|-') {
      const blockLines = [];
      i++;
      while (i < lines.length && (lines[i].startsWith(' ') || lines[i] === '')) {
        blockLines.push(lines[i].replace(/^ {2}/, ''));
        i++;
      }
      i--;
      metadata[key] = normalizeWhitespace(blockLines.join(' '));
    } else {
      metadata[key] = parseScalar(trimmed);
    }
  }

  return metadata;
}

export function discoverSkills(rootDir = ROOT_DIR) {
  const skillsDir = path.join(rootDir, 'skills');
  if (!exists(skillsDir)) return [];

  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(isUserSkillName)
    .filter(name => exists(path.join(skillsDir, name, 'SKILL.md')))
    .sort((a, b) => a.localeCompare(b));
}

export function discoverSkillNames(rootDir = ROOT_DIR) {
  return discoverSkills(rootDir);
}

export function readSkillMetadata(rootDir, skillName) {
  const skillPath = path.join(rootDir, 'skills', skillName, 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');
  const metadata = parseFrontmatter(content);

  if (!metadata.name) {
    throw new Error(`${skillName}/SKILL.md is missing frontmatter name`);
  }
  if (!metadata.description) {
    throw new Error(`${skillName}/SKILL.md is missing frontmatter description`);
  }

  const modelTier = metadata['x-devkit-model-tier'];
  if (modelTier && !MODEL_TIERS.has(modelTier)) {
    throw new Error(`${skillName}/SKILL.md has unsupported x-devkit-model-tier: ${modelTier}`);
  }

  return {
    name: metadata.name,
    description: metadata.description,
    summary: firstSentence(metadata.description),
    modelTier,
    model: metadata.model,
    effort: metadata.effort,
  };
}

export function generatedOpenAiYaml(rootDir, skillName) {
  const metadata = readSkillMetadata(rootDir, skillName);
  const displayName = titleCaseSkillName(metadata.name);
  const modelTierInstruction = metadata.modelTier
    ? ` ${MODEL_TIER_INSTRUCTIONS[metadata.modelTier]}`
    : '';

  return [
    YAML_HEADER.trimEnd(),
    `  display_name: ${yamlString(displayName)}`,
    `  short_description: ${yamlString(metadata.summary)}`,
    `  default_prompt: ${yamlString(`Use the /${metadata.name} skill: ${metadata.summary}${modelTierInstruction}`)}`,
    '',
  ].join('\n');
}

export function syncSkillMetadata(rootDir = ROOT_DIR) {
  const result = { updated: [], current: [], errors: [] };

  for (const skillName of discoverSkills(rootDir)) {
    const yamlPath = path.join(rootDir, 'skills', skillName, 'agents', 'openai.yaml');
    try {
      const expected = generatedOpenAiYaml(rootDir, skillName);
      const current = exists(yamlPath) ? fs.readFileSync(yamlPath, 'utf-8') : null;

      if (current === expected) {
        result.current.push(skillName);
        continue;
      }

      fs.mkdirSync(path.dirname(yamlPath), { recursive: true });
      fs.writeFileSync(yamlPath, expected, 'utf-8');
      result.updated.push(skillName);
    } catch (error) {
      result.errors.push({ skill: skillName, message: error.message });
    }
  }

  return result;
}

export function syncInstalledSkillLinks({
  rootDir = ROOT_DIR,
  homeDir = process.env.HOME,
  apply = false,
} = {}) {
  const result = {
    fixed: [],
    current: [],
    bigGaps: [],
  };
  const repoSkills = new Set(discoverSkills(rootDir));

  for (const [environment, parts] of Object.entries(ENVIRONMENTS)) {
    const envSkillsDir = path.join(homeDir, ...parts);
    const installed = exists(envSkillsDir)
      ? fs.readdirSync(envSkillsDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory() || entry.isSymbolicLink())
        .map(entry => entry.name)
        .filter(isUserSkillName)
      : [];

    for (const skillName of repoSkills) {
      const srcPath = path.join(rootDir, 'skills', skillName);
      const destPath = path.join(envSkillsDir, skillName);

      if (isCorrectSymlink(destPath, srcPath)) {
        result.current.push({ environment, skill: skillName });
        continue;
      }

      if (exists(destPath)) {
        const target = readSymlinkTarget(destPath);
        if (target !== null) {
          if (apply) {
            try {
              fs.rmSync(destPath, { force: true });
              fs.symlinkSync(srcPath, destPath);
            } catch (error) {
              result.bigGaps.push({
                environment,
                skill: skillName,
                reason: `failed to relink stale symlink: ${error.message}`,
              });
              continue;
            }
          }
          result.fixed.push({ environment, skill: skillName, reason: 'relinked stale symlink' });
        } else {
          result.bigGaps.push({
            environment,
            skill: skillName,
            reason: `${destPath} exists but is not a symlink`,
          });
        }
        continue;
      }

      if (apply) {
        try {
          fs.mkdirSync(envSkillsDir, { recursive: true });
          fs.symlinkSync(srcPath, destPath);
        } catch (error) {
          result.bigGaps.push({
            environment,
            skill: skillName,
            reason: `failed to link missing skill: ${error.message}`,
          });
          continue;
        }
      }
      result.fixed.push({ environment, skill: skillName, reason: 'linked missing skill' });
    }

    for (const skillName of installed) {
      if (!repoSkills.has(skillName)) {
        result.bigGaps.push({
          environment,
          skill: skillName,
          reason: 'installed skill is not present in devkit/skills',
        });
      }
    }
  }

  return result;
}

export function syncAllSkills(options = {}) {
  const metadata = syncSkillMetadata(options.rootDir);
  const links = syncInstalledSkillLinks(options);
  return { metadata, links };
}
