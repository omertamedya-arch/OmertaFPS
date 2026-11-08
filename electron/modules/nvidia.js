'use strict';

const store = require('../lib/store');
const activity = require('../lib/activity');
const { runPowerShell, runPowerShellJson, psQuote } = require('../lib/ps');

const BACKUP_FILE = () => store.dataFile('nvidia-backup.json');

const APPLIED_VALUES = {
  PowerMizerEnable: 1,
  PowerMizerLevel: 1,
  PowerMizerLevelAC: 1,
  PerfLevelSrc: 8738,
  DisableDynamicPstate: 1
};

class NvidiaError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || 'error';
  }
}

function psValue(value) {
  if (value === null || value === undefined || value === '') return '$null';
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.trunc(number)) : '$null';
}

async function inspect() {
  let raw = {};
  try {
    const rows = await runPowerShellJson(
      `$gpu = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'NVIDIA' } | Select-Object -First 1
$base = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}'
$keyPath = $null
$gpuKeyName = $null
if (Test-Path -LiteralPath $base) {
  foreach ($candidate in (Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue)) {
    $description = (Get-ItemProperty -LiteralPath $candidate.PSPath -ErrorAction SilentlyContinue).DriverDesc
    if ($description -match 'NVIDIA') {
      $keyPath = [string]$candidate.PSPath
      $gpuKeyName = [string]$candidate.PSChildName
      break
    }
  }
}
$values = @{}
if ($keyPath) {
  $properties = Get-ItemProperty -LiteralPath $keyPath -ErrorAction SilentlyContinue
  foreach ($name in @('PowerMizerEnable','PowerMizerLevel','PowerMizerLevelAC','PerfLevelSrc','DisableDynamicPstate')) {
    $property = $properties.PSObject.Properties[$name]
    if ($property) { $values[$name] = [int]$property.Value } else { $values[$name] = $null }
  }
}
[pscustomobject]@{
  gpuName = [string]$gpu.Name
  driverVersion = [string]$gpu.DriverVersion
  keyPath = [string]$keyPath
  gpuKeyName = [string]$gpuKeyName
  values = $values
}`,
      { timeout: 30000 }
    );
    raw = rows[0] || {};
  } catch {
    raw = {};
  }

  const values = raw.values || {};
  const backup = store.readJson(BACKUP_FILE(), null);
  const settings = {
    powerManagement:
      Number(values.PowerMizerEnable) === 1 &&
      Number(values.PowerMizerLevel) === 1 &&
      Number(values.PowerMizerLevelAC) === 1,
    dynamicPstateOff: Number(values.DisableDynamicPstate) === 1,
    perfLevelPinned: Number(values.PerfLevelSrc) === 8738
  };

  return {
    gpuName: raw.gpuName || null,
    driverVersion: raw.driverVersion || null,
    keyPath: raw.keyPath || null,
    gpuKeyName: raw.gpuKeyName || null,
    values,
    settings,
    active: settings.powerManagement && settings.dynamicPstateOff && settings.perfLevelPinned,
    hasBackup: Boolean(backup),
    backupAt: backup?.savedAt || null
  };
}

async function apply() {
  const info = await inspect();
  if (!info.gpuName) {
    throw new NvidiaError(
      'NVIDIA ekran kartı algılanamadı. Bu modül yalnızca NVIDIA GPU bulunan sistemlerde çalışır.',
      'no-nvidia'
    );
  }
  if (!info.keyPath) {
    throw new NvidiaError(
      'NVIDIA sürücü kayıt anahtarı bulunamadı. Sürücüyü güncelleyip tekrar deneyin.',
      'driver-key-missing'
    );
  }

  const existingBackup = store.readJson(BACKUP_FILE(), null);
  if (!existingBackup || existingBackup.keyPath !== info.keyPath) {
    store.writeJson(BACKUP_FILE(), {
      keyPath: info.keyPath,
      gpuName: info.gpuName,
      savedAt: new Date().toISOString(),
      values: info.values
    });
  }

  const lines = Object.entries(APPLIED_VALUES).map(
    ([name, value]) =>
      `New-ItemProperty -LiteralPath $key -Name ${psQuote(name)} -Value ${value} -PropertyType DWord -Force | Out-Null`
  );

  await runPowerShell(`$key = ${psQuote(info.keyPath)}\n${lines.join('\n')}`, { timeout: 30000 });

  activity.add({
    kind: 'nvidia',
    title: 'NVIDIA maksimum performans profili uygulandı',
    detail: info.gpuName,
    status: 'success'
  });

  const fresh = await inspect();
  return { info: fresh, requiresRestart: true };
}

