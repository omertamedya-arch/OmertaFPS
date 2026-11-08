'use strict';

const path = require('node:path');
const { app, BrowserWindow, Menu } = require('electron');
const { registerIpc } = require('./ipc');
const orchestrator = require('./lib/orchestrator');
const overlay = require('./lib/overlay');
const updater = require('./lib/updater');

let mainWindow = null;
let cleanupStarted = false;
let cleanupPromise = null;

function shutdownServices() {
  if (!cleanupPromise) {
    const timeout = new Promise((resolve) => setTimeout(resolve, 12000));
    cleanupPromise = Promise.race([orchestrator.shutdown(), timeout]).then(() => {
      overlay.shutdown();
    });
  }
  return cleanupPromise;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    orchestrator.init({
      send: (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('esports:event', payload);
        }
      }
    });
    registerIpc();
    createWindow();
    orchestrator.recover();
    overlay.init();
    updater.init({
      send: (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('updater:event', payload);
        }
      },
      prepareInstall: () => {
        cleanupStarted = true;
        return shutdownServices();
      }
    });
    updater.start();
  });

  app.on('window-all-closed', () => app.quit());

  app.on('before-quit', (event) => {
    if (cleanupStarted) return;
    event.preventDefault();
    cleanupStarted = true;
    shutdownServices().finally(() => app.quit());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    backgroundColor: '#05080C',
    title: 'Omerta FPS Pro',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay:
      process.platform === 'win32'
        ? { color: '#05080C', symbolColor: '#8494A8', height: 44 }
        : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  const devUrl = process.env.OMERTA_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    overlay.shutdown();
    app.quit();
  });
}
