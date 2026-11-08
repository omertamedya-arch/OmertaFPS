'use strict';

const { runPowerShell, runPowerShellJson, psQuote } = require('../lib/ps');
const store = require('../lib/store');
const activity = require('../lib/activity');

const BACKUP_FILE = 'network-backup.json';
const INTERFACE_ROOT = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces';

const GUID_PATTERN = /^\{?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}?$/;

function assertGuid(guid) {
  if (!GUID_PATTERN.test(String(guid || ''))) {
    const error = new Error('Geçersiz ağ arayüzü kimliği.');
    error.code = 'invalid';
    throw error;
  }
}

async function readInterfaces() {
  const script = `
$adapters = @(Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' })
if ($adapters.Count -eq 0) {
  $adapters = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 4)
}
foreach ($adapter in $adapters) {
  $key = '${INTERFACE_ROOT}\\' + $adapter.InterfaceGuid
  $values = $null
  if (Test-Path $key) {
    $values = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
  }
  $tcpNoDelay = $null
  $tcpAckFrequency = $null
  $tcpDelAckTicks = $null
  if ($values) {
    if ($null -ne $values.TCPNoDelay) { $tcpNoDelay = [int]$values.TCPNoDelay }
    if ($null -ne $values.TcpAckFrequency) { $tcpAckFrequency = [int]$values.TcpAckFrequency }
    if ($null -ne $values.TcpDelAckTicks) { $tcpDelAckTicks = [int]$values.TcpDelAckTicks }
  }
  $tuned = ($tcpNoDelay -eq 1 -and $tcpAckFrequency -eq 1)
  [pscustomobject]@{
    name = [string]$adapter.Name
    guid = [string]$adapter.InterfaceGuid
    description = [string]$adapter.InterfaceDescription
    status = [string]$adapter.Status
    linkSpeed = [string]$adapter.LinkSpeed
    tcpNoDelay = $tcpNoDelay
    tcpAckFrequency = $tcpAckFrequency
    tcpDelAckTicks = $tcpDelAckTicks
    tuned = $tuned
  }
}
`;

  const rows = await runPowerShellJson(script, { timeout: 30000 });
  return rows
    .filter((row) => row && row.guid)
    .map((row) => ({
      name: row.name || 'Ağ arayüzü',
      guid: row.guid,
      description: row.description || '',
      status: row.status || 'Unknown',
      linkSpeed: row.linkSpeed || '',
      tcpNoDelay: row.tcpNoDelay ?? null,
      tcpAckFrequency: row.tcpAckFrequency ?? null,
      tcpDelAckTicks: row.tcpDelAckTicks ?? null,
      tuned: Boolean(row.tuned)
    }));
}

function readBackup() {
  const data = store.readJson(store.dataFile(BACKUP_FILE), null);
  if (!data || !Array.isArray(data.interfaces)) return null;
  return data;
}

async function status() {
  const interfaces = await readInterfaces();
  const backup = readBackup();

  return {
    interfaces,
    active: interfaces.some((item) => item.tuned),
    tunedCount: interfaces.filter((item) => item.tuned).length,
    backup: backup
      ? {
          createdAt: backup.createdAt,
          count: backup.interfaces.length,
          names: backup.interfaces.map((item) => item.name).filter(Boolean)
        }
      : null,
    requiresRestart: true
  };
}

async function apply(guids) {
  const interfaces = await readInterfaces();
  if (!interfaces.length) {
    const error = new Error('Etkin ağ arayüzü bulunamadı.');
    error.code = 'not-found';
    throw error;
  }

  const selected = Array.isArray(guids) && guids.length ? guids.map(String) : interfaces.map((item) => item.guid);
  selected.forEach(assertGuid);

  const targets = interfaces.filter((item) => selected.includes(item.guid));
  if (!targets.length) {
    const error = new Error('Seçilen ağ arayüzü etkin değil.');
    error.code = 'not-found';
    throw error;
  }

  if (!readBackup()) {
    store.writeJson(store.dataFile(BACKUP_FILE), {
      createdAt: new Date().toISOString(),
      interfaces: interfaces.map((item) => ({
        guid: item.guid,
        name: item.name,
        tcpNoDelay: item.tcpNoDelay,
        tcpAckFrequency: item.tcpAckFrequency,
        tcpDelAckTicks: item.tcpDelAckTicks
      }))
    });
  }

  const guidList = targets.map((item) => psQuote(item.guid)).join(', ');
  const script = `
$guids = @(${guidList})
foreach ($guid in $guids) {
  $key = '${INTERFACE_ROOT}\\' + $guid
  if (-not (Test-Path $key)) {
    New-Item -Path $key -Force | Out-Null
  }
  New-ItemProperty -Path $key -Name 'TCPNoDelay' -PropertyType DWord -Value 1 -Force | Out-Null
  New-ItemProperty -Path $key -Name 'TcpAckFrequency' -PropertyType DWord -Value 1 -Force | Out-Null
  New-ItemProperty -Path $key -Name 'TcpDelAckTicks' -PropertyType DWord -Value 0 -Force | Out-Null
}
`;

  await runPowerShell(script, { timeout: 30000 });

  activity.add({
    kind: 'network',
    title: 'Nagle algoritması devre dışı bırakıldı',
    detail: targets.map((item) => item.name).join(', ')
  });

  return {
    ...(await status()),
    applied: targets.map((item) => item.name),
    requiresRestart: true
  };
}

