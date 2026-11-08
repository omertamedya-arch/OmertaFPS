'use strict';

const GAME_PRESET = {
  cs2: 'fps',
  fivem: 'fivem',
  gta5: 'story'
};

const GAME_LABELS = {
  cs2: 'Counter-Strike 2',
  fivem: 'FiveM',
  gta5: 'GTA V'
};

function resolvePreset(autoProfile, running = []) {
  if (!autoProfile?.enabled) return null;

  const fixed = String(autoProfile.presetId || 'auto');
  if (fixed !== 'auto') return fixed;

  for (const name of running) {
    const key = String(name || '').toLowerCase();
    if (GAME_PRESET[key]) return GAME_PRESET[key];
  }
  return null;
}

function describe(autoProfile) {
  if (!autoProfile?.enabled) return null;
  if (autoProfile.presetId && autoProfile.presetId !== 'auto') return String(autoProfile.presetId);
  return 'auto';
}

module.exports = { GAME_PRESET, GAME_LABELS, resolvePreset, describe };
