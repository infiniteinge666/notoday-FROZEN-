'use strict';

/**
 * NoToday — engine.js (LOCKED SPINE)
 * Single deterministic scan pass:
 *  - normalize input
 *  - check known bad domains (absolute)
 *  - score domain keywords
 *  - score text patterns (including romance isolation)
 *  - combine via scoreEvidence
 */

const { normalize } = require('./normalize');
const {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
} = require('./match');
const { scoreEvidence } = require('./score');
const { buildWhatNotToDo, formatReasons } = require('./explain');

function scan(raw, intel, degraded = false) {
  const n = normalize(raw);
  const reasons = [];

  // 1) Known bad domain = absolute CRITICAL
  const badDomainHit = findKnownBadDomainHit(n.domains, intel);
  if (badDomainHit) {
    reasons.push(`Known bad domain detected: ${badDomainHit.value}`);
    return {
      band: 'CRITICAL',
      score: 100,
      reasons: formatReasons(reasons),
      whatNotToDo: buildWhatNotToDo('CRITICAL'),
      intelVersion: intel.version,
      degraded: !!degraded
    };
  }

  // 2) Domain keyword scoring (e.g. login, verify, secure)
  const domainRes = scoreDomainKeywords(n.domains, intel);
  if (domainRes.reasons.length) {
    reasons.push(...domainRes.reasons);
  }

  // 3) Text pattern scoring (romance, urgency, threats, etc.)
  const textRes = scoreTextPatterns(n.text, intel);
  if (textRes.reasons.length) {
    reasons.push(...textRes.reasons);
  }

  // 4) Combine evidence
  const { score, band } = scoreEvidence({
    absolute: textRes.absolute,          // credentials category → absolute
    knownBadDomain: false,               // already handled above
    keywordScore: domainRes.score,
    patternScore: textRes.score
  });

  if (!reasons.length) {
    reasons.push('No high-risk markers detected in the provided content.');
  }

  return {
    band,
    score,
    reasons: formatReasons(reasons),
    whatNotToDo: buildWhatNotToDo(band),
    intelVersion: intel.version,
    degraded: !!degraded
  };
}

module.exports = { scan };
