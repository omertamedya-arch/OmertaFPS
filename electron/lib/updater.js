'use strict';

const { app } = require('electron');

const STARTUP_DELAY = 6000;

function describeError(error) {
  const raw = String(error?.message || '');
  if (/50[234]|ETIMEDOUT|ENOTFOUND|ECONNRESET|ECONNREFUSED|net::/i.test(raw)) {
    return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip birkaç dakika sonra tekrar dene.';
  }
  return raw.slice(0, 240) || 'Güncelleme denetlenemedi.';
}

let updater = null;
let sendStatus = () => {};
let prepareInstall = async () => {};
let initialized = false;
let ready = false;
let checking = false;
let lastStatus = { state: 'idle', currentVersion: null };

function publish(patch) {
  if (lastStatus.state === 'ready' && patch.state === 'error') return;
  lastStatus = { ...lastStatus, ...patch };
  try {
    sendStatus(lastStatus);
  } catch {
    /* the window can disappear between an event and its forward */
  }
}

function loadUpdater() {
  if (!updater) {
    ({ autoUpdater: updater } = require('electron-updater'));
    updater.logger = console;
  }
  return updater;
}

function bindEvents() {
  const instance = loadUpdater();

  instance.autoDownload = true;
  instance.autoInstallOnAppQuit = true;
  instance.allowPrerelease = false;

  instance.on('checking-for-update', () => publish({ state: 'checking' }));

  instance.on('update-available', (info) => {
    ready = false;
    publish({
      state: 'available',
      version: info?.version || null,
      releaseDate: info?.releaseDate || null,
      percent: 0,
      checkedAt: Date.now()
    });
  });

  instance.on('update-not-available', () => {
    ready = false;
    publish({ state: 'idle', version: null, percent: 0, checkedAt: Date.now() });
  });

  instance.on('download-progress', (progress) => {
    publish({
      state: 'downloading',
      percent: Math.round((progress?.percent || 0) * 10) / 10,
      transferred: progress?.transferred || 0,
      total: progress?.total || 0,
      bytesPerSecond: progress?.bytesPerSecond || 0
    });
  });

  instance.on('update-downloaded', (info) => {
    ready = true;
    publish({ state: 'ready', version: info?.version || lastStatus.version || null, percent: 100 });
  });

  instance.on('error', (error) => {
    ready = false;
    publish({
      state: 'error',
      message: describeError(error),
      checkedAt: Date.now()
    });
  });
}

function init(options = {}) {
  if (typeof options.send === 'function') sendStatus = options.send;
  if (typeof options.prepareInstall === 'function') prepareInstall = options.prepareInstall;
  if (initialized) return;
  initialized = true;

  lastStatus = {
    state: app.isPackaged ? 'idle' : 'disabled',
    currentVersion: app.getVersion()
  };

  if (!app.isPackaged) return;
  bindEvents();
}

function start() {
  if (!app.isPackaged) return;
  const timer = setTimeout(() => {
    check().catch(() => {});
  }, STARTUP_DELAY);
  if (typeof timer.unref === 'function') timer.unref();
}

async function check() {
  if (!app.isPackaged) {
    return { state: 'disabled', currentVersion: app.getVersion() };
  }
  if (checking || ready || ['available', 'downloading'].includes(lastStatus.state)) {
    return { ...lastStatus };
  }
  checking = true;
  publish({ state: 'checking' });
  try {
    await loadUpdater().checkForUpdates();
  } catch (error) {
    publish({
      state: 'error',
      message: describeError(error),
      checkedAt: Date.now()
    });
  } finally {
    checking = false;
  }
  return { ...lastStatus };
}

function install() {
  if (!app.isPackaged || !ready) return { installing: false };
  Promise.resolve()
    .then(() => prepareInstall())
    .catch(() => {})
    .then(() => {
      loadUpdater().quitAndInstall(false, true);
    });
  return { installing: true };
}

function status() {
  return { ...lastStatus };
}

module.exports = { init, start, check, install, status };
