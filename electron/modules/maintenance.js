'use strict';

const os = require('node:os');
const activity = require('../lib/activity');
const system = require('../lib/system');
const { runPowerShell, runPowerShellJson } = require('../lib/ps');

const TARGETS = [
  { id: 'userTemp', label: 'Kullanıcı Geçici Dosyaları' },
  { id: 'windowsTemp', label: 'Windows Geçici Dosyaları' },
  { id: 'prefetch', label: 'Prefetch Önbelleği' }
];
const TARGET_IDS = new Set(TARGETS.map((item) => item.id));

function megabytes(bytes) {
  return Math.round((Number(bytes) || 0) / (1024 * 1024));
}

async function readStandbyBytes() {
  try {
    const rows = await runPowerShellJson(
      `$memory = Get-CimInstance Win32_PerfRawData_PerfOS_Memory -ErrorAction SilentlyContinue
[pscustomobject]@{
  standby = [int64]$memory.StandbyCacheNormalPriorityBytes + [int64]$memory.StandbyCacheReserveBytes + [int64]$memory.StandbyCacheCoreBytes
  cache = [int64]$memory.CacheBytes
}`,
      { timeout: 30000 }
    );
    const standby = Number(rows[0]?.standby || 0);
    return Number.isFinite(standby) && standby >= 0 ? standby : null;
  } catch {
    return null;
  }
}

async function getStats(options = {}) {
  const includeStandby = options.standby !== false;
  const summary = await system.getSystemSummary();
  const total = os.totalmem();
  const available = os.freemem();

  const standbyBytes = includeStandby ? await readStandbyBytes() : null;

  return {
    memory: {
      total,
      available,
      used: Math.max(0, total - available),
      percent: total > 0 ? Math.min(100, Math.round(((total - available) / total) * 100)) : 0
    },
    standbyBytes,
    cpu: (os.cpus()[0]?.model || 'Bilinmeyen işlemci').replace(/\s+/g, ' ').trim(),
    cpuCores: os.cpus().length,
    uptime: os.uptime(),
    gpu: summary.gpuName,
    gpuDriver: summary.gpuDriver,
    osName: summary.osName,
    build: summary.build,
    hostname: summary.hostname,
    at: new Date().toISOString()
  };
}

async function scan() {
  const rows = await runPowerShellJson(
    `$targets = @(
  [pscustomobject]@{ id = 'userTemp'; path = $env:TEMP },
  [pscustomobject]@{ id = 'windowsTemp'; path = (Join-Path $env:SystemRoot 'Temp') },
  [pscustomobject]@{ id = 'prefetch'; path = (Join-Path $env:SystemRoot 'Prefetch') }
)
foreach ($target in $targets) {
  $size = 0
  $files = 0
  $exists = $false
  if ($target.path -and (Test-Path -LiteralPath $target.path)) {
    $exists = $true
    $sum = Get-ChildItem -LiteralPath $target.path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
    $size = [int64]$sum.Sum
    $files = [int]$sum.Count
  }
  [pscustomobject]@{
    id = $target.id
    path = [string]$target.path
    size = $size
    files = $files
    exists = $exists
  }
}`,
    { timeout: 180000 }
  );

  const byId = new Map(rows.map((row) => [row.id, row]));
  return TARGETS.map((target) => {
    const row = byId.get(target.id) || {};
    return {
      ...target,
      path: row.path || '',
      size: Number(row.size || 0),
      files: Number(row.files || 0),
      exists: Boolean(row.exists)
    };
  });
}

async function clean(ids) {
  const requested = Array.isArray(ids) ? ids.filter((id) => TARGET_IDS.has(id)) : [];
  const targets = requested.length ? requested : TARGETS.map((item) => item.id);
  const idList = targets.map((id) => `'${id}'`).join(', ');

  const rows = await runPowerShellJson(
    `$map = @{
  userTemp = $env:TEMP
  windowsTemp = (Join-Path $env:SystemRoot 'Temp')
  prefetch = (Join-Path $env:SystemRoot 'Prefetch')
}
$results = @()
foreach ($id in @(${idList})) {
  $path = $map[$id]
  $before = 0
  $after = 0
  $exists = $false
  if ($path -and (Test-Path -LiteralPath $path)) {
    $exists = $true
    $sum = Get-ChildItem -LiteralPath $path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
    $before = [int64]$sum.Sum
    Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    $sumAfter = Get-ChildItem -LiteralPath $path -Recurse -Force -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum
    $after = [int64]$sumAfter.Sum
  }
  $results += [pscustomobject]@{
    id = $id
    path = [string]$path
    exists = $exists
    before = $before
    after = $after
    freed = [Math]::Max([int64]0, ($before - $after))
  }
}
$results`,
    { timeout: 240000 }
  );

  const byId = new Map(rows.map((row) => [row.id, row]));
  const results = TARGETS.map((target) => {
    const row = byId.get(target.id) || {};
    const wasRequested = targets.includes(target.id);
    return {
      ...target,
      freedBytes: wasRequested ? Number(row.freed || 0) : 0,
      beforeBytes: wasRequested ? Number(row.before || 0) : 0,
      afterBytes: wasRequested ? Number(row.after || 0) : 0,
      cleaned: wasRequested
    };
  });

  const freedBytes = results.reduce((total, item) => total + item.freedBytes, 0);

  if (freedBytes > 0) {
    activity.add({
      kind: 'cleanup',
      title: 'Geçici dosyalar temizlendi',
      detail: `${megabytes(freedBytes)} MB alan açıldı`,
      status: 'success'
    });
  }

  return { results, freedBytes, freedMb: megabytes(freedBytes) };
}

