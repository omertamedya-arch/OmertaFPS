'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let cachedDataDir = null;

function getElectronApp() {
  if (process.env.ELECTRON_RUN_AS_NODE) return null;
  try {
    const electron = require('electron');
    if (electron && typeof electron === 'object' && electron.app) return electron.app;
  } catch {
    /* running outside Electron (tests) */
  }
  return null;
}

function canWrite(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.nt-write-test');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function getDataDir() {
  if (cachedDataDir) return cachedDataDir;

  const candidates = [];
  if (process.env.OMERTA_DATA_DIR) candidates.push(process.env.OMERTA_DATA_DIR);
  if (process.env.ProgramData) candidates.push(path.join(process.env.ProgramData, 'OmertaFPS'));
  candidates.push(path.join(getUserDataDir(), 'data'));
  candidates.push(path.join(os.tmpdir(), 'OmertaFPS'));

  for (const dir of candidates) {
    if (canWrite(dir)) {
      cachedDataDir = dir;
      return dir;
    }
  }
  cachedDataDir = os.tmpdir();
  return cachedDataDir;
}

function getUserDataDir() {
  const electronApp = getElectronApp();
  if (electronApp) return electronApp.getPath('userData');
  if (process.env.OMERTA_DATA_DIR) return process.env.OMERTA_DATA_DIR;
  return path.join(os.tmpdir(), 'OmertaFPS', 'user');
}

function getAppPath() {
  const electronApp = getElectronApp();
  if (electronApp) return electronApp.getAppPath();
  return process.cwd();
}

function dataFile(name) {
  return path.join(getDataDir(), name);
}

function userFile(name) {
  return path.join(getUserDataDir(), name);
}

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.copyFileSync(tmp, file);
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

function removeFile(file) {
  try {
    fs.unlinkSync(file);
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  getAppPath,
  getDataDir,
  getUserDataDir,
  dataFile,
  userFile,
  readJson,
  writeJson,
  removeFile,
  exists: (file) => fs.existsSync(file)
};
