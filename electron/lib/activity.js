'use strict';

const crypto = require('node:crypto');
const store = require('./store');

const FILE = () => store.dataFile('activity.json');
const MAX_ITEMS = 80;

function list(limit = MAX_ITEMS) {
  const items = store.readJson(FILE(), []);
  if (!Array.isArray(items)) return [];
  return items.slice(0, limit);
}

function add(entry) {
  try {
    const item = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      kind: entry.kind || 'system',
      title: entry.title || 'İşlem',
      detail: entry.detail || '',
      status: entry.status || 'success'
    };
    const items = list(MAX_ITEMS);
    items.unshift(item);
    store.writeJson(FILE(), items.slice(0, MAX_ITEMS));
    return item;
  } catch {
    return null;
  }
}

function clear() {
  try {
    store.writeJson(FILE(), []);
    return true;
  } catch {
    return false;
  }
}

module.exports = { add, list, clear };
