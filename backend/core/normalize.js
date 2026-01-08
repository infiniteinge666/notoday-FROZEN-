'use strict';

function normalizeRaw(raw) {
  let s = String(raw || '');

  // Normalize whitespace
  s = s.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  s = s.replace(/[ ]{2,}/g, ' ').trim();

  // Normalize smart quotes
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  return s;
}

function normalizeText(raw) {
  return normalizeRaw(raw).toLowerCase();
}

// Extract possible domains from text deterministically.
// We return hostnames without scheme/path where possible.
function extractDomainCandidates(raw) {
  const s = normalizeRaw(raw);

  const out = new Set();

  // 1) Full URLs
  const urlRe = /\bhttps?:\/\/[^\s<>"')]+/gi;
  const urls = s.match(urlRe) || [];
  for (const u of urls) {
    try {
      const host = new URL(u).hostname;
      if (host) out.add(host.toLowerCase());
    } catch {}
  }

  // 2) Bare domains (very common in SMS/WhatsApp)
  // Allows subdomains + TLDs, includes .co.za and similar.
  const domRe = /\b([a-z0-9-]{1,63}\.)+(?:[a-z]{2,24}|co\.za|org\.za|gov\.za|ac\.za|net\.za)\b/gi;
  const ds = s.match(domRe) || [];
  for (const d of ds) out.add(String(d).toLowerCase());

  return Array.from(out);
}

module.exports = {
  normalizeRaw,
  normalizeText,
  extractDomainCandidates
};
