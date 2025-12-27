'use strict';

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function bandFromScore(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 60) return 'SUSPICIOUS';
  if (score >= 30) return 'CAUTION';
  return 'SAFE';
}

/**
 * Inputs expected from engine:
 * {
 *   absolute: boolean,
 *   knownBadDomain: boolean,
 *   keywordScore: number,     // from domain keywords
 *   patternScore: number      // from text pattern hits
 * }
 */
function scoreEvidence({ absolute, knownBadDomain, keywordScore, patternScore }) {
  if (absolute) return { score: 100, band: 'CRITICAL' };
  if (knownBadDomain) return { score: 100, band: 'CRITICAL' };

  const k = Number(keywordScore || 0);
  const p = Number(patternScore || 0);

  // Combine (simple, deterministic)
  const score = clamp(k + p, 0, 85);
  return { score, band: bandFromScore(score) };
}

module.exports = { scoreEvidence, bandFromScore };
