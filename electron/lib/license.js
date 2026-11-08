'use strict';

const path = require('node:path');
const store = require('./store');
const activity = require('./activity');
const { getHwid } = require('./system');
const { runPowerShell, runPowerShellJson, psQuote } = require('./ps');
const core = require('./license-core');

const DB_FILE = () => store.dataFile('license-db.json');
const SESSION_FILE = () => store.userFile('session.json');

function fail(code, message) {
  return { ok: false, code, error: message };
}

function publicLicense(entry, key) {
  return {
    key: core.maskKey(key),
    hwid: entry.hwid,
    activatedAt: entry.activatedAt,
    status: entry.status || 'active'
  };
}

async function loadTemplate() {
  const hashesPath = path.join(store.getAppPath(), 'licenses.hashes.json');
  const plainPath = path.join(store.getAppPath(), 'licenses.json');

  const hashed = store.readJson(hashesPath, null);
  if (hashed && Array.isArray(hashed.keys)) return hashed;

  const plain = store.readJson(plainPath, null);
  if (plain && Array.isArray(plain.keys)) {
    return {
      product: plain.product || 'Omerta FPS',
      version: plain.version || 1,
      generatedAt: plain.generatedAt || null,
      keys: plain.keys
        .map((item) => ({
          keyHash: item.keyHash || core.hashKey(item.key),
          createdAt: item.createdAt || null
        }))
        .filter((item) => item.keyHash)
    };
  }

  return null;
}

async function ensureDatabase() {
  const template = await loadTemplate();
  if (!template) {
    return fail(
      'license-db-missing',
      'Lisans veritabanı bulunamadı. licenses.hashes.json dosyasını uygulama klasörüne ekleyin.'
    );
  }

  const existing = store.readJson(DB_FILE(), null);
  const db =
    existing && existing.keys && typeof existing.keys === 'object'
      ? existing
      : { product: 'Omerta FPS', version: 2, keys: {} };

  let changed = false;
  const now = new Date().toISOString();

  for (const item of template.keys) {
    const hash = item.keyHash || (item.key ? core.hashKey(item.key) : null);
    if (!hash) continue;
    if (!db.keys[hash]) {
      db.keys[hash] = {
        hwid: null,
        status: 'unused',
        activatedAt: null,
        createdAt: item.createdAt || now
      };
      changed = true;
    }
  }

  if (changed || !existing) {
    db.product = 'Omerta FPS';
    db.version = 2;
    db.updatedAt = now;
    store.writeJson(DB_FILE(), db);
  }

  return { ok: true, db };
}

async function readRegistryBindings() {
  try {
    const rows = await runPowerShellJson(
      `$path = 'HKLM:\\SOFTWARE\\OmertaFPS'
$value = $null
try { $value = (Get-ItemProperty -Path $path -Name 'Bindings' -ErrorAction Stop).Bindings } catch { }
if ([string]::IsNullOrWhiteSpace($value)) { [pscustomobject]@{ bindings = '{}' } } else { [pscustomobject]@{ bindings = [string]$value } }`,
      { timeout: 15000 }
    );
    const parsed = JSON.parse(rows[0]?.bindings || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return null;
  }
}

async function writeRegistryBindings(bindings, hash, hwid, activatedAt) {
  const json = JSON.stringify(bindings);
  await runPowerShell(
    `$path = 'HKLM:\\SOFTWARE\\OmertaFPS'
New-Item -Path $path -Force | Out-Null
Set-ItemProperty -Path $path -Name 'Bindings' -Value ${psQuote(json)} -Type String
Set-ItemProperty -Path $path -Name 'LastKeyHash' -Value ${psQuote(hash)} -Type String
Set-ItemProperty -Path $path -Name 'Hwid' -Value ${psQuote(hwid)} -Type String
Set-ItemProperty -Path $path -Name 'ActivatedAt' -Value ${psQuote(activatedAt)} -Type String`,
    { timeout: 20000 }
  );
}

async function activate(input) {
  if (!core.isValidFormat(input)) {
    return fail('format', 'Lisans anahtarı ABCD-1234-EFGH-5678 biçiminde olmalı.');
  }

  const ensured = await ensureDatabase();
  if (!ensured.ok) return ensured;

  const normalized = core.normalizeKey(input);
  const hash = core.hashKey(normalized);
  const entry = ensured.db.keys[hash];

  if (!entry) {
    return fail('invalid', 'Bu lisans anahtarı geçersiz. Anahtarı kontrol edip tekrar deneyin.');
  }

  const hwid = await getHwid();
  const registry = await readRegistryBindings();
  const remoteBinding = registry ? registry[hash] || null : null;

  if (core.bindingState(entry, remoteBinding, hwid) !== 'ok') {
    return fail(
      'already-used',
      'Bu lisans kodu tek kullanımlıktır ve daha önce başka bir bilgisayarda etkinleştirilmiş. Destek için satıcınıza başvurun.'
    );
  }

  const now = new Date().toISOString();
  entry.hwid = hwid;
  entry.status = 'active';
  entry.activatedAt = entry.activatedAt || now;
  ensured.db.keys[hash] = entry;
  ensured.db.updatedAt = now;
  store.writeJson(DB_FILE(), ensured.db);

  if (registry) {
    registry[hash] = hwid;
    try {
      await writeRegistryBindings(registry, hash, hwid, entry.activatedAt);
    } catch {
      /* Registry mirror is a hardening layer; activation still stands locally. */
    }
  }

  store.writeJson(SESSION_FILE(), {
    key: normalized,
    hwid,
    activatedAt: entry.activatedAt,
    savedAt: now
  });

  activity.add({
    kind: 'license',
    title: 'Lisans etkinleştirildi',
    detail: `Donanım: ${hwid}`,
    status: 'success'
  });

  return { ok: true, license: publicLicense(entry, normalized) };
}

async function getStatus() {
  const hwid = await getHwid();
  const ensured = await ensureDatabase();
  if (!ensured.ok) {
    return { ready: false, licensed: false, hwid, error: ensured.code };
  }

  const session = store.readJson(SESSION_FILE(), null);
  if (!session || !session.key) {
    return { ready: true, licensed: false, hwid, license: null };
  }

  const normalized = core.normalizeKey(session.key);
  const hash = core.hashKey(normalized);
  const entry = ensured.db.keys[hash];

  if (!entry || !entry.hwid) {
    return { ready: true, licensed: false, hwid, license: null };
  }

  if (entry.hwid !== hwid) {
    return {
      ready: true,
      licensed: false,
      hwid,
      license: null,
      error: 'hwid-changed'
    };
  }

  const registry = await readRegistryBindings();
  if (registry && registry[hash] && registry[hash] !== hwid) {
    return { ready: true, licensed: false, hwid, license: null, error: 'hwid-changed' };
  }

  return {
    ready: true,
    licensed: true,
    hwid,
    license: publicLicense(entry, normalized)
  };
}

function logout() {
  const removed = store.removeFile(SESSION_FILE());
  if (removed) {
    activity.add({
      kind: 'license',
      title: 'Lisans oturumu kilitlendi',
      detail: 'Anahtar donanıma bağlı kaldı.',
      status: 'info'
    });
  }
  return { ok: true };
}

module.exports = {
  activate,
  getStatus,
  logout,
  ensureDatabase
};
