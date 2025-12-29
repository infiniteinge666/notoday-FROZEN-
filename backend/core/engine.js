'use strict';

const { scoreEvidence } = require('./score');
const { buildExplanation } = require('./explain');
const { findKnownBadDomainHit, scoreDomainKeywords, scoreTextPatterns } = require('./match');

function runCheck(raw, intel) {
  const evidence = {
    knownBad: findKnownBadDomainHit(raw, intel),
    domainKeywords: scoreDomainKeywords(raw, intel),
    textPatterns: scoreTextPatterns(raw, intel)
  };

  const scored = scoreEvidence(evidence);
  const explained = buildExplanation(scored, intel.version);

  return explained;
}

module.exports = {
  runCheck
};
