'use strict';

const store = require('./store');
const activity = require('./activity');
const { runPowerShellJson, psQuote } = require('./ps');

const STATE_FILE = 'restore-state.json';

const REASON_LABELS = {
  frequency: 'Windows 24 saat içinde yalnızca bir geri yükleme noktası oluşturur.',
  disabled: 'Sistem koruması kapalı görünüyor. Windows Ayarları > Sistem > Sistem Koruması bölümünden açabilirsin.',
  timeout: 'Geri yükleme noktası zaman aşımına uğradı; profil işlemi geri yükleme noktası olmadan sürdü.',
  unsupported: 'Bu sistemde geri yükleme noktası oluşturulamıyor.',
  error: 'Geri yükleme noktası oluşturulamadı.'
};

function readState() {
  const state = store.readJson(store.dataFile(STATE_FILE), null);
  return state && typeof state === 'object' ? state : null;
}

async function create(reason = 'Manuel') {
  const description = `Omerta FPS - ${String(reason || 'Islem').slice(0, 90)}`;

  if (process.platform !== 'win32') {
    return { created: false, reason: 'unsupported', note: REASON_LABELS.unsupported, at: new Date().toISOString() };
  }

  let row = null;
  try {
    const rows = await runPowerShellJson(
      `$result = [pscustomobject]@{ created = $false; reason = ''; message = '' }
try {
  $vss = Get-Service -Name VSS -ErrorAction SilentlyContinue
  if ($vss -and $vss.Status -ne 'Running') {
    try { Start-Service -Name VSS -ErrorAction Stop } catch { }
  }
  $before = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue).Count
  Checkpoint-Computer -Description ${psQuote(description)} -RestorePointType 'MODIFY_SETTINGS' -ErrorAction Stop
  $after = @(Get-ComputerRestorePoint -ErrorAction SilentlyContinue).Count
  if ($after -gt $before) {
    $result.created = $true
  } else {
    $result.reason = 'frequency'
  }
} catch {
  $message = [string]$_.Exception.Message
  if ($message -match 'frequency|24') { $result.reason = 'frequency' }
  elseif ($message -match 'disabled|not enabled|protection|korum') { $result.reason = 'disabled' }
  else { $result.reason = 'error' }
  $result.message = $message
}
$result`,
      { timeout: 150000 }
    );
    row = rows?.[0] || null;
  } catch (error) {
    row = { created: false, reason: error.code === 'timeout' ? 'timeout' : 'error', message: error.message };
  }

  const entry = {
    at: new Date().toISOString(),
    description,
    created: Boolean(row?.created),
    reason: row?.created ? null : row?.reason || 'error',
    message: row?.message || null
  };
  entry.note = entry.created ? null : REASON_LABELS[entry.reason] || REASON_LABELS.error;

  try {
    store.writeJson(store.dataFile(STATE_FILE), entry);
  } catch {
    /* state file is informational only */
  }

  if (entry.created) {
    activity.add({
      kind: 'system',
      title: 'Geri yükleme noktası oluşturuldu',
      detail: description,
      status: 'success'
    });
  }

  return entry;
}

function status() {
  return {
    supported: process.platform === 'win32',
    last: readState()
  };
}

module.exports = { create, status, REASON_LABELS };
