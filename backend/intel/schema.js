'use strict';

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0;
}

function isObj(x) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

function validateIntel(intel) {
  const errors = [];

  if (!isObj(intel)) return { ok: false, errors: ['intel root must be an object'] };
  if (!isNonEmptyString(intel.version)) errors.push('version must be a non-empty string');

  const requiredArrays = ['knownBadDomains', 'scamDomainKeywords', 'saOfficialDomains', 'scamPatterns'];
  for (const k of requiredArrays) {
    if (!Array.isArray(intel[k])) errors.push(`${k} must be an array`);
  }

  for (const d of (intel.knownBadDomains || [])) {
    if (!isNonEmptyString(d)) { errors.push('knownBadDomains contains invalid entry'); break; }
  }

  for (const k of (intel.scamDomainKeywords || [])) {
    if (isNonEmptyString(k)) continue;
    if (isObj(k) && isNonEmptyString(k.value)) continue;
    errors.push('scamDomainKeywords contains invalid entry');
    break;
  }

  for (const b of (intel.saOfficialDomains || [])) {
    if (!isObj(b) || !isNonEmptyString(b.brand) || !Array.isArray(b.domains)) {
      errors.push('saOfficialDomains contains invalid entry');
      break;
    }
    for (const d of b.domains) {
      if (!isNonEmptyString(d)) { errors.push('saOfficialDomains contains invalid domain'); break; }
    }
  }

  for (const p of (intel.scamPatterns || [])) {
    if (isNonEmptyString(p)) continue;
    if (isObj(p) && isNonEmptyString(p.value)) continue;
    errors.push('scamPatterns contains invalid entry');
    break;
  }

  return { ok: errors.length === 0, errors };
}

module.exports = { validateIntel };
