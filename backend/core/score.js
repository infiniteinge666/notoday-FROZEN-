'use strict';

function bandFromScore(score) {
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

  // Authoritative absolute credential hit from intel semantics (category + weight)
  const absoluteCredentialHit =
    Array.isArray(evidence.textPatterns?.hits) &&
    evidence.textPatterns.hits.some(h =>
      String(h.category || '').toLowerCase() === 'credentials' && Number(h.weight || 0) >= 100
    );

  // HARD GATE
  if (knownBadHit || absoluteCredentialHit) {
    return {
      band: 'CRITICAL',
      score: 100,
      hits,
      reasons: []
        .concat(knownBadHit ? [`Known bad domain hit: ${evidence.knownBad.value}`] : [])
        .concat(absoluteCredentialHit ? ['Credential request detected (OTP / PIN / CVV / password).'] : [])
    };
  }

  const rawScore =
    (evidence.domainKeywords?.score || 0) +
    (evidence.textPatterns?.score || 0);

  const score = clamp0_100(rawScore);
  const band = bandFromScore(score);

  return {
    band,
    score,
    hits,
    reasons: []
      .concat(evidence.domainKeywords?.reasons || [])
      .concat(evidence.textPatterns?.reasons || [])
  };
}

module.exports = { scoreEvidence };
