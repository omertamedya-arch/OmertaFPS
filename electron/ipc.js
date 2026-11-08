'use strict';

const os = require('node:os');
const { app, ipcMain, clipboard, BrowserWindow } = require('electron');
const { spawn } = require('node:child_process');

const activity = require('./lib/activity');
const license = require('./lib/license');
const system = require('./lib/system');
const store = require('./lib/store');
const settings = require('./lib/settings');
const restore = require('./lib/restore');
const services = require('./modules/services');
const maintenance = require('./modules/maintenance');
const nvidia = require('./modules/nvidia');
const amd = require('./modules/amd');
const profiles = require('./modules/profiles');
const scan = require('./modules/scan');
const network = require('./modules/network');
const timer = require('./modules/timer');
const fivem = require('./modules/fivem');
const suspend = require('./modules/suspend');
const resolution = require('./modules/resolution');
const nis = require('./modules/nis');
const games = require('./lib/games');
const orchestrator = require('./lib/orchestrator');
const overlay = require('./lib/overlay');
const updater = require('./lib/updater');
const hardware = require('./lib/hardware');
const gate = require('./lib/gate');
const { psQuote } = require('./lib/ps');

const THEME_CHROME = {
  dark: { color: '#05080C', symbolColor: '#8494A8', background: '#05080C' },
  light: { color: '#F6F8FB', symbolColor: '#475569', background: '#F6F8FB' },
  rosa: { color: '#FFF2F7', symbolColor: '#9D174D', background: '#FFF2F7' },
  saydam: { color: '#0C0E14', symbolColor: '#93C5FD', background: '#0C0E14', opacity: 0.9 },
  okyanus: { color: '#03141C', symbolColor: '#67E8F9', background: '#03141C' },
  gece: { color: '#0D0A1A', symbolColor: '#C4B5FD', background: '#0D0A1A' },
  kor: { color: '#160B08', symbolColor: '#FDBA74', background: '#160B08' },
  orman: { color: '#06110D', symbolColor: '#6EE7B7', background: '#06110D' }
};

function resolveTheme(theme) {
  return Object.prototype.hasOwnProperty.call(THEME_CHROME, theme) ? theme : 'dark';
}

function applyThemeChrome(win, theme) {
  const key = resolveTheme(theme);
  const palette = THEME_CHROME[key];
  if (!win || win.isDestroyed()) return;
  try {
    win.setTitleBarOverlay({ color: palette.color, symbolColor: palette.symbolColor, height: 44 });
  } catch {
    /* overlay is unavailable on some window configurations */
  }
  try {
    win.setBackgroundColor(palette.background);
  } catch {
    /* ignore */
  }
  try {
    win.setOpacity(palette.opacity ?? 1);
  } catch {
    /* opacity is not supported on every platform */
  }
}

function handle(channel, handler) {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      const result = await handler(event, ...args);
      return { ok: true, ...(result || {}) };
    } catch (error) {
      return {
        ok: false,
        code: error.code || 'error',
        error: error.message || 'Beklenmeyen bir hata oluştu.',
        ...(error.module ? { module: error.module } : {})
      };
    }
  });
}

function relaunchElevated() {
  return new Promise((resolve, reject) => {
    const executable = process.execPath;
    const args = app.isPackaged ? [] : [app.getAppPath()];
    const argumentList = args.length
      ? ` -ArgumentList @(${args.map((arg) => psQuote(arg)).join(', ')})`
      : '';
    const script = `try {
  Start-Process -FilePath ${psQuote(executable)}${argumentList} -Verb RunAs -ErrorAction Stop
  exit 0
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}`;

    app.releaseSingleInstanceLock();

    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true }
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => reject(error));

    child.on('exit', (code) => {
      if (code === 0) {
        resolve({ started: true });
        setTimeout(() => app.quit(), 350);
        return;
      }
      app.requestSingleInstanceLock();
      reject(new Error(stderr.trim() || 'Yönetici izni iptal edildi.'));
    });
  });
}

