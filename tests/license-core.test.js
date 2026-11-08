'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../electron/lib/license-core');

test('normalizeKey groups sixteen characters', () => {
  assert.equal(core.normalizeKey('abcd1234efgh5678'), 'ABCD-1234-EFGH-5678');
  assert.equal(core.normalizeKey('ABCD-1234-EFGH-5678'), 'ABCD-1234-EFGH-5678');
  assert.equal(core.normalizeKey('abc'), '');
});

test('format validation rejects wrong lengths', () => {
  assert.equal(core.isValidFormat('ABCD-1234-EFGH-5678'), true);
  assert.equal(core.isValidFormat('ABCD-1234-EFGH'), false);
  assert.equal(core.isValidFormat('ABCD-1234-EFGH-56789'), false);
});

test('hashKey is stable and versioned', () => {
  const first = core.hashKey('ABCD-1234-EFGH-5678');
  const second = core.hashKey('abcd1234efgh5678');
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{64}$/);
  assert.notEqual(first, core.hashKey('ABCD-1234-EFGH-5679'));
});

test('maskKey only exposes first and last group', () => {
  assert.equal(core.maskKey('ABCD-1234-EFGH-5678'), 'ABCD-****-****-5678');
  assert.equal(core.maskKey(''), '—');
});

test('formatInput keeps partial groups while typing', () => {
  assert.equal(core.formatInput('abcd12'), 'ABCD-12');
  assert.equal(core.formatInput('abcd1234efgh5678extra'), 'ABCD-1234-EFGH-5678');
});

test('bindingState locks a key to its first machine', () => {
  assert.equal(core.bindingState({ hwid: null }, null, 'HW-A'), 'ok');
  assert.equal(core.bindingState({ hwid: 'HW-A' }, null, 'HW-A'), 'ok');
  assert.equal(core.bindingState({ hwid: 'HW-A' }, 'HW-A', 'HW-A'), 'ok');
  assert.equal(core.bindingState({ hwid: 'HW-A' }, null, 'HW-B'), 'already-used');
  assert.equal(core.bindingState({ hwid: null }, 'HW-A', 'HW-B'), 'already-used');
  assert.equal(core.bindingState({ hwid: 'HW-A' }, 'HW-B', 'HW-B'), 'already-used');
});
