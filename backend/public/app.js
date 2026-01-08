'use strict';

const slab = document.getElementById('slab');
const input = document.getElementById('input');
const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');

const result = document.getElementById('result');
const bandEl = document.getElementById('band');
const scoreEl = document.getElementById('score');
const hintEl = document.getElementById('hint');

function setBand(band) {
  slab.setAttribute('data-band', band || 'IDLE');
}

function normalizeBand(b) {
  const x = String(b || '').toUpperCase().trim();
  if (x === 'SAFE' || x === 'SUSPICIOUS' || x === 'CRITICAL') return x;
  return 'SUSPICIOUS';
}

function showResult({ band, score, hint }) {
  result.hidden = false;
  bandEl.textContent = band;
  scoreEl.textContent = `${Number(score || 0)} / 100`;
  hintEl.textContent = hint || 'No risk markers detected.';
  setBand(band);
}

function hideResult() {
  result.hidden = true;
  setBand('IDLE');
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

function pickHint(payload) {
  const data = payload?.data || {};
  const band = normalizeBand(data.band);
  const reasons = Array.isArray(data.reasons) ? data.reasons : [];

  if (band === 'CRITICAL') return reasons[0] || 'High-risk indicators detected. Stop and verify.';
  if (band === 'SUSPICIOUS') return reasons[0] || 'Some risk markers detected. Verify independently.';
  return reasons[0] || 'No high-confidence scam indicators detected.';
}

async function runScan() {
  const raw = String(input.value || '').trim();
  if (!raw) {
    hideResult();
    input.focus();
    return;
  }

  scanBtn.disabled = true;
  scanBtn.textContent = 'SCANNING…';

  const { ok, json } = await fetchJson('/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw, deviceTokenHash: 'web' })
  });

  if (!ok || !json) {
    showResult({ band: 'SUSPICIOUS', score: 50, hint: 'Scan failed. Try again.' });
    scanBtn.disabled = false;
    scanBtn.textContent = 'SCAN';
    return;
  }

  const data = json.data || {};
  const band = normalizeBand(data.band);
  const score = Number(data.score || 0);

  showResult({
    band,
    score,
    hint: pickHint(json)
  });

  scanBtn.disabled = false;
  scanBtn.textContent = 'SCAN';
}

scanBtn.addEventListener('click', runScan);

clearBtn.addEventListener('click', () => {
  input.value = '';
  hideResult();
  input.focus();
});

// Enter to scan, Shift+Enter for newline
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runScan();
  }
});

hideResult();
