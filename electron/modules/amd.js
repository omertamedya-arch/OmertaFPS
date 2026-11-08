'use strict';

const hardware = require('../lib/hardware');
const activity = require('../lib/activity');
const { runPowerShellJson } = require('../lib/ps');

class AmdError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || 'error';
  }
}

async function inspect() {
  const hw = await hardware.detect();
  const gpu = hw.gpus.find((item) => item.vendor === 'amd') || (hw.gpu?.vendor === 'amd' ? hw.gpu : null);

  if (!gpu) {
    return { available: false, gpu: null, panelAvailable: false };
  }

  let panel = { found: false, target: null };
  try {
    const rows = await runPowerShellJson(
      `$candidates = @()
if ($env:ProgramFiles) {
  $candidates += (Join-Path $env:ProgramFiles 'AMD\\CNext\\CNext\\RadeonSoftware.exe')
  $candidates += (Join-Path $env:ProgramFiles 'AMD\\CNext\\CNext\\RadeonSettings.exe')
}
$programFilesX86 = [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
if ($programFilesX86) {
  $candidates += (Join-Path $programFilesX86 'AMD\\CNext\\CNext\\RadeonSoftware.exe')
}
$found = $null
foreach ($candidate in $candidates) {
  if ($candidate -and (Test-Path -LiteralPath $candidate)) { $found = $candidate; break }
}
$startApp = $null
if (-not $found) {
  try {
    $startApp = Get-StartApps -ErrorAction Stop | Where-Object { $_.Name -match 'AMD Software|Radeon Software|Adrenalin' } | Select-Object -First 1
  } catch { }
}
[pscustomobject]@{
  found = [bool]($found -or $startApp)
  target = [string]$(if ($found) { $found } elseif ($startApp) { $startApp.Name } else { $null })
  appId = [string]$startApp.AppID
}`,
      { timeout: 30000 }
    );
    panel = rows[0] || panel;
  } catch {
    /* panel discovery is optional */
  }

  return {
    available: true,
    gpu,
    driverVersion: gpu.driverVersion,
    driverDate: gpu.driverDate,
    integrated: gpu.integrated,
    vramBytes: gpu.vramBytes,
    panelAvailable: Boolean(panel.found),
    panelTarget: panel.target || null
  };
}

async function openControlPanel() {
  const info = await inspect();
  if (!info.available) {
    throw new AmdError(
      'AMD ekran kartı algılanamadı. Bu modül yalnızca AMD GPU bulunan sistemlerde çalışır.',
      'no-amd'
    );
  }

  const rows = await runPowerShellJson(
    `$candidates = @()
if ($env:ProgramFiles) {
  $candidates += (Join-Path $env:ProgramFiles 'AMD\\CNext\\CNext\\RadeonSoftware.exe')
  $candidates += (Join-Path $env:ProgramFiles 'AMD\\CNext\\CNext\\RadeonSettings.exe')
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
    $app = Get-StartApps -ErrorAction Stop | Where-Object { $_.Name -match 'AMD Software|Radeon Software|Adrenalin' } | Select-Object -First 1
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
    throw new AmdError(
      'AMD Software bulunamadı. Adrenalin sürücüsünün kurulu olduğundan emin olun.',
      'panel-not-found'
    );
  }

  activity.add({
    kind: 'gpu',
    title: 'AMD Software açıldı',
    detail: row.target || 'Adrenalin Edition',
    status: 'info'
  });

  return { opened: true, target: row.target };
}

module.exports = {
  inspect,
  openControlPanel
};
