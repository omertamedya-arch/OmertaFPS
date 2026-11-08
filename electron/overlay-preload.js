'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlay', {
  onConfig: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('overlay:config', listener);
    return () => ipcRenderer.removeListener('overlay:config', listener);
  }
});
