'use strict';

const { runPowerShell, runPowerShellJson, psQuote } = require('../lib/ps');

const HIGH_PERFORMANCE_GUID = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c';
const BALANCED_GUID = '381b4222-f694-41f0-9685-ff5bb260df2e';

const REGISTRY_ITEMS = [
  { group: 'gameDvr', path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_Enabled', type: 'DWord' },
  {
    group: 'gameDvr',
    path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR',
    name: 'AppCaptureEnabled',
    type: 'DWord'
  },
  {
    group: 'visualFx',
    path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects',
    name: 'VisualFXSetting',
    type: 'DWord'
  },
  { group: 'mouse', path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseSpeed', type: 'String' },
  { group: 'mouse', path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseThreshold1', type: 'String' },
  { group: 'mouse', path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseThreshold2', type: 'String' }
];

async function readState() {
  const itemList = REGISTRY_ITEMS.map(
    (item) =>
      `[pscustomobject]@{ group = ${psQuote(item.group)}; path = ${psQuote(item.path)}; name = ${psQuote(
        item.name
      )}; type = ${psQuote(item.type)} }`
  ).join('\n  ');

  const rows = await runPowerShellJson(
    `$items = @(
  ${itemList}
)
$stateEntries = @()
foreach ($item in $items) {
  $exists = $false
  $value = $null
  try {
    $value = (Get-ItemProperty -LiteralPath $item.path -Name $item.name -ErrorAction Stop).$($item.name)
    $exists = $true
  } catch { }
  $stateEntries += [pscustomobject]@{
    group = $item.group
    path = $item.path
    name = $item.name
    type = $item.type
    exists = $exists
    value = $value
  }
}
$activeOutput = (& powercfg /getactivescheme) -join ' '
$guid = $null
$powerName = $null
if ($activeOutput -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') {
  $guid = $matches[1]
}
if ($activeOutput -match '\\((.*)\\)') {
  $powerName = $matches[1]
}
$planList = (& powercfg /list) -join "\`n"
[pscustomobject]@{
  entries = @($stateEntries)
  power = [pscustomobject]@{
    guid = $guid
    name = $powerName
    highPerformanceAvailable = [bool]($planList -match '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c')
  }
}`,
    { timeout: 30000 }
  );

  const row = rows[0] || {};
  const entries = Array.isArray(row.entries) ? row.entries : [];
  const byGroup = (group) => entries.filter((entry) => entry.group === group);

  const gameDvr = byGroup('gameDvr');
  const gameDvrValues = gameDvr
    .filter((entry) => entry.exists)
    .map((entry) => Number(entry.value));
  const visual = byGroup('visualFx')[0] || null;
  const mouse = byGroup('mouse');

  return {
    entries,
    gameDvr: {
      values: gameDvr,
      enabled: gameDvrValues.length ? gameDvrValues.some((value) => value === 1) : true
    },
    power: row.power || { guid: null, name: null, highPerformanceAvailable: false },
    visualFx: {
      values: visual ? [visual] : [],
      exists: Boolean(visual?.exists),
      value: visual?.exists ? Number(visual.value) : null
    },
    mouse: {
      values: mouse,
      acceleration: mouse.some((entry) => entry.exists && String(entry.value) !== '0')
    }
  };
}

async function writeEntries(entries) {
  if (!entries?.length) return;
  const json = JSON.stringify(entries);
  await runPowerShell(
    `$entries = ConvertFrom-Json ${psQuote(json)}
foreach ($entry in @($entries)) {
  $path = [string]$entry.path
  $name = [string]$entry.name
  if (-not (Test-Path -LiteralPath $path)) { New-Item -Path $path -Force | Out-Null }
  if ($entry.exists) {
    $type = if ([string]$entry.type -eq 'String') { 'String' } else { 'DWord' }
    $value = if ($type -eq 'DWord') { [int]$entry.value } else { [string]$entry.value }
    New-ItemProperty -LiteralPath $path -Name $name -Value $value -PropertyType $type -Force | Out-Null
  } else {
    Remove-ItemProperty -LiteralPath $path -Name $name -ErrorAction SilentlyContinue
  }
}`,
    { timeout: 30000 }
  );
}

async function setGameDvr(enabled) {
  const value = enabled ? 1 : 0;
  await writeEntries(
    REGISTRY_ITEMS.filter((item) => item.group === 'gameDvr').map((item) => ({
      ...item,
      exists: true,
      value
    }))
  );
}

async function setVisualEffects(mode) {
  const value = mode === 'performance' ? 2 : 3;
  await writeEntries(
    REGISTRY_ITEMS.filter((item) => item.group === 'visualFx').map((item) => ({
      ...item,
      exists: true,
      value
    }))
  );
}

async function setMouseAcceleration(enabled) {
  const value = enabled ? '1' : '0';
  await writeEntries(
    REGISTRY_ITEMS.filter((item) => item.group === 'mouse').map((item) => ({
      ...item,
      exists: true,
      value
    }))
  );
}

async function setPowerPlan(kind) {
  const guid = kind === 'balanced' ? BALANCED_GUID : HIGH_PERFORMANCE_GUID;
  const alias = kind === 'balanced' ? 'SCHEME_BALANCED' : 'SCHEME_MIN';
  await runPowerShell(
    `$target = ${psQuote(guid)}
& powercfg /setactive $target 2>$null
if ($LASTEXITCODE -ne 0) { & powercfg /setactive ${alias} | Out-Null }
$active = (& powercfg /getactivescheme) -join ' '
$active`,
    { timeout: 20000 }
  );
}

function powerBackup(state) {
  return {
    guid: state.power?.guid || null,
    name: state.power?.name || null
  };
}

async function restorePower(power) {
  if (!power?.guid) return;
  await runPowerShell(
    `$target = ${psQuote(power.guid)}
& powercfg /setactive $target 2>$null
if ($LASTEXITCODE -ne 0) {
  & powercfg /setactive SCHEME_BALANCED 2>$null | Out-Null
}`,
    { timeout: 20000 }
  );
}

async function restoreEntries(entries) {
  await writeEntries(entries || []);
}

module.exports = {
  readState,
  setGameDvr,
  setVisualEffects,
  setMouseAcceleration,
  setPowerPlan,
  powerBackup,
  restorePower,
  restoreEntries,
  HIGH_PERFORMANCE_GUID,
  BALANCED_GUID
};
