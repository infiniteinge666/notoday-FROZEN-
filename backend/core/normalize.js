'use strict';

function normalizeRaw(raw) {
  let s = String(raw || '');

  // Normalize whitespace
  s = s.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  s = s.replace(/[ ]{2,}/g, ' ').trim();

  // Normalize smart quotes
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return s;
}

module.exports = { normalizeRaw };
