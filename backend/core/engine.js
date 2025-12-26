'use strict';

const { normalize } = require('./normalize');
const { findAbsoluteHits, findKnownBadDomainHits, scoreDomainKeywords } = require('./match');
const { scoreEvidence } = require('./score');
const { buildWhatNotToDo, formatReasons } = require('./explain');

function scan(raw, intel, degraded=false) {
  const n = normalize(raw);
  const reasons = [];

  const absoluteHits = findAbsoluteHits(n.lower, intel);
  if (absoluteHits.length) {
    reasons.push('Absolute indicator detected: credential/request marker (e.g., OTP/PIN/CVV).');
    return {
      band: 'CRITICAL',
      score: 100,
      reasons: formatReasons(reasons),
      whatNotToDo: buildWhatNotToDo('CRITICAL'),
      intelVersion: intel.version,
      degraded: !!degraded
    };
  }

  const badDomainHits = findKnownBadDomainHits(n.domains, intel);
  if (badDomainHits.length) {
    reasons.push(`Known bad domain detected: ${badDomainHits[0].value}`);
  }

  const kw = scoreDomainKeywords(n.domains, intel);
  reasons.push(...kw.reasons);

  const { score, band } = scoreEvidence({
    absolute: false,
    knownBadDomain: badDomainHits.length > 0,
    keywordScore: kw.score
  });

  if (!reasons.length) reasons.push('No high-risk markers detected in the provided content.');

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
