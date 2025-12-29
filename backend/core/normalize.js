'use strict';

// Normalize input deterministically (no guessing, no learning).
// Goal: reduce trivial evasion (spacing, smart quotes) while staying conservative.

function normalizeText(raw) {
  const s = String(raw || '');

  // Unicode-ish cleanup (smart quotes, odd dashes)
  const cleaned = s
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u00A0/g, ' ');

  return cleaned
    .trim()
    .toLowerCase()
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function extractDomainCandidates(text) {
  const t = normalizeText(text);

  // Pull anything that looks like a domain or URL host
  const matches = t.match(/([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?/g) || [];
  return matches.map(m => m.split('/')[0]).slice(0, 20);
}

module.exports = {
  normalizeText,
  extractDomainCandidates
};
