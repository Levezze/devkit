#!/usr/bin/env bash
# Smoke test for the devkit installer.
#
# Verifies the filesystem contract documented in README.md:
# - Skill DIRECTORIES (not files) are symlinked into ~/.claude/skills/<name>
# - Skill DIRECTORIES are symlinked into ~/.codex/skills/<name> and ~/.cursor/skills/<name>
# - Cursor subagents are symlinked into ~/.cursor/agents/<name>.md
# - CLAUDE.md and AGENTS.md instruction files are symlinked
# - Files added to a skill directory in devkit appear in ~/.claude (no re-register)
# - mcp.json stays a real file (placeholder substitution preserved)
# - Re-running the installer is a silent no-op for already-correct symlinks
# - New skill directories are discovered automatically
# - Codex openai.yaml metadata is generated from SKILL.md frontmatter
# - x-devkit-model-tier: highest becomes a generated model-tier instruction
# - All SKILL.md files satisfy the frontmatter contract Codex depends on
#
# Run from devkit repo root: ./scripts/smoke.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SANDBOX="$(mktemp -d -t devkit-smoke.XXXXXX)"
trap 'rm -rf "$SANDBOX"' EXIT

fail() { echo "FAIL: $*" >&2; exit 1; }
pass() { echo "  PASS: $*"; }

echo "Sandbox: $SANDBOX"
echo

echo "[1/9] Validate SKILL.md frontmatter contract"
node -e "
const fs = require('fs');
const path = require('path');
function walk(d) { return fs.readdirSync(d, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(d,e.name)) : [path.join(d,e.name)]); }
const skillFiles = walk('$REPO_ROOT/skills').filter(f => /\/SKILL\.md\$/.test(f));
let bad = 0;
for (const f of skillFiles) {
  const c = fs.readFileSync(f, 'utf-8');
  if (!c.startsWith('---')) { console.error('NO_FRONTMATTER', f); bad++; continue; }
  // Reject unquoted scalar value containing ': ' (mapping ambiguity)
  const fm = c.split('---', 3)[1];
  for (const ln of fm.split('\n')) {
    const m = ln.match(/^([a-zA-Z_-]+):\s*(.+)\$/);
    if (!m) continue;
    const v = m[2].trim();
    if (v.startsWith('\"') || v.startsWith(\"'\")) continue;
    if (v.includes(': ')) { console.error('UNQUOTED_COLON', f, '|', m[1]); bad++; }
  }
}
process.exit(bad ? 1 : 0);
" || fail "frontmatter validation failed"
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  const result = m.syncSkillMetadata('$REPO_ROOT', { apply: false });
  if (result.errors.length > 0) {
    throw new Error('metadata errors: ' + JSON.stringify(result.errors));
  }
  if (result.updated.length > 0) {
    throw new Error('generated metadata is stale: ' + result.updated.join(', '));
  }
});
" || fail "frontmatter metadata contract failed"
pass "all SKILL.md frontmatter valid and generated metadata current"

echo
echo "[2/9] Verify skill discovery and generated Codex metadata"
AUTO_ROOT="$SANDBOX/auto-root"
mkdir -p "$AUTO_ROOT/skills/smoke-auto-skill"
cat > "$AUTO_ROOT/skills/smoke-auto-skill/SKILL.md" <<'EOF'
---
name: smoke-auto-skill
description: Smoke auto skill summary sentence. Extra trigger detail should not be part of the generated summary.
x-devkit-model-tier: highest
---

