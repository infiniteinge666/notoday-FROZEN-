'use strict';

function buildWhatNotToDo(band) {
  const base = [
    'Do not click links you did not expect.',
    'Do not share OTP/PIN/CVV or banking app screenshots.',
    'Do not pay into a private individual’s account.'
  ];
  if (band === 'SAFE') return ['Still verify the sender before acting on anything.'];
  return base;
}

function formatReasons(reasons, max=8) {
  const uniq = [];
  const seen = new Set();
  for (const r of reasons) {
    if (!seen.has(r)) { seen.add(r); uniq.push(r); }
    if (uniq.length >= max) break;
  }
  return uniq;
}

module.exports = { buildWhatNotToDo, formatReasons };
