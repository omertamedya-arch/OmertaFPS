'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('nitro', {
  bootstrap: () => invoke('app:bootstrap'),
  relaunchAdmin: () => invoke('app:relaunchAdmin'),
  setTheme: (theme) => invoke('app:setTheme', theme),
  quit: () => invoke('app:quit'),
  copy: (text) => invoke('app:copy', text),

  activateLicense: (key) => invoke('license:activate', key),
  logout: () => invoke('license:logout'),

  services: {
    list: () => invoke('services:list'),
    set: (id, enabled) => invoke('services:set', id, enabled)
  },

  maintenance: {
    stats: (options) => invoke('maintenance:stats', options),
    scan: () => invoke('maintenance:scan'),
    clean: (ids) => invoke('maintenance:clean', ids),
    purge: () => invoke('maintenance:purge'),
    boost: () => invoke('maintenance:boost')
  },

  nvidia: {
    status: () => invoke('nvidia:status'),
    apply: () => invoke('nvidia:apply'),
    revert: () => invoke('nvidia:revert'),
    openPanel: () => invoke('nvidia:openPanel')
  },

  amd: {
    status: () => invoke('amd:status'),
    openPanel: () => invoke('amd:openPanel')
  },

  hardware: {
    detect: () => invoke('hardware:detect')
  },

  scan: {
    run: () => invoke('scan:run'),
    fix: (id) => invoke('scan:fix', id)
  },

  profiles: {
    status: () => invoke('profiles:status'),
    apply: (id, options) => invoke('profiles:apply', id, options),
    revert: () => invoke('profiles:revert')
  },

  network: {
    status: () => invoke('network:status'),
    apply: (guids) => invoke('network:apply', guids),
    revert: () => invoke('network:revert'),
    flushDns: () => invoke('network:flushDns'),
    ping: () => invoke('network:ping')
  },

  timer: {
    status: () => invoke('timer:status'),
    start: () => invoke('timer:start'),
    stop: () => invoke('timer:stop')
  },

  fivem: {
    status: () => invoke('fivem:status'),
    apply: () => invoke('fivem:apply'),
    revert: () => invoke('fivem:revert')
  },

  suspend: {
    status: () => invoke('suspend:status'),
    enable: () => invoke('suspend:enable'),
    disable: () => invoke('suspend:disable'),
    resume: () => invoke('suspend:resume')
  },

  resolution: {
    status: () => invoke('resolution:status'),
    enable: (width, height) => invoke('resolution:enable', width, height),
    disable: () => invoke('resolution:disable'),
    applyNow: () => invoke('resolution:applyNow'),
    restoreNow: () => invoke('resolution:restoreNow')
  },

  nis: {
    status: () => invoke('nis:status'),
    openPanel: () => invoke('nis:openPanel')
  },

  settings: {
    status: () => invoke('settings:status'),
    update: (patch) => invoke('settings:update', patch)
  },

  updater: {
    status: () => invoke('updater:status'),
    check: () => invoke('updater:check'),
    install: () => invoke('updater:install'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:event', listener);
      return () => ipcRenderer.removeListener('updater:event', listener);
    }
  },

  restorePoint: {
    status: () => invoke('restorePoint:status'),
    create: () => invoke('restorePoint:create')
  },

  activity: () => invoke('activity:list'),
  activityClear: () => invoke('activity:clear'),

  onProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('maintenance:progress', listener);
    return () => ipcRenderer.removeListener('maintenance:progress', listener);
  },

  onScanProgress: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('scan:progress', listener);
    return () => ipcRenderer.removeListener('scan:progress', listener);
  },

  onEsportsEvent: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('esports:event', listener);
    return () => ipcRenderer.removeListener('esports:event', listener);
  }
});