# Smoke Auto Skill
EOF
node -e "
const root = '$AUTO_ROOT';
const repo = '$REPO_ROOT';
import(repo + '/src/skill-sync.js').then(m => {
  const names = m.discoverSkillNames(root);
  if (!names.includes('smoke-auto-skill')) throw new Error('auto skill was not discovered');
  const dryRun = m.syncSkillMetadata(root, { apply: false });
  if (!dryRun.updated.includes('smoke-auto-skill')) throw new Error('dry run did not detect missing openai.yaml');
  const fs = require('fs');
  if (fs.existsSync(root + '/skills/smoke-auto-skill/agents/openai.yaml')) {
    throw new Error('dry run wrote openai.yaml');
  }
  const result = m.syncSkillMetadata(root, { apply: true });
  if (!result.updated.includes('smoke-auto-skill')) throw new Error('openai.yaml was not generated');
  const yaml = fs.readFileSync(root + '/skills/smoke-auto-skill/agents/openai.yaml', 'utf-8');
  if (!yaml.includes('short_description: \"Smoke auto skill summary sentence.\"')) {
    throw new Error('generated summary did not use first description sentence');
  }
  if (!yaml.includes('Use the highest available model and reasoning tier for this skill.')) {
    throw new Error('generated metadata did not include highest-tier instruction');
  }
});
" || fail "automatic skill metadata generation failed"
node -e "
import('$REPO_ROOT/src/packages.js').then(m => {
  const files = m.getFilesForPackages(['skills'], ['codex']);
  for (const skill of ['fix-pr-review', 'sync-skills']) {
    if (!files.some(file => file.src === 'skills/' + skill)) {
      throw new Error(skill + ' missing from discovered skill package');
    }
  }
});
" || fail "dynamic skill package discovery failed"
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  // pr-review and fix-pr-review must NOT pin a non-Opus model. Pinning Sonnet broke
  // every 1M-context session: Claude Code keeps the session's [1m] variant when it
  // switches model, and Sonnet+1M requires usage credits while Opus+1M is plan-covered.
  // These skills inherit the session model instead. See docs/adr/0001-no-model-pin-in-skill-frontmatter.md.
  for (const skill of ['pr-review', 'fix-pr-review']) {
    const metadata = m.readSkillMetadata('$REPO_ROOT', skill);
    if (metadata.modelTier) {
      throw new Error(skill + ' should NOT set x-devkit-model-tier (see ADR 0001)');
    }
    if (metadata.model && metadata.model !== 'opus' && !String(metadata.model).startsWith('claude-opus')) {
      throw new Error(skill + ' must not pin a non-Opus model — breaks 1M-context sessions (see ADR 0001)');
    }
  }
});
" || fail "review-skill model-pin policy violated"
SYNC_HOME="$SANDBOX/sync-home"
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  const result = m.syncInstalledSkillLinks({
    rootDir: '$AUTO_ROOT',
    homeDir: '$SYNC_HOME',
    apply: true,
    environments: ['codex'],
  });
  const fs = require('fs');
  if (!fs.lstatSync('$SYNC_HOME/.codex/skills/smoke-auto-skill').isSymbolicLink()) {
    throw new Error('codex skill symlink missing');
  }
  if (fs.existsSync('$SYNC_HOME/.claude') || fs.existsSync('$SYNC_HOME/.cursor')) {
    throw new Error('sync created unselected environment directories');
  }
  if (!result.fixed.some(item => item.environment === 'codex')) {
    throw new Error('sync did not report codex fix');
  }
});
" || fail "selected-environment sync failed"
IMPORT_ROOT="$SANDBOX/import-root"
IMPORT_HOME="$SANDBOX/import-home"
mkdir -p "$IMPORT_ROOT/skills" "$IMPORT_HOME/.claude/skills/imported-skill"
cat > "$IMPORT_HOME/.claude/skills/imported-skill/SKILL.md" <<'EOF'
---
name: imported-skill
description: Imported skill summary sentence. Extra details should not be part of the generated summary.
---

# Imported Skill
EOF
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  const fs = require('fs');
  const dryRun = m.syncAllSkills({
    rootDir: '$IMPORT_ROOT',
    homeDir: '$IMPORT_HOME',
    apply: false,
    environments: ['claude', 'codex'],
    forceImports: ['imported-skill'],
  });
  if (!dryRun.imports.imported.some(item => item.skill === 'imported-skill')) {
    throw new Error('dry run did not report forced import');
  }
  if (fs.existsSync('$IMPORT_ROOT/skills/imported-skill')) {
    throw new Error('dry run copied imported skill');
  }
  if (fs.lstatSync('$IMPORT_HOME/.claude/skills/imported-skill').isSymbolicLink()) {
    throw new Error('dry run replaced source dir with a symlink');
  }
  const result = m.syncAllSkills({
    rootDir: '$IMPORT_ROOT',
    homeDir: '$IMPORT_HOME',
    apply: true,
    environments: ['claude', 'codex'],
    forceImports: ['claude/imported-skill'],
  });
  if (!result.imports.imported.some(item => item.environment === 'claude' && item.skill === 'imported-skill')) {
    throw new Error('forced import did not report imported skill');
  }
  if (!fs.existsSync('$IMPORT_ROOT/skills/imported-skill/SKILL.md')) {
    throw new Error('forced import did not copy SKILL.md into devkit');
  }
  if (!fs.existsSync('$IMPORT_ROOT/skills/imported-skill/agents/openai.yaml')) {
    throw new Error('forced import did not generate Codex metadata');
  }
  if (!fs.lstatSync('$IMPORT_HOME/.claude/skills/imported-skill').isSymbolicLink()) {
    throw new Error('forced import did not replace source directory with symlink');
  }
  if (!fs.lstatSync('$IMPORT_HOME/.codex/skills/imported-skill').isSymbolicLink()) {
    throw new Error('forced import did not link imported skill into Codex');
  }
  // The point of import is no divergent copy: both env symlinks must resolve to the
  // devkit copy, not back to the original source. isSymbolicLink alone does not prove this.
  const expectedTarget = fs.realpathSync('$IMPORT_ROOT/skills/imported-skill');
  if (fs.realpathSync('$IMPORT_HOME/.claude/skills/imported-skill') !== expectedTarget) {
    throw new Error('claude symlink does not resolve to the devkit copy');
  }
  if (fs.realpathSync('$IMPORT_HOME/.codex/skills/imported-skill') !== expectedTarget) {
    throw new Error('codex symlink does not resolve to the devkit copy');
  }
});
" || fail "forced external skill import failed"
pass "new skills are discovered and Codex metadata is generated"

