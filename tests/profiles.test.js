'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const profiles = require('../electron/modules/profiles');

test('all shipped presets resolve', () => {
  for (const id of ['fps', 'fivem', 'moba', 'story', 'sim']) {
    const preset = profiles.getPreset(id);
    assert.ok(preset, `${id} profili bulunmalı`);
    assert.equal(preset.id, id);
    assert.ok(preset.apply && typeof preset.apply === 'object');
    assert.ok(Array.isArray(preset.effects) && preset.effects.length > 0);
  }
});

test('unknown presets return null', () => {
  assert.equal(profiles.getPreset('nope'), null);
  assert.equal(profiles.getPreset(''), null);
});

test('fivem preset documents the optional Defender path', () => {
  const preset = profiles.getPreset('fivem');
  assert.match(preset.note, /Defender/);
  assert.ok(preset.effects.some((effect) => /FiveM/.test(effect)));
});
