'use strict';

const crypto = require('node:crypto');

const KEY_LENGTH = 16;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/;

function rawKey(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeKey(input) {
  const raw = rawKey(input);
  if (raw.length !== KEY_LENGTH) return '';
  return raw.match(/.{4}/g).join('-');
}

function isValidFormat(input) {
  const normalized = normalizeKey(input);
  return Boolean(normalized && KEY_PATTERN.test(normalized));
}

function hashKey(input) {
  const normalized = normalizeKey(input) || rawKey(input);
  return crypto.createHash('sha256').update(`omertafps:v1:${normalized}`).digest('hex');
}

function maskKey(input) {
  const normalized = normalizeKey(input);
  if (!normalized) return '—';
  const parts = normalized.split('-');
  return `${parts[0]}-****-****-${parts[3]}`;
}

function formatInput(input) {
  const raw = rawKey(input).slice(0, KEY_LENGTH);
  const groups = raw.match(/.{1,4}/g) || [];
  return groups.join('-');
}

function bindingState(entry, registryHwid, hwid) {
  const bound = entry?.hwid || registryHwid || null;
  if (bound && bound !== hwid) return 'already-used';
  return 'ok';
}

module.exports = {
  ALPHABET,
  KEY_LENGTH,
  normalizeKey,
  isValidFormat,
  hashKey,
  maskKey,
  formatInput,
  bindingState
};
