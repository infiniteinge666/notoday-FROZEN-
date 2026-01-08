'use strict';

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function isObj(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function isIntelEntry(x) {
  // Accept either string legacy OR object {value, category?, weight?}
  if (isNonEmptyString(x)) return true;
  if (!isObj(x)) return false;
  if (!isNonEmptyString(x.value)) return false;

  // category/weight are optional but if present, must be sane
  if ('category' in x && !isNonEmptyString(String(x.category))) return false;
  if ('weight' in x && Number.isNaN(Number(x.weight))) return false;

  return true;
}

function validateIntel(intel) {
  const errors = [];

  if (!isObj(intel)) return { ok: false, errors: ['intel root must be an object'] };
  if (!isNonEmptyString(intel.version)) errors.push('version must be a non-empty string');

  const requiredArrays = ['knownBadDomains', 'scamDomainKeywords', 'saOfficialDomains', 'scamPatterns'];
  for (const k of requiredArrays) {
    if (!Array.isArray(intel[k])) errors.push(`${k} must be an array`);
  }

  // knownBadDomains: string OR {value,...}
  for (const d of (intel.knownBadDomains || [])) {
    if (!isIntelEntry(d)) { errors.push('knownBadDomains contains invalid entry'); break; }
  }

  // scamDomainKeywords: must be objects with value+weight in your system
  for (const k of (intel.scamDomainKeywords || [])) {
    if (!isObj(k) || !isNonEmptyString(k.value)) { errors.push('scamDomainKeywords contains invalid entry'); break; }
    if (Number.isNaN(Number(k.weight))) { errors.push('scamDomainKeywords contains invalid weight'); break; }
  }

  // saOfficialDomains: string OR {value,...} (your v16 is objects)
  for (const o of (intel.saOfficialDomains || [])) {
    if (!isIntelEntry(o)) { errors.push('saOfficialDomains contains invalid entry'); break; }
  }

  // scamPatterns: string OR {value,...} (your v16 is objects)
  for (const p of (intel.scamPatterns || [])) {
    if (!isIntelEntry(p)) { errors.push('scamPatterns contains invalid entry'); break; }
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateIntel };
