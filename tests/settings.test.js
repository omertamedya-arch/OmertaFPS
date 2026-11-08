'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omerta-settings-'));
process.env.OMERTA_DATA_DIR = dataDir;

const settings = require('../electron/lib/settings');

after(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('defaults are returned when nothing is stored', () => {
  const state = settings.get();
  assert.equal(state.startWithWindows, false);
  assert.equal(state.restorePointBeforeApply, true);
  assert.deepEqual(state.autoProfile, { enabled: false, presetId: 'auto' });
  assert.equal(state.overlay.fps.enabled, false);
  assert.equal(state.overlay.crosshair.enabled, false);
  assert.equal(state.overlay.crosshair.style, 'cross');
});

test('update merges nested auto profile without dropping other keys', () => {
  settings.update({ startWithWindows: true, autoProfile: { enabled: true } });
  const state = settings.get();
  assert.equal(state.startWithWindows, true);
  assert.equal(state.autoProfile.enabled, true);
  assert.equal(state.autoProfile.presetId, 'auto');
});

test('overlay values are clamped and nested patches merge', () => {
  settings.update({
    overlay: {
      fps: { enabled: true, fontSize: 99, opacity: 4, color: '#abcdef' },
      crosshair: { size: 999, thickness: 0, gap: -4, style: 'nope' }
    }
  });
  const overlay = settings.get().overlay;
  assert.equal(overlay.fps.enabled, true);
  assert.equal(overlay.fps.fontSize, 20);
  assert.equal(overlay.fps.opacity, 1);
  assert.equal(overlay.fps.color, '#ABCDEF');
  assert.equal(overlay.crosshair.size, 40);
  assert.equal(overlay.crosshair.thickness, 1);
  assert.equal(overlay.crosshair.gap, 0);
  assert.equal(overlay.crosshair.style, 'cross');
  settings.update({ overlay: { fps: { opacity: 0.5 } } });
  assert.equal(settings.get().overlay.fps.opacity, 0.5);
  assert.equal(settings.get().overlay.crosshair.size, 40);
});

test('unknown preset ids fall back to auto', () => {
  settings.update({ autoProfile: { presetId: 'nope' } });
  assert.equal(settings.get().autoProfile.presetId, 'auto');
});

test('non-boolean values are sanitized', () => {
  settings.update({ startWithWindows: 'yes', restorePointBeforeApply: 'no', autoProfile: { enabled: 1 } });
  const state = settings.get();
  assert.equal(state.startWithWindows, false);
  assert.equal(state.restorePointBeforeApply, true);
  assert.equal(state.autoProfile.enabled, false);
});

test('known preset ids are preserved', () => {
  settings.update({ autoProfile: { presetId: 'fivem' } });
  assert.equal(settings.get().autoProfile.presetId, 'fivem');
});
