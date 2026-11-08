'use strict';

const license = require('./license');

let cache = { at: 0, licensed: false };

async function isPro({ fresh = false } = {}) {
  if (!fresh && Date.now() - cache.at < 1500) return cache.licensed;
  const status = await license.getStatus();
  cache = { at: Date.now(), licensed: Boolean(status.licensed) };
  return cache.licensed;
}

function invalidate() {
  cache = { at: 0, licensed: false };
}

function licenseRequired(moduleName) {
  const error = new Error('Bu işlem Omerta FPS Pro lisansı gerektiriyor.');
  error.code = 'license-required';
  error.module = moduleName;
  return error;
}

async function requirePro(moduleName) {
  if (await isPro()) return;
  throw licenseRequired(moduleName);
}

module.exports = { isPro, requirePro, invalidate, licenseRequired };
