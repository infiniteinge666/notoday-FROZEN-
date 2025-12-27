'use strict';

/**
 * NoToday — normalize.js (LOCKED BEHAVIOUR)
 * Deterministic normalization:
 * - lowercases
 * - replaces smart quotes to ASCII
 * - collapses whitespace
 * - extracts urls + bare domains (basic)
 *
 * Returns: { text, urls, domains }
 */

function normalizeText(s) {
  const t = (s ?? '').toString();

  // Replace common “smart” punctuation deterministically (no locale guessing)
  const ascii = t
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // ‘ ’
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // “ ”
    .replace(/\u00A0/g, ' ') // non-breaking space
    .replace(/\u200B/g, ''); // zero-width space

  const lower = ascii.toLowerCase();
  const collapsed = lower.replace(/\s+/g, ' ').trim();
  return collapsed;
}

function extractUrls(rawText) {
  // Very basic URL extraction (intentionally simple)
  const urlRegex = /\bhttps?:\/\/[^\s)]+/gi;
  const hits = rawText.match(urlRegex) || [];
  return hits.map(u => u.trim());
}

function extractBareDomains(normalizedLowerText) {
  // Basic bare-domain extraction (not a full URL parser; deterministic)
  // Matches: example.com, foo.co.za, sub.domain.org.za
  const domRegex = /\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\.[a-z]{2})?\b/g;
  const hits = normalizedLowerText.match(domRegex) || [];
  return Array.from(new Set(hits.map(d => d.trim())));
}

function normalize(raw) {
  const rawText = (raw ?? '').toString();
  const text = normalizeText(rawText);
  const urls = extractUrls(rawText);
  const domains = extractBareDomains(text);

  return { text, urls, domains };
}

module.exports = { normalize, normalizeText };
