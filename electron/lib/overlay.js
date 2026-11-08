'use strict';

const path = require('node:path');
const { BrowserWindow, screen } = require('electron');
const settings = require('./settings');

const FPS_WINDOW = { width: 148, height: 46, margin: 18 };
const CROSSHAIR_WINDOW = 320;

const windows = { fps: null, crosshair: null };
let screenBound = false;

function selectedDisplay() {
  const overlay = settings.get().overlay;
  if (overlay.displayId !== 'primary') {
    const match = screen.getAllDisplays().find((display) => String(display.id) === overlay.displayId);
    if (match) return match;
  }
  return screen.getPrimaryDisplay();
}

function boundsFor(kind, display) {
  if (kind === 'fps') {
    const area = display.workArea;
    return {
      x: area.x + area.width - FPS_WINDOW.width - FPS_WINDOW.margin,
      y: area.y + FPS_WINDOW.margin,
      width: FPS_WINDOW.width,
      height: FPS_WINDOW.height
    };
  }
  const area = display.bounds;
  return {
    x: area.x + Math.round((area.width - CROSSHAIR_WINDOW) / 2),
    y: area.y + Math.round((area.height - CROSSHAIR_WINDOW) / 2),
    width: CROSSHAIR_WINDOW,
    height: CROSSHAIR_WINDOW
  };
}

function listDisplays() {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id === primary.id ? 'primary' : String(display.id),
    label: `Ekran ${index + 1} (${display.size.width}×${display.size.height})`,
    primary: display.id === primary.id
  }));
}

function sendConfig(kind) {
  const win = windows[kind];
  if (!win || win.isDestroyed()) return;
  const overlay = settings.get().overlay;
  const payload = kind === 'fps' ? { ...overlay.fps } : { ...overlay.crosshair };
  if (win.webContents.isDestroyed()) return;
  win.webContents.send('overlay:config', payload);
}

function createWindow(kind) {
  const win = new BrowserWindow({
    ...boundsFor(kind, selectedDisplay()),
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    alwaysOnTop: true,
    acceptFirstMouse: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'overlay-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      devTools: false,
      spellcheck: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: false });
  win.loadFile(path.join(__dirname, '..', 'overlay', kind === 'fps' ? 'fps.html' : 'crosshair.html'));

  win.webContents.on('did-finish-load', () => sendConfig(kind));
  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  });
  win.on('closed', () => {
    if (windows[kind] === win) windows[kind] = null;
  });

  return win;
}

function destroyWindow(kind) {
  const win = windows[kind];
  windows[kind] = null;
  if (win && !win.isDestroyed()) {
    win.removeAllListeners('closed');
    win.destroy();
  }
}

function syncWindow(kind, enabled) {
  if (!enabled) {
    destroyWindow(kind);
    return;
  }
  const win = windows[kind] || createWindow(kind);
  windows[kind] = win;
  if (!win.isDestroyed()) {
    win.setBounds(boundsFor(kind, selectedDisplay()));
    sendConfig(kind);
  }
}

function bindScreenEvents() {
  if (screenBound) return;
  screenBound = true;
  const reposition = () => {
    for (const [kind, win] of Object.entries(windows)) {
      if (win && !win.isDestroyed()) win.setBounds(boundsFor(kind, selectedDisplay()));
    }
  };
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
}

function apply() {
  bindScreenEvents();
  const overlay = settings.get().overlay;
  syncWindow('fps', overlay.fps.enabled);
  syncWindow('crosshair', overlay.crosshair.enabled);
}

function init() {
  apply();
}

function shutdown() {
  destroyWindow('fps');
  destroyWindow('crosshair');
}

module.exports = { init, apply, shutdown, listDisplays };