async function revert() {
  const backup = readBackup();
  if (!backup) {
    const error = new Error('Geri alınacak ağ yedeği bulunamadı.');
    error.code = 'not-found';
    throw error;
  }

  const entries = backup.interfaces.filter((item) => GUID_PATTERN.test(String(item.guid || '')));
  const lines = entries.map((item) => {
    const key = `${INTERFACE_ROOT}\\${item.guid}`;
    const restore = [
      ['TCPNoDelay', item.tcpNoDelay],
      ['TcpAckFrequency', item.tcpAckFrequency],
      ['TcpDelAckTicks', item.tcpDelAckTicks]
    ]
      .map(([name, value]) =>
        value === null || value === undefined
          ? `Remove-ItemProperty -Path $key -Name '${name}' -ErrorAction SilentlyContinue`
          : `New-ItemProperty -Path $key -Name '${name}' -PropertyType DWord -Value ${Number(value)} -Force | Out-Null`
      )
      .join('\n  ');

    return `$key = '${key}'\nif (Test-Path $key) {\n  ${restore}\n}`;
  });

  if (lines.length) {
    await runPowerShell(lines.join('\n'), { timeout: 30000 });
  }

  store.removeFile(store.dataFile(BACKUP_FILE));

  activity.add({
    kind: 'network',
    title: 'Ağ ayarları geri alındı',
    detail: 'Özgün TCP değerleri geri yüklendi',
    status: 'info'
  });

  return { ...(await status()), requiresRestart: true };
}

async function flushDns() {
  await runPowerShell('ipconfig /flushdns | Out-Null', { timeout: 20000 });
  activity.add({ kind: 'network', title: 'DNS önbelleği temizlendi', detail: 'ipconfig /flushdns' });
  return { flushed: true };
}

async function ping() {
  const script = `
$targets = @('1.1.1.1', '8.8.8.8')
$gateway = $null
try {
  $config = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
    Select-Object -First 1
  if ($config) { $gateway = [string]$config.IPv4DefaultGateway.NextHop }
} catch { $gateway = $null }
if ($gateway) { $targets = @($gateway) + $targets }

$pingClient = New-Object System.Net.NetworkInformation.Ping
foreach ($target in $targets) {
  $times = @()
  $lost = 0
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $reply = $pingClient.Send($target, 1200)
      if ($reply.Status -eq 'Success') { $times += [int]$reply.RoundtripTime } else { $lost++ }
    } catch {
      $lost++
    }
  }
  $sent = 5
  $received = $times.Count
  $avg = $null
  $min = $null
  $max = $null
  $jitter = $null
  $label = [string]$target
  if ($gateway -and $target -eq $gateway) { $label = 'Yerel ağ geçidi' }
  if ($received -gt 0) {
    $measure = $times | Measure-Object -Average -Minimum -Maximum
    $avg = [math]::Round($measure.Average)
    $min = [int]$measure.Minimum
    $max = [int]$measure.Maximum
    if ($received -gt 1) {
      $sorted = @($times | Sort-Object)
      $spread = 0
      for ($j = 1; $j -lt $sorted.Count; $j++) { $spread += [math]::Abs($sorted[$j] - $sorted[$j - 1]) }
      $jitter = [math]::Round($spread / ($sorted.Count - 1))
    } else {
      $jitter = 0
    }
  }
  [pscustomobject]@{
    target = $target
    label = $label
    sent = $sent
    received = $received
    lost = $lost
    lossPercent = [math]::Round(($lost / $sent) * 100)
    avgMs = $avg
    minMs = $min
    maxMs = $max
    jitterMs = $jitter
  }
}
`;

  const rows = await runPowerShellJson(script, { timeout: 60000 });
  const results = rows
    .filter((row) => row && row.target)
    .map((row) => ({
      target: row.target,
      label: row.label || row.target,
      sent: Number(row.sent) || 5,
      received: Number(row.received) || 0,
      lost: Number(row.lost) || 0,
      lossPercent: Number(row.lossPercent) || 0,
      avgMs: row.avgMs ?? null,
      minMs: row.minMs ?? null,
      maxMs: row.maxMs ?? null,
      jitterMs: row.jitterMs ?? null
    }));

  const primary = results.find((row) => row.label !== 'Yerel ağ geçidi') || results[0] || null;
  let grade = 'unknown';
  if (primary && primary.avgMs !== null) {
    if (primary.lossPercent > 0) grade = 'loss';
    else if (primary.avgMs <= 25) grade = 'excellent';
    else if (primary.avgMs <= 50) grade = 'good';
    else if (primary.avgMs <= 90) grade = 'fair';
    else grade = 'poor';
  }

  return { results, primary: primary?.target || null, grade, measuredAt: new Date().toISOString() };
}

module.exports = { status, apply, revert, flushDns, ping };
