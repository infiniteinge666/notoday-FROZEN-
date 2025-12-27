'use strict';

/**
 * NoToday — match.js (LOCKED BEHAVIOUR)
 * Matches v5 intel schema:
 * - knownBadDomains: [{ value, category, weight }]
 * - scamDomainKeywords: [{ value, category, weight }]
 * - scamPatterns: [{ value, category, weight }]
 *
 * Absolute rule:
 * - known bad domain => CRITICAL
 * - credential category hits => absolute => CRITICAL
 */

function safeStr(v) {
  return (v ?? '').toString();
}

// Must match normalize.js behaviour so phrases line up
function normalizeForMatch(s) {
  return safeStr(s)
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function domainEqualsOrSubdomain(domain, needle) {
  const d = safeStr(domain).toLowerCase();
  const n = safeStr(needle).toLowerCase();
  if (!d || !n) return false;
  return d === n || d.endsWith('.' + n);
}

function findKnownBadDomainHit(domains, intel) {
  const bads = intel.knownBadDomains || [];
  for (const dom of domains || []) {
    for (const b of bads) {
      if (domainEqualsOrSubdomain(dom, b.value)) {
        return b;
      }
    }
  }
  return null;
}

function scoreDomainKeywords(domains, intel) {
  const kws = intel.scamDomainKeywords || [];
  let score = 0;
  const reasons = [];

  for (const dom of domains || []) {
    const d = safeStr(dom).toLowerCase();
    if (!d) continue;

    for (const kw of kws) {
      const v = safeStr(kw.value).toLowerCase();
      if (!v) continue;

      if (d.includes(v)) {
        const w = Number(kw.weight || 0);
        score += w;
        reasons.push(`Domain contains scam keyword: "${v}" (+${w})`);
      }
    }
  }

  return { score, reasons };
}

function findPatternHits(text, intel) {
  const patterns = intel.scamPatterns || [];
  const hits = [];

  // text here should already be normalized by normalize.js, but normalize again
  // to be robust if something calls this directly.
  const t = normalizeForMatch(text);

  for (const p of patterns) {
    const v = normalizeForMatch(p.value);
    if (!v) continue;

    if (t.includes(v)) {
      hits.push(p);
    }
  }

  return hits;
}

function scoreTextPatterns(text, intel) {
  const hits = findPatternHits(text, intel);
  let absolute = false;
  let score = 0;
  const reasons = [];

  for (const h of hits) {
    const cat = safeStr(h.category).toLowerCase();
    const w = Number(h.weight || 0);

    // Credential category = absolute indicator
    if (cat === 'credentials') absolute = true;

    score += w;
    reasons.push(`Matched "${safeStr(h.value)}" [${cat}] (+${w})`);
  }

  return { absolute, score, reasons, hitsCount: hits.length };
}

module.exports = {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};
