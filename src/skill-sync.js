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

function selectedEnvironmentEntries(environments = Object.keys(ENVIRONMENTS)) {
  const selected = Array.isArray(environments) ? environments : String(environments).split(',');
  return selected
    .map(environment => String(environment).trim())
    .filter(environment => Object.hasOwn(ENVIRONMENTS, environment))
    .map(environment => [environment, ENVIRONMENTS[environment]]);
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

function validateSkillSelector(selector) {
  const parts = String(selector).split('/').map(part => part.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 2) {
    throw new Error(`invalid skill selector: ${selector}`);
  }

  const skillName = parts.at(-1);
  if (!isUserSkillName(skillName) || skillName.includes('/') || skillName.includes(path.sep)) {
    throw new Error(`invalid skill name: ${skillName}`);
  }

  if (parts.length === 2 && !Object.hasOwn(ENVIRONMENTS, parts[0])) {
    throw new Error(`unknown skill environment: ${parts[0]}`);
  }

  return {
    environment: parts.length === 2 ? parts[0] : null,
    skillName,
  };
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

export function syncSkillMetadata(rootDir = ROOT_DIR, { apply = false } = {}) {
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

      if (apply) {
        fs.mkdirSync(path.dirname(yamlPath), { recursive: true });
        fs.writeFileSync(yamlPath, expected, 'utf-8');
      }
      result.updated.push(skillName);
    } catch (error) {
      result.errors.push({ skill: skillName, message: error.message });
    }
  }

  return result;
}

// NOTE: call this via syncAllSkills, not standalone. With apply:true it copies the
// skill into devkit/skills but does NOT replace the source env dir with a symlink —
// that swap is done by syncInstalledSkillLinks using the forceRelinkTargets that
// syncAllSkills wires up from this function's result. Calling it on its own leaves a
// divergent real copy in both devkit and the source env.
export function importExternalSkills({
  rootDir = ROOT_DIR,
  homeDir = process.env.HOME,
  apply = false,
  environments = Object.keys(ENVIRONMENTS),
  forceImports = [],
} = {}) {
  const result = {
    imported: [],
    current: [],
    errors: [],
  };
  const repoSkills = new Set(discoverSkills(rootDir));
  const selectedEntries = selectedEnvironmentEntries(environments);

  for (const selector of forceImports) {
    let parsed;
    try {
      parsed = validateSkillSelector(selector);
    } catch (error) {
      result.errors.push({ skill: String(selector), message: error.message });
      continue;
    }

    const { environment: requestedEnvironment, skillName } = parsed;
    const destPath = path.join(rootDir, 'skills', skillName);
    if (repoSkills.has(skillName)) {
      result.current.push({ skill: skillName, reason: 'already present in devkit/skills' });
      continue;
    }

    const candidates = selectedEntries
      .filter(([environment]) => !requestedEnvironment || environment === requestedEnvironment)
      .map(([environment, parts]) => ({
        environment,
        path: path.join(homeDir, ...parts, skillName),
      }))
      .filter(candidate => exists(candidate.path));

    if (candidates.length === 0) {
      const scope = requestedEnvironment ? `${requestedEnvironment}/` : '';
      result.errors.push({
        skill: skillName,
        message: `${scope}${skillName} was not found in selected skill sources`,
      });
      continue;
    }

    if (candidates.length > 1) {
      result.errors.push({
        skill: skillName,
        message: `found multiple sources (${candidates.map(candidate => `${candidate.environment}/${skillName}`).join(', ')}); use environment/name`,
      });
      continue;
    }

    const [candidate] = candidates;
    if (!exists(path.join(candidate.path, 'SKILL.md'))) {
      result.errors.push({
        skill: skillName,
        message: `${candidate.environment}/${skillName} is missing SKILL.md`,
      });
      continue;
    }

    // Dedup duplicate selectors (e.g. ['foo', 'foo']) in both dry-run and apply so
    // the dry-run report matches what apply would actually do.
    repoSkills.add(skillName);

    if (apply) {
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(candidate.path, destPath, { recursive: true });
      } catch (error) {
        result.errors.push({
          skill: skillName,
          message: `failed to import from ${candidate.environment}: ${error.message}`,
        });
        continue;
      }
    }

    result.imported.push({
      environment: candidate.environment,
      skill: skillName,
      source: candidate.path,
      destination: destPath,
    });
  }

  return result;
}

export function syncInstalledSkillLinks({
  rootDir = ROOT_DIR,
  homeDir = process.env.HOME,
  apply = false,
  environments = Object.keys(ENVIRONMENTS),
  forceRelinkSkills = [],
  forceRelinkTargets = [],
  plannedRepoSkills = [],
} = {}) {
  const result = {
    fixed: [],
    current: [],
    bigGaps: [],
  };
  const repoSkills = new Set(discoverSkills(rootDir));
  for (const skillName of plannedRepoSkills) {
    repoSkills.add(skillName);
  }
  const forceRelinkSet = new Set(forceRelinkSkills);
  const forceRelinkTargetSet = new Set(forceRelinkTargets);

  for (const [environment, parts] of selectedEnvironmentEntries(environments)) {
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
          if (forceRelinkSet.has(skillName) || forceRelinkTargetSet.has(`${environment}/${skillName}`)) {
            if (apply) {
              // Move the real dir aside before symlinking instead of rm-then-symlink:
              // if symlinkSync throws after an rmSync the env would lose the directory
              // entirely (orphaned — devkit has the copy, the env has nothing). Renaming
              // aside lets us restore on failure so a partial relink never destroys data.
              const backupPath = `${destPath}.relink-bak`;
              try {
                fs.rmSync(backupPath, { recursive: true, force: true });
                fs.renameSync(destPath, backupPath);
                fs.symlinkSync(srcPath, destPath);
                fs.rmSync(backupPath, { recursive: true, force: true });
              } catch (error) {
                if (!exists(destPath) && exists(backupPath)) {
                  try {
                    fs.renameSync(backupPath, destPath);
                  } catch {
                    // leave the backup in place for manual recovery
                  }
                }
                result.bigGaps.push({
                  environment,
                  skill: skillName,
                  reason: `failed to force relink existing skill: ${error.message}`,
                });
                continue;
              }
            }
            result.fixed.push({
              environment,
              skill: skillName,
              reason: 'force relinked existing skill directory',
            });
            continue;
          }

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
  const imports = importExternalSkills(options);
  const importedSkillNames = imports.imported.map(item => item.skill);
  const metadata = syncSkillMetadata(options.rootDir, { apply: options.apply });
  const links = syncInstalledSkillLinks({
    ...options,
    plannedRepoSkills: importedSkillNames,
    forceRelinkSkills: [
      ...(options.forceRelinkSkills ?? []),
    ],
    forceRelinkTargets: [
      ...(options.forceRelinkTargets ?? []),
      ...imports.imported.map(item => `${item.environment}/${item.skill}`),
    ],
  });
  return { imports, metadata, links };
}
