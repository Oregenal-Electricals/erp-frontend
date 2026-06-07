const fs = require('fs');
const STATE_FILE = 'e2e/test-state.json';

function getState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch { return {}; }
}

function setState(updates) {
  const current = getState();
  const next = { ...current, ...updates };
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}

module.exports = { getState, setState };
