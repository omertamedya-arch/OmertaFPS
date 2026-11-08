'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const autoprofile = require('../electron/lib/autoprofile');

test('disabled automation resolves nothing', () => {
  assert.equal(autoprofile.resolvePreset({ enabled: false, presetId: 'fps' }, ['cs2']), null);
  assert.equal(autoprofile.describe({ enabled: false, presetId: 'fps' }), null);
});

test('fixed preset wins over detection', () => {
  assert.equal(autoprofile.resolvePreset({ enabled: true, presetId: 'story' }, ['cs2']), 'story');
});

test('auto mode maps supported games', () => {
  const auto = { enabled: true, presetId: 'auto' };
  assert.equal(autoprofile.resolvePreset(auto, ['cs2']), 'fps');
  assert.equal(autoprofile.resolvePreset(auto, ['FiveM']), 'fivem');
  assert.equal(autoprofile.resolvePreset(auto, ['GTA5']), 'story');
});

test('auto mode ignores unknown games', () => {
  assert.equal(autoprofile.resolvePreset({ enabled: true, presetId: 'auto' }, ['notepad']), null);
});