function registerIpc() {
  handle('app:bootstrap', async () => {
    const [admin, status] = await Promise.all([system.isAdmin(), license.getStatus()]);
    return {
      admin,
      licensed: status.licensed,
      license: status.license || null,
      hwid: status.hwid,
      licenseReady: status.ready,
      licenseError: status.error || null,
      system: {
        hostname: os.hostname(),
        platform: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        totalMemory: os.totalmem()
      },
      product: 'Omerta FPS Pro',
      plan: status.licensed ? 'pro' : 'free',
      version: app.getVersion()
    };
  });

  handle('app:relaunchAdmin', () => relaunchElevated());
  handle('app:setTheme', (event, theme) => {
    const next = resolveTheme(theme);
    applyThemeChrome(BrowserWindow.fromWebContents(event.sender), next);
    return { theme: next };
  });
  handle('app:quit', () => {
    setTimeout(() => app.quit(), 50);
    return { quitting: true };
  });

  handle('app:copy', async (_event, text) => {
    const value = String(text || '').slice(0, 2000);
    clipboard.writeText(value);
    return { copied: Boolean(value) };
  });

  handle('updater:status', () => updater.status());
  handle('updater:check', () => updater.check());
  handle('updater:install', () => updater.install());

  handle('license:activate', async (_event, key) => {
    const result = await license.activate(String(key || '').slice(0, 64));
    if (!result.ok) {
      const error = new Error(result.error);
      error.code = result.code;
      throw error;
    }
    gate.invalidate();
    return { license: result.license };
  });

  handle('license:logout', async () => {
    const result = await license.logout();
    gate.invalidate();
    return result;
  });

  handle('services:list', async () => ({ items: await services.list() }));
  handle('services:set', async (_event, id, enabled) => {
    if (typeof id !== 'string' || id.length > 64) {
      const error = new Error('Geçersiz hizmet kimliği.');
      error.code = 'invalid';
      throw error;
    }
    if (enabled !== true) await gate.requirePro('services');
    return services.set(id, enabled === true);
  });

  handle('maintenance:stats', (_event, options) =>
    maintenance.getStats({ standby: options?.standby !== false })
  );
  handle('maintenance:scan', async () => ({ items: await maintenance.scan() }));
  handle('maintenance:clean', async (_event, ids) => {
    await gate.requirePro('maintenance');
    return maintenance.clean(Array.isArray(ids) ? ids : null);
  });
  handle('maintenance:purge', async () => {
    await gate.requirePro('maintenance');
    return maintenance.purgeStandby();
  });
  handle('maintenance:boost', async (event) => {
    await gate.requirePro('maintenance');
    return maintenance.boost((progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('maintenance:progress', progress);
    });
  });

  handle('nvidia:status', () => nvidia.inspect());
  handle('nvidia:apply', async () => {
    await gate.requirePro('nvidia');
    return nvidia.apply();
  });
  handle('nvidia:revert', () => nvidia.revert());
  handle('nvidia:openPanel', () => nvidia.openControlPanel());

  handle('amd:status', () => amd.inspect());
  handle('amd:openPanel', () => amd.openControlPanel());

  handle('hardware:detect', () => hardware.detect(true));

  handle('scan:run', (event) =>
    scan.run((progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress);
    })
  );
  handle('scan:fix', async (event, id) => {
    await gate.requirePro('scan');
    return scan.fix(String(id || ''), (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send('scan:progress', progress);
    });
  });

  handle('profiles:status', () => profiles.status());
  handle('profiles:apply', async (_event, id, options) => {
    await gate.requirePro('profiles');
    return profiles.apply(String(id || ''), {
      defenderExclusion: options?.defenderExclusion === true
    });
  });
  handle('profiles:revert', () => profiles.revert());

  handle('network:status', () => network.status());
  handle('network:apply', async (_event, guids) => {
    await gate.requirePro('network');
    return network.apply(Array.isArray(guids) ? guids.slice(0, 8) : null);
  });
  handle('network:revert', () => network.revert());
  handle('network:flushDns', () => network.flushDns());
  handle('network:ping', () => network.ping());

  handle('timer:status', () => timer.status());
  handle('timer:start', async () => {
    await gate.requirePro('timer');
    return timer.start();
  });
  handle('timer:stop', () => timer.stop());

  handle('fivem:status', () => fivem.inspect());
  handle('fivem:apply', async () => {
    await gate.requirePro('fivem');
    return fivem.apply();
  });
  handle('fivem:revert', () => fivem.revert());

  handle('suspend:status', () => suspend.status(games));
  handle('suspend:enable', async () => {
    await gate.requirePro('suspend');
    const result = await suspend.enable();
    orchestrator.syncWatcher();
    return { ...result, status: suspend.status(games) };
  });
  handle('suspend:disable', async () => {
    const result = await suspend.disable();
    orchestrator.syncWatcher();
    return { ...result, status: suspend.status(games) };
  });
  handle('suspend:resume', async () => {
    await suspend.resumeAll();
    return suspend.status(games);
  });

  handle('resolution:status', () => resolution.status());
  handle('resolution:enable', async (_event, width, height) => {
    await gate.requirePro('resolution');
    const result = await resolution.enable(width, height);
    orchestrator.syncWatcher();
    return result;
  });
  handle('resolution:disable', async () => {
    const result = await resolution.disable();
    orchestrator.syncWatcher();
    return result;
  });
  handle('resolution:applyNow', async () => {
    await gate.requirePro('resolution');
    return resolution.applyNow();
  });
  handle('resolution:restoreNow', () => resolution.restoreNow());

  handle('nis:status', () => nis.status());
  handle('nis:openPanel', () => nis.openPanel());

  handle('activity:list', () => ({ items: activity.list(12) }));
  handle('activity:clear', () => ({ cleared: activity.clear() }));

  handle('settings:status', () => {
    const stored = settings.get();
    const login = app.getLoginItemSettings();
    return {
      ...stored,
      loginItem: Boolean(login.openAtLogin),
      displays: overlay.listDisplays(),
      dataDir: store.getDataDir(),
      version: app.getVersion(),
      platform: `${os.type()} ${os.release()}`
    };
  });

  handle('settings:update', async (_event, patch) => {
    const input = patch && typeof patch === 'object' ? patch : {};
    const current = settings.get();
    if (input.autoProfile?.enabled === true) await gate.requirePro('profiles');

    const enablingOverlay =
      (input.overlay?.fps?.enabled === true && !current.overlay.fps.enabled) ||
      (input.overlay?.crosshair?.enabled === true && !current.overlay.crosshair.enabled);
    if (enablingOverlay) await gate.requirePro('overlay');

    const next = settings.update(input);

    if (typeof input.startWithWindows === 'boolean') {
      app.setLoginItemSettings({
        openAtLogin: input.startWithWindows,
        path: process.execPath,
        args: app.isPackaged ? [] : [app.getAppPath()]
      });
      next.startWithWindows = Boolean(app.getLoginItemSettings().openAtLogin);
      settings.update({ startWithWindows: next.startWithWindows });
    }

    await orchestrator.refreshSettings();
    overlay.apply();

    return {
      ...next,
      loginItem: Boolean(app.getLoginItemSettings().openAtLogin),
      displays: overlay.listDisplays(),
      dataDir: store.getDataDir()
    };
  });

  handle('restorePoint:status', () => restore.status());
  handle('restorePoint:create', () => restore.create('Manuel istek'));
}

module.exports = { registerIpc };
