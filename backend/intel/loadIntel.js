'use strict';

const fs = require('fs');
const { validateIntel } = require('./schema');

function loadIntel(intelPath) {
  let intel = null;
  let degraded = false;

  try {
    const raw = fs.readFileSync(intelPath, 'utf8');
    const parsed = JSON.parse(raw);

    const v = validateIntel(parsed);
    if (!v.ok) {
      degraded = true;
      intel = null;
    } else {
      intel = parsed;
    }
  } catch (e) {
    degraded = true;
    intel = null;
  }

  return { intelPath, intel, degraded };
}

module.exports = { loadIntel };
