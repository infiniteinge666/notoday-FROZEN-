'use strict';

function includesKeyword(lowerText, keyword) {
  return lowerText.includes(keyword.toLowerCase());
}

function findAbsoluteHits(lowerText, intel) {
  const hits = [];
  for (const p of (intel.scamPatterns || [])) {
    if (p.absolute === true && p.kind === 'keyword' && typeof p.value === 'string') {
      if (includesKeyword(lowerText, p.value)) hits.push(p);
    }
  }
  return hits;
}

function findKnownBadDomainHits(domains, intel) {
  const set = new Set(domains);
  const hits = [];
  for (const d of (intel.knownBadDomains || [])) {
    if (set.has((d.value || '').toLowerCase())) hits.push(d);
  }
  return hits;
}

function scoreDomainKeywords(domains, intel) {
  let score = 0;
  const reasons = [];
  const kws = intel.scamDomainKeywords || [];
  for (const dom of domains) {
    for (const kw of kws) {
      const v = (kw.value || '').toLowerCase();
      if (!v) continue;
      if (dom.includes(v)) {
        score += Number(kw.weight || 0);
        reasons.push(`Domain contains scam keyword: "${v}"`);
      }
    }
  }
  return { score, reasons };
}

module.exports = { findAbsoluteHits, findKnownBadDomainHits, scoreDomainKeywords };
