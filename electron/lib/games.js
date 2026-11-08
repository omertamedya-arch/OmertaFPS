'use strict';

const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const store = require('./store');

const WATCHER_FILE = 'omerta-gamewatch.ps1';

const WATCHER_SCRIPT = `param([int]$ParentPid)
$games = @('cs2', 'FiveM', 'GTA5')
$previous = ''
while ($true) {
  $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
  if (-not $parent) { break }
  $names = @()
  foreach ($name in $games) {
    $proc = Get-Process -Name $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) { $names += $name }
  }
  $state = (@($names | Sort-Object) -join ',')
  if ($state -ne $previous) {
    [Console]::Out.WriteLine('STATE|' + $state)
    [Console]::Out.Flush()
    $previous = $state
  }
  Start-Sleep -Seconds 3
}
`;

const GAME_LABELS = { cs2: 'Counter-Strike 2', FiveM: 'FiveM', GTA5: 'GTA V' };

class GameWatcher extends EventEmitter {
  constructor() {
    super();
    this.child = null;
    this.desired = false;
    this.running = [];
    this.restartTimer = null;
    this.scriptPath = null;
    this.buffer = '';
  }

  ensureScript() {
    if (this.scriptPath) return this.scriptPath;
    const file = store.dataFile(WATCHER_FILE);
    try {
      fs.writeFileSync(file, '\uFEFF' + WATCHER_SCRIPT, 'utf8');
    } catch {
      /* data dir was writable at boot; ignore transient failures */
    }
    this.scriptPath = file;
    return file;
  }

  label(name) {
    return GAME_LABELS[name] || name;
  }

  start() {
    this.desired = true;
    this.spawnChild();
  }

  spawnChild() {
    if (this.child || !this.desired) return;

    const script = this.ensureScript();
    const child = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        script,
        '-ParentPid',
        String(process.pid)
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    );

    this.child = child;
    this.buffer = '';

    child.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('STATE|')) this.handleState(line.slice(6));
      }
    });

    child.on('error', () => {
      this.child = null;
      this.scheduleRestart();
    });

    child.on('exit', () => {
      this.child = null;
      if (this.desired) this.scheduleRestart();
    });
  }

  scheduleRestart() {
    if (this.restartTimer || !this.desired) return;
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      this.spawnChild();
    }, 8000);
    if (this.restartTimer.unref) this.restartTimer.unref();
  }

  handleState(raw) {
    const next = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const previous = this.running;
    const started = next.filter((name) => !previous.includes(name));
    const stopped = previous.filter((name) => !next.includes(name));

    this.running = next;

    if (started.length || stopped.length) {
      this.emit('change', {
        running: [...next],
        started,
        stopped,
        startedLabels: started.map((name) => this.label(name)),
        stoppedLabels: stopped.map((name) => this.label(name))
      });
    }
  }

  getRunning() {
    return [...this.running];
  }

  isDesired() {
    return this.desired;
  }

  stop() {
    this.desired = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.child) {
      try {
        this.child.kill();
      } catch {
        /* already gone */
      }
      this.child = null;
    }
    this.running = [];
  }
}

module.exports = new GameWatcher();
module.exports.GAME_LABELS = GAME_LABELS;
