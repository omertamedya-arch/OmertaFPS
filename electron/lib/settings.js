'use strict';

const store = require('./store');

const FILE = () => store.dataFile('settings.json');

const PRESET_IDS = ['auto', 'fps', 'fivem', 'moba', 'story', 'sim'];
const CROSSHAIR_STYLES = ['cross', 'dot', 'circle', 'x'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

const OVERLAY_DEFAULTS = {
  displayId: 'primary',
  fps: { enabled: false, color: '#9FE8C8', opacity: 0.75, fontSize: 13 },
  crosshair: {
    enabled: false,
    style: 'cross',
    color: '#EAF6FF',
    opacity: 0.9,
    size: 10,
    thickness: 2,
    gap: 5,
    outline: true
  }
};

const DEFAULTS = {
  startWithWindows: false,
  restorePointBeforeApply: true,
  autoProfile: { enabled: false, presetId: 'auto' },
  overlay: OVERLAY_DEFAULTS
};

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function clampOpacity(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0.2, Math.round(number * 100) / 100));
}

function sanitizeColor(value, fallback) {
  const color = String(value || '').trim();
  return HEX_COLOR.test(color) ? color.toUpperCase() : fallback;
}

function sanitizeAuto(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled === true,
    presetId: PRESET_IDS.includes(input.presetId) ? input.presetId : 'auto'
  };
}

function sanitizeDisplay(value) {
  const raw = String(value ?? 'primary');
  if (raw === 'primary') return 'primary';
  return /^\d+$/.test(raw) ? raw : 'primary';
}

function sanitizeOverlay(value) {
  const input = value && typeof value === 'object' ? value : {};
  const fps = input.fps && typeof input.fps === 'object' ? input.fps : {};
  const crosshair = input.crosshair && typeof input.crosshair === 'object' ? input.crosshair : {};

  return {
    displayId: sanitizeDisplay(input.displayId),
    fps: {
      enabled: fps.enabled === true,
      color: sanitizeColor(fps.color, OVERLAY_DEFAULTS.fps.color),
      opacity: clampOpacity(fps.opacity, OVERLAY_DEFAULTS.fps.opacity),
      fontSize: clampNumber(fps.fontSize, 10, 20, OVERLAY_DEFAULTS.fps.fontSize)
    },
    crosshair: {
      enabled: crosshair.enabled === true,
      style: CROSSHAIR_STYLES.includes(crosshair.style) ? crosshair.style : OVERLAY_DEFAULTS.crosshair.style,
      color: sanitizeColor(crosshair.color, OVERLAY_DEFAULTS.crosshair.color),
      opacity: clampOpacity(crosshair.opacity, OVERLAY_DEFAULTS.crosshair.opacity),
      size: clampNumber(crosshair.size, 6, 40, OVERLAY_DEFAULTS.crosshair.size),
      thickness: clampNumber(crosshair.thickness, 1, 5, OVERLAY_DEFAULTS.crosshair.thickness),
      gap: clampNumber(crosshair.gap, 0, 20, OVERLAY_DEFAULTS.crosshair.gap),
      outline: crosshair.outline !== false
    }
  };
}

function sanitize(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    startWithWindows: input.startWithWindows === true,
    restorePointBeforeApply: input.restorePointBeforeApply !== false,
    autoProfile: sanitizeAuto(input.autoProfile),
    overlay: sanitizeOverlay(input.overlay)
  };
}

function get() {
  return sanitize(store.readJson(FILE(), null));
}

function update(patch) {
  const current = get();
  const input = patch && typeof patch === 'object' ? patch : {};
  const next = sanitize({ ...current, ...input });
  if (input.autoProfile && typeof input.autoProfile === 'object') {
    next.autoProfile = sanitizeAuto({ ...current.autoProfile, ...input.autoProfile });
  }
  if (input.overlay && typeof input.overlay === 'object') {
    next.overlay = sanitizeOverlay({
      ...current.overlay,
      ...input.overlay,
      fps: { ...current.overlay.fps, ...(input.overlay.fps || {}) },
      crosshair: { ...current.overlay.crosshair, ...(input.overlay.crosshair || {}) }
    });
  }
  store.writeJson(FILE(), next);
  return next;
}

module.exports = {
  get,
  update,
  sanitize,
  sanitizeAuto,
  sanitizeOverlay,
  DEFAULTS,
  PRESET_IDS,
  CROSSHAIR_STYLES,
  OVERLAY_DEFAULTS
};
