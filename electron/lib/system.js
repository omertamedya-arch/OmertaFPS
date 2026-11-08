'use strict';

const crypto = require('node:crypto');
const os = require('node:os');
const { runPowerShell, runPowerShellJson } = require('./ps');

let adminCache = null;
let hwidCache = null;
let summaryCache = null;

const INVALID_HARDWARE = /^(|none|null|unknown|to be filled by o\.e\.m\.?|default string|oem|n\/a|0+|f+|-+)$/i;

function isUseful(value) {
  const text = String(value || '').trim();
  return text.length >= 4 && !INVALID_HARDWARE.test(text);
}

async function isAdmin(force = false) {
  if (adminCache !== null && !force) return adminCache;
  try {
    const output = await runPowerShell(
      '[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent() | ForEach-Object { $_.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }',
      { timeout: 15000 }
    );
    adminCache = output.trim().toLowerCase() === 'true';
  } catch {
    adminCache = false;
  }
  return adminCache;
}

async function getHwid(force = false) {
  if (hwidCache && !force) return hwidCache;

  let raw = {};
  try {
    const rows = await runPowerShellJson(
      `$board = (Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue).SerialNumber
$uuid = (Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID
$cpu = (Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1).ProcessorId
$nics = Get-CimInstance Win32_NetworkAdapter -Filter "PhysicalAdapter=True" -ErrorAction SilentlyContinue | Where-Object { $_.MACAddress } | Sort-Object Index
$mac = ($nics | Select-Object -First 1).MACAddress
[pscustomobject]@{
  board = [string]$board
  uuid = [string]$uuid
  cpu = [string]$cpu
  mac = [string]$mac
}`,
      { timeout: 30000 }
    );
    raw = rows[0] || {};
  } catch {
    raw = { board: '', uuid: '', cpu: '', mac: os.hostname() };
  }

  const parts = [];
  if (isUseful(raw.board)) parts.push(`B:${raw.board.trim().toUpperCase()}`);
  if (isUseful(raw.uuid)) parts.push(`U:${raw.uuid.trim().toUpperCase()}`);
  if (parts.length < 2 && isUseful(raw.cpu)) parts.push(`C:${raw.cpu.trim().toUpperCase()}`);
  if (parts.length < 2 && isUseful(raw.mac)) parts.push(`M:${raw.mac.trim().toUpperCase()}`);
  if (parts.length === 0) parts.push(`H:${os.hostname().toUpperCase()}`);

  const digest = crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16).toUpperCase();
  hwidCache = digest.match(/.{4}/g).join('-');
  return hwidCache;
}

async function getSystemSummary(force = false) {
  const fresh = summaryCache && Date.now() - summaryCache.at < 60000;
  if (fresh && !force) return summaryCache.data;

  let data = {
    osName: `Windows ${os.release()}`,
    build: os.release(),
    gpuName: 'Algılanamadı',
    gpuDriver: null,
    hostname: os.hostname()
  };

  try {
    const rows = await runPowerShellJson(
      `$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$gpu = Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Sort-Object { if ($_.Name -match 'NVIDIA') { 0 } elseif ($_.Name -match 'AMD|Radeon') { 1 } else { 2 } } | Select-Object -First 1
[pscustomobject]@{
  osName = [string]$os.Caption
  build = [string]$os.BuildNumber
  version = [string]$os.Version
  gpuName = [string]$gpu.Name
  gpuDriver = [string]$gpu.DriverVersion
}`,
      { timeout: 30000 }
    );
    const row = rows[0];
    if (row) {
      data = {
        osName: row.osName || data.osName,
        build: row.build || data.build,
        version: row.version || null,
        gpuName: row.gpuName || data.gpuName,
        gpuDriver: row.gpuDriver || null,
        hostname: os.hostname()
      };
    }
  } catch {
    /* keep fallback */
  }

  summaryCache = { at: Date.now(), data };
  return data;
}

module.exports = {
  isAdmin,
  getHwid,
  getSystemSummary
};
