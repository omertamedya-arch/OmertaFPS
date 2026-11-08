'use strict';

const { runPowerShell, runPowerShellJson, psQuote } = require('../lib/ps');
const store = require('../lib/store');
const activity = require('../lib/activity');

const SETTINGS_FILE = 'suspend-settings.json';
const STATE_FILE = 'suspend-state.json';

const SAFE_NAMES = [
  'chrome',
  'msedge',
  'firefox',
  'brave',
  'opera',
  'vivaldi',
  'chromium',
  'OneDrive',
  'Dropbox',
  'GoogleDriveFS',
  'notion',
  'Notion',
  'slack',
  'Telegram',
  'Adobe Desktop Service',
  'AdobeIPCBroker',
  'Creative Cloud'
];

const SAFE_NAME_LIST = SAFE_NAMES.map((name) => psQuote(name)).join(', ');

const NATIVE_TYPES = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class OmertaProcess {
  [DllImport("ntdll.dll")]
  public static extern int NtSuspendProcess(IntPtr handle);
  [DllImport("ntdll.dll")]
  public static extern int NtResumeProcess(IntPtr handle);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern IntPtr OpenProcess(int access, bool inheritHandle, int processId);
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern bool CloseHandle(IntPtr handle);
}
"@
`;

function readSettings() {
  const data = store.readJson(store.dataFile(SETTINGS_FILE), null);
  return { enabled: Boolean(data?.enabled), updatedAt: data?.updatedAt || null };
}

function writeSettings(enabled) {
  store.writeJson(store.dataFile(SETTINGS_FILE), { enabled, updatedAt: new Date().toISOString() });
}

function readState() {
  const data = store.readJson(store.dataFile(STATE_FILE), null);
  if (!data || !Array.isArray(data.items) || !data.items.length) return null;
  return data;
}

function isEnabled() {
  return readSettings().enabled;
}

function status(games) {
  const settings = readSettings();
  const state = readState();
  return {
    enabled: settings.enabled,
    active: Boolean(state),
    items: state ? state.items.map((item) => item.name) : [],
    count: state ? state.items.length : 0,
    game: state?.game || null,
    activatedAt: state?.activatedAt || null,
    running: games?.getRunning?.() || [],
    safeNames: SAFE_NAMES
  };
}

async function suspendNow(gameLabel) {
  const script = `${NATIVE_TYPES}
$safeNames = @(${SAFE_NAME_LIST})
$sessionId = [System.Diagnostics.Process]::GetCurrentProcess().SessionId
$targets = @(Get-Process -Name $safeNames -ErrorAction SilentlyContinue | Where-Object {
  $_.SessionId -eq $sessionId -and $_.Id -ne $PID -and $_.WorkingSet64 -gt 62914560
} | Sort-Object WorkingSet64 -Descending | Select-Object -First 24)

foreach ($proc in $targets) {
  $handle = [OmertaProcess]::OpenProcess(0x0800, $false, $proc.Id)
  if ($handle -ne [IntPtr]::Zero) {
    $code = [OmertaProcess]::NtSuspendProcess($handle)
    [void][OmertaProcess]::CloseHandle($handle)
    if ($code -eq 0) {
      [pscustomobject]@{
        pid = $proc.Id
        name = $proc.ProcessName
        startTicks = $proc.StartTime.Ticks
        workingSet = $proc.WorkingSet64
      }
    }
  }
}
`;

  const rows = await runPowerShellJson(script, { timeout: 45000 });
  const items = rows
    .filter((row) => row && Number(row.pid) > 0)
    .map((row) => ({
      pid: Number(row.pid),
      name: String(row.name || 'process'),
      startTicks: String(row.startTicks || '0'),
      workingSet: Number(row.workingSet) || 0
    }));

  if (!items.length) return 0;

  store.writeJson(store.dataFile(STATE_FILE), {
    activatedAt: new Date().toISOString(),
    game: gameLabel || null,
    items
  });

  activity.add({
    kind: 'esports',
    title: 'Arka plan uygulamaları duraklatıldı',
    detail: `${items.length} uygulama · ${gameLabel || 'oyun'}`
  });

  return items.length;
}

async function resumeAll() {
  const state = readState();
  if (!state) return 0;

  const valid = state.items
    .filter((item) => Number(item.pid) > 0)
    .slice(0, 32)
    .map((item) => {
      const ticks = String(item.startTicks || '0').replace(/[^0-9]/g, '') || '0';
      return `@{ pid = ${Number(item.pid)}; startTicks = [long]'${ticks}' }`;
    })
    .join(', ');

  let resumed = 0;
  if (valid) {
    const script = `${NATIVE_TYPES}
$items = @(${valid})
foreach ($item in $items) {
  $proc = Get-Process -Id $item.pid -ErrorAction SilentlyContinue
  if (-not $proc) { continue }
  try {
    if ($proc.StartTime.Ticks -ne $item.startTicks) { continue }
  } catch {
    continue
  }
  $handle = [OmertaProcess]::OpenProcess(0x0800, $false, $proc.Id)
  if ($handle -ne [IntPtr]::Zero) {
    $code = [OmertaProcess]::NtResumeProcess($handle)
    [void][OmertaProcess]::CloseHandle($handle)
    if ($code -eq 0) { $resumed++ }
  }
}
[pscustomobject]@{ resumed = $resumed }
`;

    const rows = await runPowerShellJson(script, { timeout: 45000 });
    resumed = Number(rows?.[0]?.resumed) || 0;
  }

  store.removeFile(store.dataFile(STATE_FILE));

  activity.add({
    kind: 'esports',
    title: 'Duraklatılan uygulamalar uyandırıldı',
    detail: `${state.items.length} uygulama`
  });

  return resumed;
}

async function enable() {
  writeSettings(true);
  return { enabled: true };
}

async function disable() {
  writeSettings(false);
  await resumeAll();
  return { enabled: false };
}

async function recover() {
  if (!readState()) return { recovered: 0 };
  return { recovered: await resumeAll() };
}

async function onGameStart(game) {
  if (!isEnabled()) return { suspended: 0 };
  if (readState()) return { suspended: 0 };
  return { suspended: await suspendNow(game) };
}

async function onGameStop() {
  if (!readState()) return { resumed: 0 };
  return { resumed: await resumeAll() };
}

module.exports = {
  status,
  enable,
  disable,
  recover,
  onGameStart,
  onGameStop,
  resumeAll,
  resume: resumeAll,
  isEnabled,
  stateFile: () => store.dataFile(STATE_FILE)
};
