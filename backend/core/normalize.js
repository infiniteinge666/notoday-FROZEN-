'use strict';

/**
 * Normalizes raw ingress to a scanable text blob + extracted links.
 * This is intentionally simple and deterministic.
 */
function normalize(raw) {
  const text = (raw ?? '').toString();
  const lower = text.toLowerCase();

  // Extract URLs (very basic)
  const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
  const urls = (text.match(urlRegex) || []).map(u => u.trim());

  // Extract bare domains (basic)
  const domainRegex = /\b([a-z0-9-]+\.)+[a-z]{2,}\b/gi;
  const domains = (lower.match(domainRegex) || []).map(d => d.trim());

  return { text, lower, urls, domains };
}

module.exports = { normalize };