async function revert() {
  const info = await inspect();
  const backup = store.readJson(BACKUP_FILE(), null);

  if (!info.gpuName) {
    throw new NvidiaError('NVIDIA ekran kartı algılanamadı.', 'no-nvidia');
  }

  const keyPath = backup?.keyPath || info.keyPath;
  if (!keyPath) {
    throw new NvidiaError('Geri alınacak NVIDIA ayarı bulunamadı.', 'driver-key-missing');
  }

  const values = backup?.values || { PowerMizerEnable: null, PowerMizerLevel: null, PowerMizerLevelAC: null, PerfLevelSrc: null, DisableDynamicPstate: null };

  const assignments = Object.entries(values)
    .map(([name, value]) => `${psQuote(name)} = ${psValue(value)}`)
    .join('\n');

  const script = `$restore = @{
${assignments}
}
$key = ${psQuote(keyPath)}
foreach ($name in $restore.Keys) {
  $value = $restore[$name]
  if ($null -eq $value) {
    Remove-ItemProperty -LiteralPath $key -Name $name -ErrorAction SilentlyContinue
  } else {
    New-ItemProperty -LiteralPath $key -Name $name -Value ([int]$value) -PropertyType DWord -Force | Out-Null
  }
}`;

  await runPowerShell(script, { timeout: 30000 });
  store.removeFile(BACKUP_FILE());

  activity.add({
    kind: 'nvidia',
    title: 'NVIDIA ayarları varsayılana döndürüldü',
    detail: info.gpuName,
    status: 'info'
  });

  const fresh = await inspect();
  return { info: fresh, requiresRestart: true };
}

async function openControlPanel() {
  const rows = await runPowerShellJson(
    `$candidates = @()
if ($env:ProgramFiles) {
  $candidates += (Join-Path $env:ProgramFiles 'NVIDIA Corporation\\Control Panel Client\\nvcplui.exe')
  $candidates += (Join-Path $env:ProgramFiles 'NVIDIA Corporation\\NVIDIA app\\CEF\\NVIDIA app.exe')
}
$programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($programFilesX86) {
  $candidates += (Join-Path $programFilesX86 'NVIDIA Corporation\\Control Panel Client\\nvcplui.exe')
}
$started = $null
foreach ($candidate in $candidates) {
  if ($candidate -and (Test-Path -LiteralPath $candidate)) {
    Start-Process -FilePath $candidate
    $started = $candidate
    break
  }
}
if (-not $started) {
  try {
    $app = Get-StartApps -ErrorAction Stop | Where-Object { $_.Name -match 'NVIDIA' } | Select-Object -First 1
    if ($app) {
      Start-Process ('shell:AppsFolder\\' + $app.AppID)
      $started = $app.Name
    }
  } catch { }
}
[pscustomobject]@{ opened = [bool]$started; target = [string]$started }`,
    { timeout: 30000 }
  );

  const row = rows[0] || {};
  if (!row.opened) {
    throw new NvidiaError(
      'NVIDIA Kontrol Paneli veya NVIDIA uygulaması bulunamadı. Sürücü kurulumunu kontrol edin.',
      'panel-not-found'
    );
  }
  return { opened: true, target: row.target };
}

module.exports = {
  inspect,
  apply,
  revert,
  openControlPanel
};
