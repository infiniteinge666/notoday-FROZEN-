'use strict';

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function validateArrayOfEntries(arr, name) {
  if (!Array.isArray(arr)) throw new Error(`${name}: must be an array`);
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (typeof e !== 'object' || e === null) throw new Error(`${name}: entry must be object @${i}`);
    if (!isNonEmptyString(e.value)) throw new Error(`${name}: entry.value required @${i}`);
    if (!isNonEmptyString(e.category)) throw new Error(`${name}: entry.category required @${i}`);
    if (e.weight !== undefined && typeof e.weight !== 'number') throw new Error(`${name}: entry.weight must be number @${i}`);
    if (e.absolute !== undefined && typeof e.absolute !== 'boolean') throw new Error(`${name}: entry.absolute must be boolean @${i}`);
    if (e.kind !== undefined && typeof e.kind !== 'string') throw new Error(`${name}: entry.kind must be string @${i}`);
  }
}

function validateIntel(intel) {
  if (typeof intel !== 'object' || intel === null) throw new Error('intel: must be object');
  if (!isNonEmptyString(intel.version)) throw new Error('intel.version: required');

  validateArrayOfEntries(intel.knownBadDomains || [], 'knownBadDomains');
  validateArrayOfEntries(intel.scamDomainKeywords || [], 'scamDomainKeywords');
  validateArrayOfEntries(intel.saOfficialDomains || [], 'saOfficialDomains');
  validateArrayOfEntries(intel.scamPatterns || [], 'scamPatterns');

  return true;
}

module.exports = { validateIntel };
