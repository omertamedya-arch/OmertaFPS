'use strict';

const { runPowerShellJson, runPowerShell, psQuote } = require('../lib/ps');
const store = require('../lib/store');
const activity = require('../lib/activity');

const STATE_FILE = 'fivem-state.json';

const STATUS_SCRIPT = `
$proc = Get-Process -Name FiveM -ErrorAction SilentlyContinue | Select-Object -First 1
$running = $false
$processId = $null
$priority = $null
$path = $null
if ($proc) {
  $running = $true
  $processId = $proc.Id
  try { $priority = [string]$proc.PriorityClass } catch { $priority = $null }
  try { $path = [string]$proc.Path } catch { $path = $null }
}
if (-not $path -and $env:LOCALAPPDATA) {
  $candidate = Join-Path $env:LOCALAPPDATA 'FiveM\\FiveM.app\\FiveM.exe'
  if (Test-Path $candidate) { $path = $candidate }
}
$folder = $null
if ($path) {
  $folder = Split-Path -Path $path -Parent
}

$defenderAvailable = $false
try {
  $defenderAvailable = [bool](Get-Command Add-MpPreference -ErrorAction SilentlyContinue)
} catch { $defenderAvailable = $false }

$exclusion = $false
if ($defenderAvailable -and $folder) {
  try {
    $prefs = Get-MpPreference -ErrorAction SilentlyContinue
    if ($prefs -and $prefs.ExclusionPath) {
      $exclusion = @($prefs.ExclusionPath | Where-Object { $_ -eq $folder }).Count -gt 0
    }
  } catch { $exclusion = $false }
}

$defenderRunning = $false
try {
  $svc = Get-Service -Name WinDefend -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq 'Running') { $defenderRunning = $true }
} catch { $defenderRunning = $false }

[pscustomobject]@{
  found = [bool]$path
  path = $path
  folder = $folder
  running = $running
  processId = $processId
  priority = $priority
  exclusion = $exclusion
  defenderAvailable = $defenderAvailable
  defenderRunning = $defenderRunning
}
`;

function readState() {
  return store.readJson(store.dataFile(STATE_FILE), null);
}

function assertFolder(folder) {
  const value = String(folder || '').trim();
  if (!value || value.length > 240) {
    const error = new Error('FiveM klasörü doğrulanamadı.');
    error.code = 'invalid';
    throw error;
  }
  if (!/fivem/i.test(value) || /^[a-zA-Z]:\\?$/.test(value)) {
    const error = new Error('Güvenlik nedeniyle yalnızca FiveM klasörü istisnaya eklenebilir.');
    error.code = 'invalid';
    throw error;
  }
  return value;
}

async function inspect() {
  let base = {};
  try {
    const rows = await runPowerShellJson(STATUS_SCRIPT, { timeout: 30000 });
    base = rows?.[0] || {};
  } catch {
    base = {};
  }

  const state = readState();

  return {
    found: Boolean(base.found),
    path: base.path || null,
    folder: base.folder || null,
    running: Boolean(base.running),
    processId: base.processId || null,
    priority: base.priority || null,
    priorityHigh: String(base.priority || '').toLowerCase() === 'high',
    exclusion: Boolean(base.exclusion),
    defenderAvailable: Boolean(base.defenderAvailable),
    defenderRunning: Boolean(base.defenderRunning),
    appliedAt: state?.appliedAt || null,
    managedExclusion: Boolean(state?.exclusionAdded),
    warning:
      'FiveM klasörünü Defender taramasından çıkarmak, bu klasördeki dosyaların taranmaması demektir. Yalnızca güvendiğin sunucularda kullan.'
  };
}

async function apply(options = {}) {
  const addExclusion = options.addExclusion !== false;
  const info = await inspect();
  if (!info.found || !info.folder) {
    const error = new Error(
      'FiveM kurulumu bulunamadı. FiveM’i bir kez açıp tekrar dene veya klasör yolunu kontrol et.'
    );
    error.code = 'not-found';
    throw error;
  }

  const folder = assertFolder(info.folder);
  const state = readState() || {};

  let priorityApplied = false;
  if (info.running) {
    const script = `
$processes = @(Get-Process -Name FiveM -ErrorAction SilentlyContinue)
foreach ($proc in $processes) {
  try {
    $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::High
  } catch {
    Write-Output ('WARN|' + $proc.Id + '|' + $_.Exception.Message)
  }
}
[pscustomobject]@{ count = $processes.Count }
`;
    await runPowerShell(script, { timeout: 20000 }).catch(() => '');
    priorityApplied = true;
  }

  let exclusionAdded = Boolean(state.exclusionAdded);
  let exclusionAddedByCall = false;

  if (addExclusion && info.defenderAvailable && info.defenderRunning) {
    if (!info.exclusion) {
      const script = `Add-MpPreference -ExclusionPath ${psQuote(folder)} -ErrorAction Stop`;
      await runPowerShell(script, { timeout: 30000 });
      exclusionAdded = true;
      exclusionAddedByCall = true;
    }
  }

  const nextState = {
    appliedAt: new Date().toISOString(),
    folder,
    exclusionAdded,
    priorityApplied
  };
  store.writeJson(store.dataFile(STATE_FILE), nextState);

  activity.add({
    kind: 'esports',
    title: 'FiveM / Roleplay profili uygulandı',
    detail: `${folder}${exclusionAdded ? ' · Defender istisnası' : ''}`
  });

  const finalInfo = await inspect();

  return {
    ...finalInfo,
    priorityApplied: finalInfo.priorityHigh,
    exclusionAdded: finalInfo.exclusion,
    exclusionAddedByCall,
    warning:
      'İşlem önceliği yalnızca çalışan FiveM süreçlerine uygulanır ve kalıcı değildir. FiveM’i yeniden başlatırsan profili tekrar uygula.'
  };
}

async function resetPriority() {
  const script = `
$processes = @(Get-Process -Name FiveM -ErrorAction SilentlyContinue)
foreach ($proc in $processes) {
  try { $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal } catch { }
}
`;
  await runPowerShell(script, { timeout: 20000 }).catch(() => '');
  return inspect();
}

async function revert() {
  const state = readState();
  if (!state) {
    return { ...(await inspect()), reverted: false };
  }

  if (state.exclusionAdded && state.folder) {
    const folder = assertFolder(state.folder);
    const script = `Remove-MpPreference -ExclusionPath ${psQuote(folder)} -ErrorAction SilentlyContinue`;
    await runPowerShell(script, { timeout: 30000 }).catch(() => '');
  }

  const script = `
$processes = @(Get-Process -Name FiveM -ErrorAction SilentlyContinue)
foreach ($proc in $processes) {
  try { $proc.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Normal } catch { }
}
`;
  await runPowerShell(script, { timeout: 20000 }).catch(() => '');

  store.removeFile(store.dataFile(STATE_FILE));

  activity.add({
    kind: 'esports',
    title: 'FiveM profili geri alındı',
    detail: state.folder || 'FiveM',
    status: 'info'
  });

  return { ...(await inspect()), reverted: true };
}

module.exports = { inspect, apply, revert, resetPriority };
