'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { runPowerShellJson } = require('../lib/ps');
const store = require('../lib/store');
const activity = require('../lib/activity');

const SCRIPT_FILE = 'omerta-timer.ps1';
const STATE_FILE = 'timer-state.json';
const TARGET = 5000;

const SCRIPT = `param(
  [int]$ParentPid,
  [int]$Resolution = 5000
)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmertaTimer {
  [DllImport("ntdll.dll")]
  public static extern int NtSetTimerResolution(int desired, [MarshalAs(UnmanagedType.U1)] bool set, out int current);
}
"@
$current = 0
[void][OmertaTimer]::NtSetTimerResolution($Resolution, $true, [ref]$current)
try {
  while ($true) {
    Start-Sleep -Seconds 2
    $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
    if (-not $parent) { break }
  }
} finally {
  [void][OmertaTimer]::NtSetTimerResolution($Resolution, $false, [ref]$current)
}
`;

const QUERY = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmertaTimerInfo {
  [DllImport("ntdll.dll")]
  public static extern int NtQueryTimerResolution(out int minimum, out int maximum, out int current);
}
"@
$minimum = 0
$maximum = 0
$current = 0
[void][OmertaTimerInfo]::NtQueryTimerResolution([ref]$minimum, [ref]$maximum, [ref]$current)
[pscustomobject]@{
  minimum = [int]$minimum
  maximum = [int]$maximum
  current = [int]$current
}
`;

function ensureScript() {
  const file = store.dataFile(SCRIPT_FILE);
  try {
    fs.writeFileSync(file, '\uFEFF' + SCRIPT, 'utf8');
  } catch {
    /* ignore */
  }
  return file;
}

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readState() {
  return store.readJson(store.dataFile(STATE_FILE), null);
}

function killTree(pid) {
  return new Promise((resolve) => {
    const child = spawn('taskkill.exe', ['/PID', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore'
    });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function query() {
  const rows = await runPowerShellJson(QUERY, { timeout: 20000 });
  const row = rows?.[0] || {};
  const current = Number(row.current) || 0;
  const minimum = Number(row.minimum) || 0;
  const maximum = Number(row.maximum) || 0;

  return {
    current,
    minimum,
    maximum,
    currentMs: Number((current / 10000).toFixed(3)),
    minimumMs: Number((minimum / 10000).toFixed(3)),
    maximumMs: Number((maximum / 10000).toFixed(3))
  };
}

async function status() {
  const state = readState();
  const running = Boolean(state && alive(Number(state.pid)));
  const resolution = await query().catch(() => ({ current: 0, minimum: 0, maximum: 0, currentMs: 0, minimumMs: 0, maximumMs: 15.625 }));
  const supported = resolution.minimum > 0 && resolution.minimum <= TARGET;

  return {
    supported,
    running,
    startedAt: running ? state.startedAt : null,
    pid: running ? state.pid : null,
    ...resolution,
    targetMs: 0.5,
    active: running && resolution.currentMs > 0 && resolution.currentMs <= 1.05
  };
}

async function start() {
  const current = readState();
  if (current && alive(Number(current.pid))) {
    return { ...(await status()), started: false };
  }

  store.removeFile(store.dataFile(STATE_FILE));
  const file = ensureScript();

  const child = spawn(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-WindowStyle',
      'Hidden',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      file,
      '-ParentPid',
      String(process.pid),
      '-Resolution',
      String(TARGET)
    ],
    { windowsHide: true, stdio: 'ignore', detached: false }
  );

  child.unref();

  store.writeJson(store.dataFile(STATE_FILE), {
    pid: child.pid,
    startedAt: new Date().toISOString()
  });

  await new Promise((resolve) => setTimeout(resolve, 1100));

  const next = await status();

  if (!next.active) {
    await killTree(child.pid).catch(() => false);
    store.removeFile(store.dataFile(STATE_FILE));
    return { ...next, started: false, failed: true };
  }

  activity.add({
    kind: 'esports',
    title: 'Maksimum tepkime modu açıldı',
    detail: `Zamanlayıcı ${next.currentMs} ms`
  });

  return { ...next, started: true };
}

async function stop() {
  const state = readState();
  let stopped = false;

  if (state && alive(Number(state.pid))) {
    stopped = await killTree(Number(state.pid));
  }

  store.removeFile(store.dataFile(STATE_FILE));
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (stopped) {
    activity.add({
      kind: 'esports',
      title: 'Maksimum tepkime modu kapatıldı',
      detail: 'Windows varsayılan zamanlayıcısına dönüldü',
      status: 'info'
    });
  }

  return { ...(await status()), stopped };
}

async function shutdown() {
  const state = readState();
  if (!state) return;
  store.removeFile(store.dataFile(STATE_FILE));
  if (alive(Number(state.pid))) await killTree(Number(state.pid)).catch(() => false);
}

module.exports = { status, start, stop, shutdown };
