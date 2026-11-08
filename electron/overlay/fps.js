'use strict';

const valueEl = document.getElementById('value');

function applyConfig(config) {
  if (!config) return;
  const root = document.documentElement.style;
  root.setProperty('--color', config.color || '#9FE8C8');
  root.setProperty('--opacity', String(typeof config.opacity === 'number' ? config.opacity : 0.75));
  root.setProperty('--font-size', `${Number(config.fontSize) || 13}px`);
}

if (window.overlay && typeof window.overlay.onConfig === 'function') {
  window.overlay.onConfig(applyConfig);
}

let frames = 0;
let last = performance.now();
let shown = 0;

function tick(now) {
  frames += 1;
  const elapsed = now - last;
  if (elapsed >= 700) {
    const next = Math.round((frames * 1000) / elapsed);
    frames = 0;
    last = now;
    if (next !== shown) {
      shown = next;
      valueEl.textContent = String(next);
    }
  }
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
