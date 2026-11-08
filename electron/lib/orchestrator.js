'use strict';

const games = require('./games');
const settings = require('./settings');
const gate = require('./gate');
const autoprofile = require('./autoprofile');
const suspend = require('../modules/suspend');
const resolution = require('../modules/resolution');
const timer = require('../modules/timer');
const profiles = require('../modules/profiles');

let broadcast = () => {};
let applied = false;
let queued = false;
let shuttingDown = false;
let autoActive = false;

function init(options = {}) {
  if (typeof options.send === 'function') broadcast = options.send;
  games.on('change', handleChange);
}

function syncWatcher() {
  if (shuttingDown) return;
  const auto = settings.get().autoProfile;
  if (suspend.isEnabled() || resolution.isEnabled() || auto.enabled) games.start();
  else games.stop();
}

async function applyAutoProfile() {
  if (shuttingDown) return null;
  const auto = settings.get().autoProfile;
  if (!auto.enabled || autoActive) return null;
  if (!(await gate.isPro())) return null;

  const presetId = autoprofile.resolvePreset(auto, games.getRunning());
  if (!presetId) return null;

  try {
    const result = await profiles.apply(presetId, { source: 'auto' });
    if (result?.skipped) {
      autoActive = false;
      return result;
    }
    if (result?.alreadyActive) {
      autoActive = result.source === 'auto';
      return result;
    }
    autoActive = true;
    broadcast({
      type: 'profile-auto',
      action: 'applied',
      presetId,
      name: result?.activeProfile?.name || presetId
    });
    return result;
  } catch (error) {
    autoActive = false;
    broadcast({ type: 'profile-auto', action: 'error', presetId, message: error.message });
    return null;
  }
}

async function revertAutoProfile() {
  if (!autoActive) return null;
  autoActive = false;
  try {
    const result = await profiles.revert({ source: 'auto' });
    if (result?.skipped) return result;
    broadcast({ type: 'profile-auto', action: 'reverted', name: result?.activeProfile?.name || null });
    return result;
  } catch (error) {
    broadcast({ type: 'profile-auto', action: 'error', message: error.message });
    return null;
  }
}

async function refreshSettings() {
  const auto = settings.get().autoProfile;
  if (!auto.enabled && autoActive) await revertAutoProfile();
  syncWatcher();
}

async function recover() {
  if (shuttingDown) return;
  await suspend.recover().catch(() => ({}));
  await resolution.recover().catch(() => ({}));
  syncWatcher();
}

async function applyState(labels = {}) {
  if (shuttingDown) return;
  if (applied) {
    queued = true;
    return;
  }

  applied = true;
  try {
    const running = games.getRunning();
    if (running.length) {
      await suspend.onGameStart(labels.startedLabels?.[0] || running[0]).catch(() => ({}));
      await resolution.onGameStart().catch(() => ({}));
      await applyAutoProfile().catch(() => ({}));
    } else {
      await suspend.onGameStop().catch(() => ({}));
      await resolution.onGameStop().catch(() => ({}));
      await revertAutoProfile().catch(() => ({}));
    }
    broadcast({ type: 'state', running, suspend: suspend.status(games) });
  } finally {
    applied = false;
    if (queued) {
      queued = false;
      setImmediate(() => applyState());
    }
  }
}

function handleChange(event) {
  const running = event.running || [];
  const startedLabels = event.startedLabels || [];
  const stoppedLabels = event.stoppedLabels || [];

  if (startedLabels.length) {
    broadcast({ type: 'game-start', game: startedLabels.join(', '), running });
  }
  if (!running.length && stoppedLabels.length) {
    broadcast({ type: 'game-stop', game: stoppedLabels.join(', '), running });
  }

  applyState({ startedLabels });
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  games.stop();
  if (autoActive) {
    autoActive = false;
    await profiles.revert({ source: 'auto' }).catch(() => ({}));
  }
  await Promise.allSettled([suspend.resumeAll(), resolution.recover(), timer.shutdown()]);
}

module.exports = { init, recover, syncWatcher, refreshSettings, shutdown };
