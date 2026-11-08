'use strict';

const { runPowerShellJson } = require('../lib/ps');
const store = require('../lib/store');
const activity = require('../lib/activity');

const STATE_FILE = 'resolution-state.json';

const TYPES = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
public struct DEVMODE {
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
  public short dmSpecVersion;
  public short dmDriverVersion;
  public short dmSize;
  public short dmDriverExtra;
  public int dmFields;
  public int dmPositionX;
  public int dmPositionY;
  public int dmDisplayOrientation;
  public int dmDisplayFixedOutput;
  public short dmColor;
  public short dmDuplex;
  public short dmYResolution;
  public short dmTTOption;
  public short dmCollate;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
  public short dmLogPixels;
  public int dmBitsPerPel;
  public int dmPelsWidth;
  public int dmPelsHeight;
  public int dmDisplayFlags;
  public int dmDisplayFrequency;
  public int dmICMMethod;
  public int dmICMIntent;
  public int dmMediaType;
  public int dmDitherType;
  public int dmReserved1;
  public int dmReserved2;
  public int dmPanningWidth;
  public int dmPanningHeight;
}
public static class OmertaDisplay {
  [DllImport("user32.dll", CharSet = CharSet.Ansi)]
  public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
  [DllImport("user32.dll", CharSet = CharSet.Ansi)]
  public static extern int ChangeDisplaySettings(ref DEVMODE devMode, int flags);
  [DllImport("user32.dll")]
  public static extern int GetSystemMetrics(int index);
}
"@
`;

const READ_MODES = `${TYPES}
$current = New-Object DEVMODE
$current.dmSize = [short][System.Runtime.InteropServices.Marshal]::SizeOf($current)
[void][OmertaDisplay]::EnumDisplaySettings($null, -1, [ref]$current)

$modes = @()
$seen = @{}
for ($i = 0; $i -lt 500; $i++) {
  $mode = New-Object DEVMODE
  $mode.dmSize = [short][System.Runtime.InteropServices.Marshal]::SizeOf($mode)
  if (-not [OmertaDisplay]::EnumDisplaySettings($null, $i, [ref]$mode)) { break }
  if ($mode.dmPelsWidth -le 0 -or $mode.dmPelsHeight -le 0) { continue }
  if ($mode.dmBitsPerPel -lt 32) { continue }
  $ratio = [double]$mode.dmPelsWidth / [double]$mode.dmPelsHeight
  if ([math]::Abs($ratio - (4.0 / 3.0)) -gt 0.01) { continue }
  $key = ('{0}x{1}' -f $mode.dmPelsWidth, $mode.dmPelsHeight)
  if (-not $seen.ContainsKey($key)) {
    $seen[$key] = $true
    $modes += [pscustomobject]@{
      width = [int]$mode.dmPelsWidth
      height = [int]$mode.dmPelsHeight
    }
  }
}

[pscustomobject]@{
  width = [int]$current.dmPelsWidth
  height = [int]$current.dmPelsHeight
  frequency = [int]$current.dmDisplayFrequency
  bitsPerPel = [int]$current.dmBitsPerPel
  modes = @($modes | Sort-Object -Property height, width -Descending)
}
`;

function readState() {
  return (
    store.readJson(store.dataFile(STATE_FILE), null) || {
      enabled: false,
      target: { width: 1280, height: 960 },
      backup: null,
      appliedAt: null
    }
  );
}

function writeState(state) {
  store.writeJson(store.dataFile(STATE_FILE), state);
}

function assertTarget(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 640 || h < 480 || w > 3840 || h > 2160) {
    const error = new Error('Geçersiz çözünürlük.');
    error.code = 'invalid';
    throw error;
  }
  return { width: w, height: h };
}

function changeMode(width, height) {
  const script = `${TYPES}
