'use strict';

const { normalizeText, extractDomainCandidates } = require('./normalize');

// Return: { hit, value }
function findKnownBadDomainHit(raw, intel) {
  const domains = extractDomainCandidates(raw);
  const list = (intel.knownBadDomains || []).map(x => String(x.value || '').toLowerCase());

  for (const d of domains) {
    const dn = String(d || '').toLowerCase();
    if (list.includes(dn)) return { hit: true, value: dn };
  }
  return { hit: false, value: null };
}

// Return: { score, reasons, hits }
function scoreDomainKeywords(raw, intel) {
  const domains = extractDomainCandidates(raw);
  const kw = intel.scamDomainKeywords || [];

  let score = 0;
  const reasons = [];
  const hits = [];

  for (const d of domains) {
    const dn = String(d || '').toLowerCase();

    for (const k of kw) {
      const token = String(k.value || '').toLowerCase();
      if (!token) continue;

      if (dn.includes(token)) {
        const w = Number(k.weight || 0);
        if (w <= 0) continue;

        score += w;
        const msg = `Domain keyword "${token}" matched in "${dn}" (+${w})`;
        reasons.push(msg);
        hits.push({ type: 'domain_keyword', category: k.category || 'domain_keyword', value: token, weight: w, context: dn });
      }
    }
  }

  // conservative clamp
  score = Math.min(score, 80);

  return { score, reasons, hits };
}

// Return: { score, reasons, hits, absoluteTriggered }
function scoreTextPatterns(raw, intel) {
  const text = normalizeText(raw);
  const patterns = intel.scamPatterns || [];

  let score = 0;
  const reasons = [];
  const hits = [];
  let absoluteTriggered = false;

  for (const p of patterns) {
    const phrase = String(p.value || '').toLowerCase();
    if (!phrase) continue;

    // Basic contains match (deterministic). Keep it boring and reliable.
    if (text.includes(phrase)) {
      const w = Number(p.weight || 0);
      const cat = String(p.category || 'unknown');

      // Category "credentials" is treated as absolute by policy in this proof build.
      if (cat === 'credentials') absoluteTriggered = true;

      score += w;

      const msg = `Matched "${phrase}" [${cat}] (+${w})`;
      reasons.push(msg);
      hits.push({ type: 'pattern', category: cat, value: phrase, weight: w });
    }
  }

  // conservative clamp (absolute handled elsewhere)
  score = Math.min(score, 90);

  return { score, reasons, hits, absoluteTriggered };
}

module.exports = {
  findKnownBadDomainHit,
  scoreDomainKeywords,
  scoreTextPatterns
};