echo
echo "[3/9] Run installer against sandbox HOME"
HOME="$SANDBOX" node -e "
import('$REPO_ROOT/src/packages.js').then(async m => {
  const { installFiles } = await import('$REPO_ROOT/src/installer.js');
  const files = m.getFilesForPackages(['settings','agents','skills','plugins','shell'], ['claude','codex','cursor']);
  await installFiles(files);
});
" > /dev/null
pass "installer ran"

echo
echo "[4/9] Verify whole-directory skill symlinks"
for skill in tdd git-commit ddd handoff fix-pr-review sync-skills; do
  link="$SANDBOX/.claude/skills/$skill"
  [ -L "$link" ] || fail "$link is not a symlink (expected dir-symlink)"
  target="$(readlink "$link")"
  expected="$REPO_ROOT/skills/$skill"
  [ "$target" = "$expected" ] || fail "$link → $target (expected $expected)"
done
pass "skill directories symlinked correctly"

echo
echo "[5/9] Verify Codex and Cursor symlinks"
for skill in tdd ddd handoff fix-pr-review sync-skills; do
  link="$SANDBOX/.codex/skills/$skill"
  [ -L "$link" ] || fail "$link is not a symlink"
  target="$(readlink "$link")"
  expected="$REPO_ROOT/skills/$skill"
  [ "$target" = "$expected" ] || fail "Codex $link → $target (expected $expected)"

  link="$SANDBOX/.cursor/skills/$skill"
  [ -L "$link" ] || fail "$link is not a symlink"
  target="$(readlink "$link")"
  [ "$target" = "$expected" ] || fail "Cursor $link → $target (expected $expected)"
done

for agent in git-master code-reviewer testing-wizard; do
  link="$SANDBOX/.cursor/agents/$agent.md"
  [ -L "$link" ] || fail "$link is not a symlink"
  target="$(readlink "$link")"
  expected="$REPO_ROOT/claude/agents/$agent.md"
  [ "$target" = "$expected" ] || fail "Cursor $link → $target (expected $expected)"
done

for instructions in "$SANDBOX/CLAUDE.md" "$SANDBOX/.codex/AGENTS.md" "$SANDBOX/.cursor/AGENTS.md" "$SANDBOX/.cursor/CLAUDE.md"; do
  [ -L "$instructions" ] || fail "$instructions is not a symlink"
  target="$(readlink "$instructions")"
  expected="$REPO_ROOT/claude/CLAUDE.md"
  [ "$target" = "$expected" ] || fail "$instructions → $target (expected $expected)"
done
pass "Codex and Cursor symlinks created"

echo
echo "[6/9] Verify copy-mode files are real (mcp.json, settings.json)"
[ -f "$SANDBOX/.mcp.json" ] && [ ! -L "$SANDBOX/.mcp.json" ] || fail ".mcp.json should be a real file"
[ -f "$SANDBOX/.claude/settings.json" ] && [ ! -L "$SANDBOX/.claude/settings.json" ] || fail "settings.json should be a real file"
pass "copy-mode files preserved"

echo
echo "[7/9] Idempotent re-run"
HOME="$SANDBOX" node -e "
import('$REPO_ROOT/src/packages.js').then(async m => {
  const { installFiles } = await import('$REPO_ROOT/src/installer.js');
  const files = m.getFilesForPackages(['skills','agents'], ['claude','codex','cursor']);
  await installFiles(files);
});
" > "$SANDBOX/idempotent.log" 2>&1
grep -q "Linked" "$SANDBOX/idempotent.log" && fail "second run created new symlinks (not idempotent)"
pass "second run was a silent no-op"