$mode = New-Object DEVMODE
$mode.dmSize = [short][System.Runtime.InteropServices.Marshal]::SizeOf($mode)
[void][OmertaDisplay]::EnumDisplaySettings($null, -1, [ref]$mode)
$mode.dmPelsWidth = ${width}
$mode.dmPelsHeight = ${height}
$mode.dmFields = 0x80000 -bor 0x100000
$code = [OmertaDisplay]::ChangeDisplaySettings([ref]$mode, 0)
[pscustomobject]@{
  code = [int]$code
  width = ${width}
  height = ${height}
}
`;

  return runPowerShellJson(script, { timeout: 30000 }).then((rows) => rows?.[0] || { code: -1 });
}

async function readCurrent() {
  const rows = await runPowerShellJson(READ_MODES, { timeout: 30000 });
  const row = rows?.[0] || {};
  return {
    width: Number(row.width) || 0,
    height: Number(row.height) || 0,
    frequency: Number(row.frequency) || 0,
    bitsPerPel: Number(row.bitsPerPel) || 0,
    modes: Array.isArray(row.modes)
      ? row.modes.map((mode) => ({ width: Number(mode.width), height: Number(mode.height) }))
      : []
  };
}

async function status() {
  const state = readState();
  const current = await readCurrent();
  const target = state.target ? assertTarget(state.target.width, state.target.height) : null;

  return {
    enabled: Boolean(state.enabled),
    target,
    backup: state.backup || null,
    appliedAt: state.appliedAt || null,
    current: { width: current.width, height: current.height, frequency: current.frequency },
    modes: current.modes,
    active: Boolean(target && current.width === target.width && current.height === target.height),
    warning:
      'Çözünürlük değişimi ekranda kısa süreli kararma veya titreme yapabilir. Oyun kapanınca özgün çözünürlük geri yüklenir.'
  };
}

async function enable(width, height) {
  const target = assertTarget(width, height);
  const current = await readCurrent();
  const supported = current.modes.some((mode) => mode.width === target.width && mode.height === target.height);
  if (!supported) {
    const error = new Error(`${target.width}×${target.height} bu ekranda desteklenmiyor.`);
    error.code = 'not-supported';
    throw error;
  }

  const state = readState();
  writeState({ ...state, enabled: true, target });

  return status();
}

async function disable() {
  const state = readState();
  writeState({ ...state, enabled: false });

  if (state.backup) {
    await restoreBackup(state.backup);
    const next = readState();
    writeState({ ...next, backup: null, appliedAt: null });
  }

  return status();
}

async function applyNow() {
  const state = readState();
  if (!state.target) {
    const error = new Error('Önce bir 4:3 çözünürlük seç.');
    error.code = 'invalid';
    throw error;
  }

  const target = assertTarget(state.target.width, state.target.height);
  const live = await readCurrent();

  if (live.width === target.width && live.height === target.height) {
    return status();
  }

  const backup = state.backup || { width: live.width, height: live.height };
  const result = await changeMode(target.width, target.height);

  if (result.code !== 0 && result.code !== 1) {
    const error = new Error('Çözünürlük değiştirilemedi. Sürücü bu modu reddetti.');
    error.code = 'display-change-failed';
    throw error;
  }

  writeState({
    ...state,
    backup,
    appliedAt: new Date().toISOString()
  });

  activity.add({
    kind: 'esports',
    title: '4:3 çözünürlük uygulandı',
    detail: `${target.width}×${target.height}`
  });

  return status();
}

async function restoreBackup(backup) {
  const target = assertTarget(backup.width, backup.height);
  const result = await changeMode(target.width, target.height);
  if (result.code !== 0 && result.code !== 1) {
    const error = new Error('Özgün çözünürlük geri yüklenemedi.');
    error.code = 'display-change-failed';
    throw error;
  }
  return true;
}

async function restoreNow() {
  const state = readState();
  if (!state.backup) return status();

  await restoreBackup(state.backup);
  writeState({ ...state, backup: null, appliedAt: null });

  activity.add({
    kind: 'esports',
    title: 'Masaüstü çözünürlüğü geri yüklendi',
    detail: `${state.backup.width}×${state.backup.height}`,
    status: 'info'
  });

  return status();
}

async function onGameStart() {
  const state = readState();
  if (!state.enabled) return { applied: false };
  await applyNow();
  return { applied: true };
}

async function onGameStop() {
  const state = readState();
  if (!state.backup) return { restored: false };
  await restoreNow();
  return { restored: true };
}

async function recover() {
  const state = readState();
  if (!state.backup) return { recovered: false };
  try {
    await restoreBackup(state.backup);
  } catch {
    return { recovered: false };
  }
  writeState({ ...state, backup: null, appliedAt: null });
  return { recovered: true };
}

module.exports = {
  status,
  enable,
  disable,
  applyNow,
  restoreNow,
  onGameStart,
  onGameStop,
  recover,
  isEnabled: () => Boolean(readState().enabled)
};
