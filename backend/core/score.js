'use strict';

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function bandFromScore(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 60) return 'SUSPICIOUS';
  if (score >= 30) return 'CAUTION';
  return 'SAFE';
}

function scoreEvidence({ absolute, knownBadDomain, keywordScore }) {
  if (absolute) return { score: 100, band: 'CRITICAL' };
  let score = 0;
  if (knownBadDomain) score = 100;
  else score = clamp(keywordScore, 0, 85);
  return { score, band: bandFromScore(score) };
}

module.exports = { scoreEvidence, bandFromScore };
