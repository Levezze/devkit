#!/usr/bin/env bash
# Smoke test for the devkit installer.
#
# Verifies the filesystem contract documented in README.md:
# - Skill DIRECTORIES (not files) are symlinked into ~/.claude/skills/<name>
# - Codex skills mirror to ~/.codex/skills/<name> when ~/.codex exists
# - Files added to a skill directory in devkit appear in ~/.claude (no re-register)
# - mcp.json stays a real file (placeholder substitution preserved)
# - Re-running the installer is a silent no-op for already-correct symlinks
# - All SKILL.md files have valid YAML frontmatter (Codex strict-parses)
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

# Pretend Codex is installed so we exercise the mirror path
mkdir -p "$SANDBOX/.codex/skills"

echo "[1/6] Validate SKILL.md frontmatter is parseable YAML"
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
pass "all SKILL.md frontmatter valid"

echo
echo "[2/6] Run installer against sandbox HOME"
HOME="$SANDBOX" node -e "
import('$REPO_ROOT/src/packages.js').then(async m => {
  const { installFiles, mirrorSkillsToCodex } = await import('$REPO_ROOT/src/installer.js');
  const files = m.getFilesForPackages(['settings','agents','skills','plugins','shell']);
  await installFiles(files);
  await mirrorSkillsToCodex(files);
});
" > /dev/null
pass "installer ran"

echo
echo "[3/6] Verify whole-directory skill symlinks"
for skill in tdd git-commit ddd handoff; do
  link="$SANDBOX/.claude/skills/$skill"
  [ -L "$link" ] || fail "$link is not a symlink (expected dir-symlink)"
  target="$(readlink "$link")"
  expected="$REPO_ROOT/skills/$skill"
  [ "$target" = "$expected" ] || fail "$link → $target (expected $expected)"
done
pass "skill directories symlinked correctly"

echo
echo "[4/6] Verify Codex mirror"
for skill in tdd ddd handoff; do
  link="$SANDBOX/.codex/skills/$skill"
  [ -L "$link" ] || fail "$link is not a symlink"
  target="$(readlink "$link")"
  expected="$REPO_ROOT/skills/$skill"
  [ "$target" = "$expected" ] || fail "Codex $link → $target (expected $expected)"
done
pass "Codex mirror created"

echo
echo "[5/6] Verify copy-mode files are real (mcp.json, settings.json)"
[ -f "$SANDBOX/.mcp.json" ] && [ ! -L "$SANDBOX/.mcp.json" ] || fail ".mcp.json should be a real file"
[ -f "$SANDBOX/.claude/settings.json" ] && [ ! -L "$SANDBOX/.claude/settings.json" ] || fail "settings.json should be a real file"
pass "copy-mode files preserved"

echo
echo "[6/6] Idempotent re-run"
HOME="$SANDBOX" node -e "
import('$REPO_ROOT/src/packages.js').then(async m => {
  const { installFiles, mirrorSkillsToCodex } = await import('$REPO_ROOT/src/installer.js');
  const files = m.getFilesForPackages(['skills','agents']);
  await installFiles(files);
  await mirrorSkillsToCodex(files);
});
" > "$SANDBOX/idempotent.log" 2>&1
grep -q "Linked" "$SANDBOX/idempotent.log" && fail "second run created new symlinks (not idempotent)"
pass "second run was a silent no-op"

echo
echo "All smoke checks passed."