echo
echo "[8/9] Ignore list excludes named external skills from bigGaps"
IGNORE_ROOT="$SANDBOX/ignore-root"
IGNORE_HOME="$SANDBOX/ignore-home"
mkdir -p "$IGNORE_ROOT/skills" \
  "$IGNORE_HOME/.claude/skills/external-keep" \
  "$IGNORE_HOME/.claude/skills/inline-keep" \
  "$IGNORE_HOME/.claude/skills/scoped-keep" \
  "$IGNORE_HOME/.claude/skills/external-flag"
cat > "$IGNORE_ROOT/sync-skills.ignore" <<'EOF'
# personal ignores — never committed
external-keep
inline-keep   # trailing comment should be stripped

# scoped form should also work
claude/scoped-keep
EOF
# A malformed ignore file must never tank sync: point readIgnoreList at a directory.
mkdir -p "$IGNORE_ROOT/bad-ignore-root/sync-skills.ignore"
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  const ignored = m.readIgnoreList('$IGNORE_ROOT');
  if (!ignored.includes('external-keep')) throw new Error('readIgnoreList dropped bare entry');
  if (!ignored.includes('inline-keep')) throw new Error('readIgnoreList did not strip trailing inline comment');
  if (!ignored.includes('claude/scoped-keep')) throw new Error('readIgnoreList dropped scoped entry');
  if (ignored.some(e => e.startsWith('#') || e === '' || e.includes('#'))) throw new Error('readIgnoreList kept a comment/blank line');
  const result = m.syncInstalledSkillLinks({
    rootDir: '$IGNORE_ROOT',
    homeDir: '$IGNORE_HOME',
    apply: false,
    environments: ['claude'],
    ignoredSkills: ignored,
  });
  const gaps = result.bigGaps.map(g => g.skill);
  if (gaps.includes('external-keep')) throw new Error('bare-name ignore did not suppress bigGap');
  if (gaps.includes('inline-keep')) throw new Error('inline-comment entry did not suppress bigGap');
  if (gaps.includes('scoped-keep')) throw new Error('scoped ignore did not suppress bigGap');
  if (!gaps.includes('external-flag')) throw new Error('non-ignored external skill should still be flagged');
  // End-to-end through syncAllSkills: locks the ...options spread-forwarding of ignoredSkills
  // (sibling force* params are explicitly reconstructed, so the spread is a fragile seam).
  const viaAll = m.syncAllSkills({
    rootDir: '$IGNORE_ROOT',
    homeDir: '$IGNORE_HOME',
    apply: false,
    environments: ['claude'],
    ignoredSkills: ignored,
  });
  const allGaps = viaAll.links.bigGaps.map(g => g.skill);
  if (allGaps.includes('external-keep') || allGaps.includes('scoped-keep')) {
    throw new Error('syncAllSkills did not forward ignoredSkills to syncInstalledSkillLinks');
  }
  if (!allGaps.includes('external-flag')) throw new Error('syncAllSkills dropped a non-ignored gap');
  // readIgnoreList must be a silent no-op when the file is absent...
  const none = m.readIgnoreList('$SANDBOX/does-not-exist');
  if (!Array.isArray(none) || none.length !== 0) throw new Error('readIgnoreList should return [] when file is absent');
  // ...and when the file is unreadable (here: a directory), not throw and tank the run.
  const bad = m.readIgnoreList('$IGNORE_ROOT/bad-ignore-root');
  if (!Array.isArray(bad) || bad.length !== 0) throw new Error('readIgnoreList should return [] on an unreadable file');
});
" || fail "ignore-list filtering failed"
pass "ignored external skills are suppressed; others still flagged"

echo
echo "[9/9] Replicate list fans externally-owned skills out to other envs"
REPL_ROOT="$SANDBOX/repl-root"
REPL_HOME="$SANDBOX/repl-home"
mkdir -p "$REPL_ROOT/skills" \
  "$REPL_HOME/.claude/skills/owned-skill" \
  "$REPL_HOME/.claude/skills/real-dir-skill" \
  "$REPL_HOME/.cursor/skills/real-dir-skill"
cat > "$REPL_HOME/.claude/skills/owned-skill/SKILL.md" <<'EOF'
---
name: owned-skill
description: Externally-owned skill summary sentence.
---

# Owned Skill
EOF
# real-dir-skill is owned (has a ~/.claude copy) AND already has a real (non-symlink)
# directory at its Cursor destination — that real dir must be reported, never clobbered.
cat > "$REPL_HOME/.claude/skills/real-dir-skill/SKILL.md" <<'EOF'
---
name: real-dir-skill
description: An externally-owned skill whose Cursor slot is a real user directory.
---

