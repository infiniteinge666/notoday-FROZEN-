'use strict';

const slab = document.getElementById('slab');
const input = document.getElementById('input');

const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');

const bandEl = document.getElementById('band');
const threatsEl = document.getElementById('threats');
const hintEl = document.getElementById('hint');

function normalizeBand(b) {
  const x = String(b || '').toUpperCase().trim();
  if (x === 'SAFE' || x === 'SUSPICIOUS' || x === 'CRITICAL') return x;
  return 'SUSPICIOUS';
}

function setBand(band) {
  slab.setAttribute('data-band', band || 'SAFE');
}

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

function defaultHintForBand(band) {
  if (band === 'CRITICAL') return 'Threats detected. Do not click, pay, or share information.';
  if (band === 'SUSPICIOUS') return 'Potential threats detected. Verify independently before you act.';
  return 'No threats detected in this message.';
}

function computeThreatCount(payload) {
  const reasons = Array.isArray(payload?.data?.reasons) ? payload.data.reasons : [];
  const band = normalizeBand(payload?.data?.band);

  if (band === 'SAFE') return 0;
  if (reasons.length) return clamp(reasons.length, 1, 9);
  return 1;
}

function pickHint(payload) {
  const data = payload?.data || {};
  const band = normalizeBand(data.band);
  const reasons = Array.isArray(data.reasons) ? data.reasons : [];
  return reasons[0] || defaultHintForBand(band);
}

function renderIdle() {
  setBand('SAFE');
  bandEl.textContent = 'SAFE';
  threatsEl.textContent = '0 Threats';
  hintEl.textContent = 'No threats detected in this message.';
}

async function fetchJson(url, options) {
  try {
    const res = await fetch(url, options);
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const text = await res.text();

    if (!ct.includes('application/json')) return { ok: false, json: null };
    try {
      return { ok: res.ok, json: JSON.parse(text) };
    } catch {
      return { ok: false, json: null };
    }
  } catch {
    return { ok: false, json: null };
  }
}

async function runScan() {
  const raw = String(input.value || '').trim();

  if (!raw) {
    renderIdle();
    input.focus();
    return;
  }

  scanBtn.disabled = true;
  const label = scanBtn.querySelector('.scan-label');
  if (label) label.textContent = 'SCANNING...';

  const { ok, json } = await fetchJson('/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, deviceTokenHash: 'web' })
  });

  if (!ok || !json) {
    setBand('SUSPICIOUS');
    bandEl.textContent = 'SUSPICIOUS';
    threatsEl.textContent = '1 Threat';
    hintEl.textContent = 'Scan failed. Try again.';
    scanBtn.disabled = false;
    if (label) label.textContent = 'SCAN';
    return;
  }

  const band = normalizeBand(json?.data?.band);
  const threatCount = computeThreatCount(json);

  setBand(band);
  bandEl.textContent = band;
  threatsEl.textContent = threatCount === 1 ? '1 Threat' : `${threatCount} Threats`;
  hintEl.textContent = pickHint(json);

  scanBtn.disabled = false;
  if (label) label.textContent = 'SCAN';
}

/* Click actions */
scanBtn.addEventListener('click', runScan);

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    input.value = '';
    renderIdle();
    input.focus();
  });
}

/* Enter to scan, Shift+Enter for newline */
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runScan();
  }
});

renderIdle();
