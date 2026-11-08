'use strict';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CENTER = 160;
const svg = document.getElementById('crosshair');

const config = {
  style: 'cross',
  color: '#EAF6FF',
  opacity: 0.9,
  size: 10,
  thickness: 2,
  gap: 5,
  outline: true
};

function makeLine(x1, y1, x2, y2, stroke, width) {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', stroke);
  line.setAttribute('stroke-width', width);
  line.setAttribute('stroke-linecap', 'round');
  return line;
}

function makeCircle(radius, stroke, width, filled) {
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', CENTER);
  circle.setAttribute('cy', CENTER);
  circle.setAttribute('r', radius);
  if (filled) {
    circle.setAttribute('fill', stroke);
  } else {
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', stroke);
    circle.setAttribute('stroke-width', width);
  }
  return circle;
}

function buildGroup(isOutline) {
  const group = document.createElementNS(SVG_NS, 'g');
  const stroke = isOutline ? 'rgba(0,0,0,0.55)' : config.color;
  const width = isOutline ? config.thickness + 2 : config.thickness;
  const size = config.size;
  const gap = config.gap;

  if (config.style === 'dot') {
    group.appendChild(makeCircle(Math.max(2, config.thickness), stroke, width, true));
    return group;
  }

  if (config.style === 'circle') {
    group.appendChild(makeCircle(size, stroke, width, false));
    return group;
  }

  if (config.style === 'x') {
    group.setAttribute('transform', `rotate(45 ${CENTER} ${CENTER})`);
  }

  group.appendChild(makeLine(CENTER - gap - size, CENTER, CENTER - gap, CENTER, stroke, width));
  group.appendChild(makeLine(CENTER + gap, CENTER, CENTER + gap + size, CENTER, stroke, width));
  group.appendChild(makeLine(CENTER, CENTER - gap - size, CENTER, CENTER - gap, stroke, width));
  group.appendChild(makeLine(CENTER, CENTER + gap, CENTER, CENTER + gap + size, stroke, width));

  return group;
}

function render() {
  svg.textContent = '';
  svg.style.setProperty('--opacity', String(config.opacity));
  if (config.outline) svg.appendChild(buildGroup(true));
  svg.appendChild(buildGroup(false));
}

function applyConfig(next) {
  if (!next) return;
  config.style = ['cross', 'dot', 'circle', 'x'].includes(next.style) ? next.style : 'cross';
  config.color = typeof next.color === 'string' ? next.color : config.color;
  config.opacity = typeof next.opacity === 'number' ? next.opacity : config.opacity;
  config.size = Number(next.size) || config.size;
  config.thickness = Number(next.thickness) || config.thickness;
  config.gap = Number.isFinite(Number(next.gap)) ? Number(next.gap) : config.gap;
  config.outline = next.outline !== false;
  render();
}

if (window.overlay && typeof window.overlay.onConfig === 'function') {
  window.overlay.onConfig(applyConfig);
}

render();