# Real Dir Skill (owner)
EOF
cat > "$REPL_HOME/.cursor/skills/real-dir-skill/SKILL.md" <<'EOF'
---
name: real-dir-skill
description: A pre-existing real directory the user controls.
---

# Real Dir Skill (cursor)
EOF
node -e "
import('$REPO_ROOT/src/skill-sync.js').then(m => {
  const fs = require('fs');
  // Dry run must not write any symlink.
  const dry = m.syncReplicatedSkills({
    rootDir: '$REPL_ROOT', homeDir: '$REPL_HOME', apply: false,
    environments: ['claude', 'codex', 'cursor'],
    replicateSkills: ['owned-skill', 'absent-skill'],
  });
  if (!dry.fixed.some(f => f.environment === 'codex' && f.skill === 'owned-skill')) {
    throw new Error('dry run did not report codex replicate for owned-skill');
  }
  if (fs.existsSync('$REPL_HOME/.codex/skills/owned-skill')) {
    throw new Error('dry run created a symlink');
  }
  if (!dry.current.some(c => c.skill === 'absent-skill')) {
    throw new Error('absent owner copy should be inert (reported current, not fixed)');
  }
  // Apply: symlink owned-skill into codex + cursor, pointed at the owner copy.
  const res = m.syncReplicatedSkills({
    rootDir: '$REPL_ROOT', homeDir: '$REPL_HOME', apply: true,
    environments: ['claude', 'codex', 'cursor'],
    replicateSkills: ['owned-skill', 'absent-skill', 'real-dir-skill'],
  });
  const ownerPath = fs.realpathSync('$REPL_HOME/.claude/skills/owned-skill');
  for (const env of ['.codex', '.cursor']) {
    const link = '$REPL_HOME/' + env + '/skills/owned-skill';
    if (!fs.lstatSync(link).isSymbolicLink()) throw new Error(env + ' owned-skill is not a symlink');
    if (fs.realpathSync(link) !== ownerPath) throw new Error(env + ' owned-skill does not resolve to the owner copy');
  }
  // Owner env (claude) must NOT get a self-link.
  if (fs.lstatSync('$REPL_HOME/.claude/skills/owned-skill').isSymbolicLink()) {
    throw new Error('replicate created a self-symlink in the owner env');
  }
  // The pre-existing real Cursor dir must be reported as a bigGap, not overwritten.
  if (!res.bigGaps.some(g => g.environment === 'cursor' && g.skill === 'real-dir-skill')) {
    throw new Error('real non-symlink dir was not reported as a bigGap');
  }
  if (fs.lstatSync('$REPL_HOME/.cursor/skills/real-dir-skill').isSymbolicLink()) {
    throw new Error('replicate clobbered a real user directory');
  }
  // Idempotent re-apply: everything current, nothing re-fixed.
  const again = m.syncReplicatedSkills({
    rootDir: '$REPL_ROOT', homeDir: '$REPL_HOME', apply: true,
    environments: ['claude', 'codex', 'cursor'],
    replicateSkills: ['owned-skill'],
  });
  if (again.fixed.length !== 0) throw new Error('second apply re-fixed an already-correct link');
  // End-to-end: syncAllSkills runs replicate AND suppresses the owned skill as a links bigGap.
  const all = m.syncAllSkills({
    rootDir: '$REPL_ROOT', homeDir: '$REPL_HOME', apply: false,
    environments: ['claude', 'codex', 'cursor'],
    replicateSkills: ['owned-skill'],
  });
  if (!all.replicate) throw new Error('syncAllSkills did not return a replicate result');
  if (all.links.bigGaps.some(g => g.skill === 'owned-skill')) {
    throw new Error('syncAllSkills did not ignore the replicated skill in link gaps');
  }
  // Empty replicate list is a complete no-op.
  const noop = m.syncReplicatedSkills({
    rootDir: '$REPL_ROOT', homeDir: '$REPL_HOME', apply: true,
    environments: ['claude', 'codex', 'cursor'], replicateSkills: [],
  });
  if (noop.fixed.length || noop.bigGaps.length || noop.current.length) {
    throw new Error('empty replicate list should be a complete no-op');
  }
  // readReplicateList is a silent no-op when the file is absent.
  const none = m.readReplicateList('$SANDBOX/does-not-exist');
  if (!Array.isArray(none) || none.length !== 0) throw new Error('readReplicateList should return [] when file is absent');
});
" || fail "replicate-list fan-out failed"
pass "externally-owned skills replicate out; real dirs preserved; empty list is a no-op"

echo
echo "All smoke checks passed."