async function purgeStandby() {
  const standbyBefore = await readStandbyBytes();
  const before = os.freemem();

  const output = await runPowerShell(
    `if (-not ('NitroMem' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class NitroMem
{
    [DllImport("ntdll.dll")]
    public static extern int NtSetSystemInformation(int InfoClass, IntPtr Info, int Length);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool OpenProcessToken(IntPtr ProcessHandle, uint DesiredAccess, out IntPtr TokenHandle);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool LookupPrivilegeValue(string SystemName, string Name, out long Luid);

    [DllImport("advapi32.dll", SetLastError = true)]
    public static extern bool AdjustTokenPrivileges(IntPtr TokenHandle, bool DisableAllPrivileges, ref TokenPrivileges NewState, int BufferLength, IntPtr PreviousState, IntPtr ReturnLength);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetCurrentProcess();

    [DllImport("kernel32.dll")]
    public static extern bool CloseHandle(IntPtr Handle);

    [StructLayout(LayoutKind.Sequential, Pack = 4)]
    public struct TokenPrivileges
    {
        public int Count;
        public long Luid;
        public int Attributes;
    }

    public static bool Purge()
    {
        IntPtr token;
        if (!OpenProcessToken(GetCurrentProcess(), 0x0028, out token)) return false;

        long luid;
        if (!LookupPrivilegeValue(null, "SeProfileSingleProcessPrivilege", out luid))
        {
            CloseHandle(token);
            return false;
        }

        TokenPrivileges privileges = new TokenPrivileges();
        privileges.Count = 1;
        privileges.Luid = luid;
        privileges.Attributes = 0x00000002;

        if (!AdjustTokenPrivileges(token, false, ref privileges, 0, IntPtr.Zero, IntPtr.Zero))
        {
            CloseHandle(token);
            return false;
        }

        CloseHandle(token);

        IntPtr info = Marshal.AllocHGlobal(sizeof(int));
        Marshal.WriteInt32(info, 4);
        int status = NtSetSystemInformation(0x50, info, sizeof(int));
        Marshal.FreeHGlobal(info);
        return status == 0;
    }
}
'@
}
$purged = [NitroMem]::Purge()
Start-Sleep -Milliseconds 600
if ($purged) { 'True' } else { 'False' }`,
    { timeout: 60000 }
  );

  const after = os.freemem();
  const standbyAfter = await readStandbyBytes();
  const availableDelta = Math.max(0, after - before);
  const releasedBytes =
    standbyBefore !== null && standbyAfter !== null
      ? Math.max(0, standbyBefore - standbyAfter)
      : availableDelta;
  const purged = output.trim().toLowerCase() === 'true';

  if (releasedBytes > 0) {
    activity.add({
      kind: 'memory',
      title: 'Bekleyen bellek temizlendi',
      detail: `Yaklaşık ${megabytes(releasedBytes)} MB serbest bırakıldı`,
      status: 'success'
    });
  }

  return {
    purged,
    releasedBytes,
    releasedMb: megabytes(releasedBytes),
    availableDeltaBytes: availableDelta,
    standbyBefore,
    standbyAfter
  };
}

async function boost(onProgress = () => {}) {
  const startedAt = Date.now();

  onProgress({ step: 'cleanup', status: 'running' });
  const cleanup = await clean(['userTemp', 'windowsTemp', 'prefetch']);
  onProgress({ step: 'cleanup', status: 'done', freedBytes: cleanup.freedBytes });

  onProgress({ step: 'standby', status: 'running' });
  const purge = await purgeStandby();
  onProgress({ step: 'standby', status: 'done', releasedBytes: purge.releasedBytes });

  const stats = await getStats({ standby: false });

  activity.add({
    kind: 'boost',
    title: 'Sistem rahatlatıldı',
    detail: `${cleanup.freedMb} MB disk + ~${purge.releasedMb} MB RAM`,
    status: 'success'
  });

  return {
    cleanup,
    purge,
    stats,
    durationMs: Date.now() - startedAt
  };
}

module.exports = {
  getStats,
  scan,
  clean,
  purgeStandby,
  boost,
  megabytes
};
