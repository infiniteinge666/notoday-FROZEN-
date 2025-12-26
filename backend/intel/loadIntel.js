'use strict';

const fs = require('fs');
const { validateIntel } = require('./schema');

// Embedded failsafe — minimal absolutes so system can still protect users
function embeddedFailsafeIntel() {
  return {
    version: 'failsafe-v1',
    knownBadDomains: [],
    scamDomainKeywords: [],
    saOfficialDomains: [],
    scamPatterns: [
      { value: 'otp', category: 'credentialrequest', weight: 100, absolute: true, kind: 'keyword' },
      { value: 'one time password', category: 'credentialrequest', weight: 100, absolute: true, kind: 'keyword' },
      { value: 'pin', category: 'credentialrequest', weight: 100, absolute: true, kind: 'keyword' },
      { value: 'cvv', category: 'credentialrequest', weight: 100, absolute: true, kind: 'keyword' },
      { value: 'recovery fee', category: 'recoveryscam', weight: 100, absolute: true, kind: 'keyword' }
    ]
  };
}

function tryLoadJson(path) {
  const raw = fs.readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

/**
 * Loads intel from canonical path. If missing/invalid, uses embedded failsafe.
 * NEVER searches multiple locations.
 */
function loadIntelOrDie(intelPath) {
  let intel;
  let degraded = false;

  try {
    intel = tryLoadJson(intelPath);
    validateIntel(intel);
  } catch (e) {
    // degrade to embedded failsafe
    degraded = true;
    intel = embeddedFailsafeIntel();
    try {
      validateIntel(intel);
    } catch (e2) {
      // If this fails, something is very wrong; refuse to run.
      throw new Error(`Intel boot failed: ${String(e2.message || e2)}`);
    }
  }

  return { intel, degraded };
}

module.exports = { loadIntelOrDie };
