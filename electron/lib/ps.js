'use strict';

const { execFile } = require('node:child_process');

const POWERSHELL = 'powershell.exe';
const JSON_MARKER = '__NT_JSON__';

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function cleanError(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^(At line:|At C:|CategoryInfo|FullyQualifiedErrorId|\+|Exception|MethodInvocationException|PositionMessage)/i.test(
          line
        )
    );
  return lines.slice(-4).join(' ').slice(0, 600) || 'PowerShell komutu başarısız oldu.';
}

function runPowerShell(script, options = {}) {
  const { timeout = 90000 } = options;
  const prelude = [
    "$ProgressPreference = 'SilentlyContinue'",
    "$ErrorActionPreference = 'Stop'",
    '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '$OutputEncoding = [System.Text.Encoding]::UTF8'
  ].join('; ');

  return new Promise((resolve, reject) => {
    execFile(
      POWERSHELL,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `${prelude}; ${script}`
      ],
      {
        windowsHide: true,
        timeout,
        maxBuffer: 32 * 1024 * 1024,
        encoding: 'utf8'
      },
      (error, stdout, stderr) => {
        if (error) {
          const wrapped = new Error(cleanError(stderr || error.message));
          wrapped.code = error.killed ? 'timeout' : 'powershell';
          return reject(wrapped);
        }
        resolve(String(stdout || '').replace(/^\uFEFF/, '').trim());
      }
    );
  });
}

async function runPowerShellJson(script, options = {}) {
  const wrapped = `$__nt = & { ${script}
}
$__json = ConvertTo-Json -InputObject @($__nt) -Depth 8 -Compress
Write-Output ("${JSON_MARKER}" + $__json)`;
  const output = await runPowerShell(wrapped, options);
  const index = output.indexOf(JSON_MARKER);
  if (index === -1) throw new Error('PowerShell çıktısı okunamadı.');
  const json = output.slice(index + JSON_MARKER.length).trim();
  if (!json) return [];
  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function psBool(value) {
  return String(value).trim().toLowerCase() === 'true';
}

module.exports = {
  psQuote,
  psBool,
  runPowerShell,
  runPowerShellJson
};
