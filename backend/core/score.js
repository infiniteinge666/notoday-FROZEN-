'use strict';

// Map score to the 3-band system (requested).
function bandFromScore(score, isCritical) {
  if (isCritical) return 'CRITICAL';
  if (score >= 50) return 'SUSPICIOUS';
  return 'SAFE';
}

function clamp0_100(n) {
  const x = Number(n || 0);
  return Math.max(0, Math.min(100, x));
}

function scoreEvidence(evidence) {
  const hits = []
    .concat(evidence.domainKeywords?.hits || [])
    .concat(evidence.textPatterns?.hits || []);

  const knownBadHit = evidence.knownBad?.hit === true;
  const absoluteHit = evidence.textPatterns?.absoluteTriggered === true;

  // CRITICAL hard gate
  if (knownBadHit || absoluteHit) {
    return {
      band: 'CRITICAL',
      score: 100,
      hits,
      reasons: []
        .concat(knownBadHit ? [`Known bad domain hit: ${evidence.knownBad.value}`] : [])
        .concat(absoluteHit ? ['Absolute credential indicator hit (OTP/PIN/CVV/password/card details).'] : [])
    };
  }

  const raw = (evidence.domainKeywords?.score || 0) + (evidence.textPatterns?.score || 0);

  // Keep mid-zone meaningful but avoid “always 100” inflation.
  const score = clamp0_100(raw);

  const band = bandFromScore(score, false);

  return {
    band,
    score,
    hits,
    reasons: []
      .concat(evidence.domainKeywords?.reasons || [])
      .concat(evidence.textPatterns?.reasons || [])
  };
}

module.exports = {
  scoreEvidence
};
