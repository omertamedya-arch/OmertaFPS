'use strict';

const store = require('../lib/store');
const activity = require('../lib/activity');
const { runPowerShell, runPowerShellJson, psQuote } = require('../lib/ps');

const META = require('../../shared/services.json');
const BACKUP_FILE = () => store.dataFile('service-backup.json');
const META_BY_ID = new Map(META.map((item) => [item.id, item]));

class ModuleError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || 'error';
  }
}

let chain = Promise.resolve();
function withLock(fn) {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

function serviceNames() {
  return META.filter((item) => item.kind === 'service').map((item) => item.id);
}

async function readServiceState() {
  const names = serviceNames();
  const list = names.map((name) => psQuote(name)).join(', ');
  const rows = await runPowerShellJson(
    `$names = @(${list})
Get-CimInstance Win32_Service -ErrorAction SilentlyContinue | Where-Object { $names -contains $_.Name } | Select-Object Name, DisplayName, State, StartMode`,
    { timeout: 30000 }
  );
  return new Map(rows.map((row) => [String(row.Name).toLowerCase(), row]));
}

async function readGameDvrState() {
  const rows = await runPowerShellJson(
    `$gameDvr = $null
$appCapture = $null
try { $gameDvr = (Get-ItemProperty -LiteralPath 'HKCU:\\System\\GameConfigStore' -Name 'GameDVR_Enabled' -ErrorAction Stop).GameDVR_Enabled } catch { }
try { $appCapture = (Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR' -Name 'AppCaptureEnabled' -ErrorAction Stop).AppCaptureEnabled } catch { }
[pscustomobject]@{ gameDvrEnabled = $gameDvr; appCaptureEnabled = $appCapture }`,
    { timeout: 20000 }
  );
  return rows[0] || {};
}

function gameDvrEnabled(state) {
  const known = [state.gameDvrEnabled, state.appCaptureEnabled].filter(
    (value) => value !== null && value !== undefined && value !== ''
  );
  if (known.length === 0) return true;
  return known.some((value) => Number(value) === 1);
}

async function list() {
  const [services, gameDvr] = await Promise.all([readServiceState(), readGameDvrState()]);

  return META.map((meta) => {
    if (meta.kind === 'service') {
      const row = services.get(meta.id.toLowerCase());
      return {
        ...meta,
        enabled: row ? row.StartMode !== 'Disabled' : false,
        running: row ? row.State === 'Running' : false,
        startMode: row ? row.StartMode : null,
        stateLabel: row ? (row.State === 'Running' ? 'Çalışıyor' : 'Durduruldu') : 'Bulunamadı',
        missing: !row
      };
    }

    const enabled = gameDvrEnabled(gameDvr);
    return {
      ...meta,
      enabled,
      running: enabled,
      startMode: enabled ? 'Etkin' : 'Devre dışı',
      stateLabel: enabled ? 'Etkin' : 'Devre dışı',
      missing: false
    };
  });
}

function getMeta(id) {
  const meta = META_BY_ID.get(id);
  if (!meta) throw new ModuleError('Bilinmeyen modül kimliği.', 'unknown-target');
  return meta;
}

async function readGameDvrBackupValues() {
  const rows = await runPowerShellJson(
    `$items = @(
  [pscustomobject]@{ path = 'HKCU:\\System\\GameConfigStore'; name = 'GameDVR_Enabled' },
  [pscustomobject]@{ path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR'; name = 'AppCaptureEnabled' }
)
foreach ($item in $items) {
  $exists = $false
  $value = $null
  try {
    $value = (Get-ItemProperty -LiteralPath $item.path -Name $item.name -ErrorAction Stop).$($item.name)
    $exists = $true
  } catch { }
  [pscustomobject]@{ path = $item.path; name = $item.name; exists = $exists; value = $value }
}`,
    { timeout: 20000 }
  );
  return rows;
}

async function applyService(meta, enabled, backup) {
  const name = psQuote(meta.id);

  if (enabled) {
    const original = backup && backup.startMode ? backup.startMode : 'Automatic';
    const target = original === 'Manual' ? 'Manual' : 'Automatic';
    await runPowerShell(
      `Set-Service -Name ${name} -StartupType ${target} -ErrorAction Stop
try { Start-Service -Name ${name} -ErrorAction Stop } catch { }`,
      { timeout: 60000 }
    );
    return { warning: null };
  }

  const output = await runPowerShell(
    `$service = Get-Service -Name ${name} -ErrorAction Stop
$stopError = $null
if ($service.Status -ne 'Stopped') {
  try { Stop-Service -Name ${name} -Force -ErrorAction Stop } catch { $stopError = $_.Exception.Message }
}
Set-Service -Name ${name} -StartupType Disabled -ErrorAction Stop
if ($stopError) { Write-Output ('WARN:' + $stopError) }`,
    { timeout: 90000 }
  );

  const warning = output.startsWith('WARN:')
    ? 'Hizmet devre dışı bırakıldı ancak çalışan süreç hemen durdurulamadı. Yeniden başlatmada tamamen kapanır.'
    : null;

  return { warning };
}

async function applyGameDvr(enabled) {
  const paths = [
    { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_Enabled' },
    { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR', name: 'AppCaptureEnabled' }
  ];

  const targetValue = enabled ? 1 : 0;
  const lines = paths.map(
    (item) => `New-Item -Path ${psQuote(item.path)} -Force | Out-Null
New-ItemProperty -LiteralPath ${psQuote(item.path)} -Name ${psQuote(item.name)} -Value ${targetValue} -PropertyType DWord -Force | Out-Null`
  );

  await runPowerShell(lines.join('\n'), { timeout: 20000 });
  return { warning: null };
}

async function set(id, enabled) {
  return withLock(async () => {
    const meta = getMeta(id);
    const wantEnabled = Boolean(enabled);
    const backups = store.readJson(BACKUP_FILE(), {});
    const live = (await list()).find((item) => item.id === id);

    if (!live || live.missing) {
      throw new ModuleError('Bu bileşen Windows sürümünüzde bulunamadı.', 'not-found');
    }

    if (!backups[id]) {
      if (meta.kind === 'service') {
        backups[id] = {
          kind: 'service',
          startMode: live.startMode,
          running: live.running,
          savedAt: new Date().toISOString()
        };
      } else {
        backups[id] = {
          kind: 'registry',
          values: await readGameDvrBackupValues(),
          savedAt: new Date().toISOString()
        };
      }
      store.writeJson(BACKUP_FILE(), backups);
    }

    let warning = null;
    if (meta.kind === 'service') {
      const result = await applyService(meta, wantEnabled, backups[id]);
      warning = result.warning;
    } else {
      const result = await applyGameDvr(wantEnabled);
      warning = result.warning;
    }

    activity.add({
      kind: 'service',
      title: `${meta.name}: ${wantEnabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`,
      detail: meta.tech,
      status: warning ? 'warning' : 'success'
    });

    const fresh = await list();
    const updated = fresh.find((item) => item.id === id);
    return { service: updated, warning };
  });
}

module.exports = {
  list,
  set
};
