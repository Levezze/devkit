// Unit test for the Opus "auto-compact at 200k" settings toggle.
// Run: node scripts/test-opus-200k.mjs
//
// The toggle sets the settings.json key "autoCompactWindow": 233000 so Claude
// Code auto-compacts at ~200k (trigger = window - 33000). It deliberately keeps
// the 1M model (so the window can reach 233000) and REMOVES any stale
// CLAUDE_CODE_DISABLE_1M_CONTEXT env flag left by older devkit versions — that
// flag would re-cap modelMax to 200000 and drop the trigger back to ~167k.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  withAutoCompact200kPreference,
  AUTO_COMPACT_WINDOW_KEY,
  AUTO_COMPACT_WINDOW_VALUE,
  DISABLE_1M_KEY,
  applyOpus200kPreference,
  currentOpus200kPreference,
} from '../src/installer.js';

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

test('enable on empty settings adds the autoCompactWindow key', () => {
  const { settings, changed } = withAutoCompact200kPreference({}, true);
  assert.equal(changed, true);
  assert.equal(settings[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
});

test('enable preserves existing keys', () => {
  const { settings, changed } = withAutoCompact200kPreference({ env: { FOO: 'bar' }, model: 'opusplan' }, true);
  assert.equal(changed, true);
  assert.equal(settings.env.FOO, 'bar');
  assert.equal(settings.model, 'opusplan');
  assert.equal(settings[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
});

test('enable is idempotent when key already at sentinel', () => {
  const before = { [AUTO_COMPACT_WINDOW_KEY]: AUTO_COMPACT_WINDOW_VALUE };
  const { changed } = withAutoCompact200kPreference(before, true);
  assert.equal(changed, false);
});

test('enable migrates: removes stale DISABLE_1M env flag', () => {
  const { settings, changed } = withAutoCompact200kPreference({ env: { [DISABLE_1M_KEY]: '1', FOO: 'bar' } }, true);
  assert.equal(changed, true);
  assert.equal(settings.env[DISABLE_1M_KEY], undefined);
  assert.equal(settings.env.FOO, 'bar');
  assert.equal(settings[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
});

test('enable drops empty env object when DISABLE_1M was its only key', () => {
  const { settings, changed } = withAutoCompact200kPreference({ env: { [DISABLE_1M_KEY]: '1' } }, true);
  assert.equal(changed, true);
  assert.equal('env' in settings, false);
  assert.equal(settings[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
});

test('disable removes the key when it is our sentinel', () => {
  const { settings, changed } = withAutoCompact200kPreference({ [AUTO_COMPACT_WINDOW_KEY]: AUTO_COMPACT_WINDOW_VALUE, model: 'opus' }, false);
  assert.equal(changed, true);
  assert.equal(AUTO_COMPACT_WINDOW_KEY in settings, false);
  assert.equal(settings.model, 'opus');
});

test('disable is a no-op when key absent', () => {
  const { changed } = withAutoCompact200kPreference({ model: 'opus' }, false);
  assert.equal(changed, false);
});

test('disable never clobbers a user-chosen custom window', () => {
  const before = { [AUTO_COMPACT_WINDOW_KEY]: 500000 };
  const { settings, changed } = withAutoCompact200kPreference(before, false);
  assert.equal(changed, false);
  assert.equal(settings[AUTO_COMPACT_WINDOW_KEY], 500000);
});

test('does not mutate the input object', () => {
  const input = { env: { FOO: 'bar' } };
  withAutoCompact200kPreference(input, true);
  assert.equal(input[AUTO_COMPACT_WINDOW_KEY], undefined);
});

// --- IO wrapper tests (use a temp HOME; expandPath reads process.env.HOME) ---
function withTempHome(fn) {
  const prev = process.env.HOME;
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'devkit-opus-'));
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  process.env.HOME = home;
  try {
    fn(path.join(home, '.claude', 'settings.json'));
  } finally {
    process.env.HOME = prev;
    fs.rmSync(home, { recursive: true, force: true });
  }
}

test('currentOpus200kPreference is false when settings file missing', () => {
  withTempHome(() => {
    assert.equal(currentOpus200kPreference(), false);
  });
});

test('apply enable writes key, preserves other keys, current reads it back', () => {
  withTempHome((p) => {
    fs.writeFileSync(p, JSON.stringify({ permissions: { defaultMode: 'auto' } }));
    const r = applyOpus200kPreference(true);
    assert.equal(r.changed, true);
    assert.equal(currentOpus200kPreference(), true);
    const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
    assert.equal(s.permissions.defaultMode, 'auto');
    assert.equal(s[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
  });
});

test('apply enable twice is idempotent', () => {
  withTempHome((p) => {
    fs.writeFileSync(p, JSON.stringify({}));
    applyOpus200kPreference(true);
    assert.equal(applyOpus200kPreference(true).changed, false);
  });
});

test('apply enable migrates an old DISABLE_1M install', () => {
  withTempHome((p) => {
    fs.writeFileSync(p, JSON.stringify({ env: { [DISABLE_1M_KEY]: '1' } }));
    assert.equal(applyOpus200kPreference(true).changed, true);
    const s = JSON.parse(fs.readFileSync(p, 'utf-8'));
    assert.equal('env' in s, false);
    assert.equal(s[AUTO_COMPACT_WINDOW_KEY], AUTO_COMPACT_WINDOW_VALUE);
    assert.equal(currentOpus200kPreference(), true);
  });
});

test('apply disable removes key and current reflects it', () => {
  withTempHome((p) => {
    fs.writeFileSync(p, JSON.stringify({ [AUTO_COMPACT_WINDOW_KEY]: AUTO_COMPACT_WINDOW_VALUE }));
    assert.equal(applyOpus200kPreference(false).changed, true);
    assert.equal(currentOpus200kPreference(), false);
  });
});

test('apply on missing settings reports no-settings', () => {
  withTempHome(() => {
    assert.equal(applyOpus200kPreference(true).reason, 'no-settings');
  });
});

test('apply on malformed JSON reports parse-error and does not throw', () => {
  withTempHome((p) => {
    fs.writeFileSync(p, '{ not valid json ');
    assert.equal(applyOpus200kPreference(true).reason, 'parse-error');
  });
});

console.log(`\n${passed} passed`);
