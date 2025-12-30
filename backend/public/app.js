// app.js — NoToday Public Test UI (VPS/Nginx baseline)
// Rule: UI must call the API origin (not the static UI origin).

'use strict';

const DEFAULT_API_BASE = 'https://api.notoday.co.za';

const API_BASE =
  (window.__NOTODAY_API__ && String(window.__NOTODAY_API__)) ||
  document.querySelector('meta[name="notoday-api"]')?.content ||
  DEFAULT_API_BASE;

const byId = (id) => document.getElementById(id);

function requireEls(ids) {
  const missing = [];
  const els = {};
  for (const id of ids) {
    const el = byId(id);
    if (!el) missing.push(id);
    els[id] = el;
  }
  if (missing.length) {
    // Fail closed: show in console + render a minimal message if possible.
    console.error('[NoToday UI] Missing required element IDs:', missing);
  }
  return { els, missing };
}

function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function safeBand(band) {
  const v = String(band || '').toUpperCase();
  return v === 'SAFE' || v === 'SUSPICIOUS' || v === 'CRITICAL' ? v : 'SUSPICIOUS';
}

function clearChildren(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

function renderList(ul, items, emptyText) {
  if (!ul) return;
  clearChildren(ul);

  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) {
    const li = document.createElement('li');
    li.textContent = emptyText || 'No details available.';
    ul.appendChild(li);
    return;
  }

  for (const x of arr) {
    const li = document.createElement('li');
    li.textContent = String(x);
    ul.appendChild(li);
  }
}

function setText(el, value) {
  if (!el) return;
  el.textContent = String(value ?? '');
}

function show(el) {
  if (!el) return;
  el.classList.remove('result-hidden');
}

function setBusy(btn, isBusy) {
  if (!btn) return;
  btn.disabled = !!isBusy;
  btn.classList.toggle('btn-busy', !!isBusy);
  btn.textContent = isBusy ? 'CHECKING…' : 'CHECK';
}

function setBandUI(band, bandTextEl) {
  const b = safeBand(band);
  document.documentElement.setAttribute('data-band', b);
  if (bandTextEl) bandTextEl.textContent = b;
}

function setScoreUI(score, scoreNumEl) {
  if (!scoreNumEl) return;
  scoreNumEl.textContent = String(clamp(score, 0, 100));
}

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  const text = await res.text();

  if (!ct.includes('application/json')) {
    return {
      success: false,
      error: 'Network error',
      details: `Expected JSON but got "${ct || 'unknown content-type'}". First 140 chars: ${text.slice(0, 140)}`
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: 'Network error',
      details: `Invalid JSON returned. First 140 chars: ${text.slice(0, 140)}`
    };
  }
}

async function getIntel() {
  const res = await fetch(`${API_BASE}/intel`, { method: 'GET' });
  return safeJson(res);
}

async function postCheck(raw) {
  const res = await fetch(`${API_BASE}/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw: String(raw || '') })
  });
  return safeJson(res);
}

// Normalise /check response into one UI shape.
function normaliseCheckResponse(r) {
  const ok = !!(r && r.success);
  const payload = r && r.data ? r.data : r;

  const band = payload?.band ?? payload?.data?.band ?? 'SUSPICIOUS';
  const score = payload?.score ?? payload?.data?.score ?? payload?.riskScore ?? 0;
  const reasons = payload?.reasons ?? payload?.why ?? payload?.data?.reasons ?? [];
  const whatNotToDo = payload?.whatNotToDo ?? payload?.dont ?? payload?.data?.whatNotToDo ?? [];
  const intelVersion =
    payload?.intelVersion ??
    payload?.data?.intelVersion ??
    payload?.version ??
    (r && r.data && r.data.version) ??
    'unknown';

  if (!ok) {
    return {
      ok: false,
      band: 'SUSPICIOUS',
      score: 0,
      reasons: ['Scan failed. The system returned an invalid response.'],
      whatNotToDo: ['Do not act on unexpected messages.'],
      intelVersion: 'unknown',
      raw: r
    };
  }

  return {
    ok: true,
    band: safeBand(band),
    score: clamp(score, 0, 100),
    reasons: Array.isArray(reasons) ? reasons : [],
    whatNotToDo: Array.isArray(whatNotToDo) ? whatNotToDo : [],
    intelVersion: String(intelVersion || 'unknown'),
    raw: r
  };
}

function leadForBand(band) {
  const b = safeBand(band);
  if (b === 'CRITICAL') return 'Stop. High-risk indicators detected.';
  if (b === 'SUSPICIOUS') return 'Pause. Risk markers detected.';
  return 'No strong scam indicators detected.';
}

function renderResult(ui, n) {
  setBandUI(n.band, ui.bandText);
  setScoreUI(n.score, ui.scoreNum);
  setText(ui.lead, leadForBand(n.band));

  renderList(ui.why, n.reasons, 'No strong indicators found.');
  renderList(ui.dont, n.whatNotToDo, 'If money is involved, verify via official channels you find yourself.');

  setText(ui.tech, typeof n.raw === 'string' ? n.raw : JSON.stringify(n.raw, null, 2));
  show(ui.result);
}

function wireUI(ui) {
  if (ui.clearBtn && ui.raw) {
    ui.clearBtn.addEventListener('click', () => {
      ui.raw.value = '';
      ui.raw.focus();
    });
  }

  if (ui.scanBtn && ui.raw) {
    ui.scanBtn.addEventListener('click', async () => {
      const raw = ui.raw.value || '';

      if (!raw.trim()) {
        renderResult(ui, {
          ok: false,
          band: 'SUSPICIOUS',
          score: 0,
          reasons: ['No input provided.'],
          whatNotToDo: ['Don’t click links or share details until you’ve checked the message.'],
          intelVersion: 'unknown',
          raw: { note: 'empty input', apiBase: API_BASE }
        });
        return;
      }

      setBusy(ui.scanBtn, true);
      setText(ui.lead, 'Checking…');
      show(ui.result);

      try {
        const r = await postCheck(raw);
        const n = normaliseCheckResponse(r);
        renderResult(ui, n);
      } catch (e) {
        renderResult(ui, normaliseCheckResponse({
          success: false,
          error: 'Network error',
          details: String(e && e.message ? e.message : e)
        }));
      } finally {
        setBusy(ui.scanBtn, false);
      }
    });

    // Ctrl+Enter
    ui.raw.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
        ev.preventDefault();
        ui.scanBtn.click();
      }
    });
  }

  if (ui.exampleOtp && ui.raw && ui.scanBtn) {
    ui.exampleOtp.addEventListener('click', () => {
      ui.raw.value = 'Your OTP is 123456. Please share your PIN and CVV immediately to keep your account active.';
      ui.scanBtn.click();
    });
  }

  if (ui.exampleSafe && ui.raw && ui.scanBtn) {
    ui.exampleSafe.addEventListener('click', () => {
      ui.raw.value = 'Hi, just a reminder that our meeting is tomorrow at 10:00. See you then.';
      ui.scanBtn.click();
    });
  }

  // Screenshot upload: intentionally not wired (text-only baseline)
  if (ui.file) {
    ui.file.addEventListener('change', () => {
      const f = ui.file.files && ui.file.files[0];
      if (!f) return;

      renderResult(ui, {
        ok: false,
        band: 'SUSPICIOUS',
        score: 0,
        reasons: [
          'Screenshot upload is not enabled in this public test build yet.',
          'Backend is currently expecting text-only JSON.'
        ],
        whatNotToDo: [
          'Don’t trust screenshots as proof.',
          'Verify via official channels you find yourself (not links in the message).'
        ],
        intelVersion: 'unknown',
        raw: { file: { name: f.name, type: f.type, size: f.size }, apiBase: API_BASE }
      });

      ui.file.value = '';
    });
  }
}

async function init() {
  const { els, missing } = requireEls([
    'intel',
    'raw',
    'clearBtn',
    'scanBtn',
    'file',
    'exampleOtp',
    'exampleSafe',
    'result',
    'bandText',
    'scoreNum',
    'lead',
    'why',
    'dont',
    'tech'
  ]);

  const ui = {
    intel: els.intel,
    raw: els.raw,
    clearBtn: els.clearBtn,
    scanBtn: els.scanBtn,
    file: els.file,
    exampleOtp: els.exampleOtp,
    exampleSafe: els.exampleSafe,
    result: els.result,
    bandText: els.bandText,
    scoreNum: els.scoreNum,
    lead: els.lead,
    why: els.why,
    dont: els.dont,
    tech: els.tech
  };

  // Baseline UI state
  setBandUI('SAFE', ui.bandText);
  setScoreUI(0, ui.scoreNum);
  setText(ui.lead, 'Ready.');

  // Intel banner
  try {
    const intel = await getIntel();
    if (intel && intel.success && intel.data) {
      setText(
        ui.intel,
        `Intel: ${intel.data.version} | counts: ${JSON.stringify(intel.data.counts)}${intel.data.degraded ? ' | DEGRADED' : ''}`
      );
    } else {
      setText(ui.intel, 'Intel load failed: ' + (intel?.details || intel?.error || 'unknown'));
    }
  } catch {
    setText(ui.intel, 'Intel request error.');
  }

  // If critical DOM is missing, fail closed (don’t attach broken handlers)
  if (missing.length) {
    // Still show result box if possible with a clear message
    renderResult(ui, {
      ok: false,
      band: 'SUSPICIOUS',
      score: 0,
      reasons: ['UI wiring error: missing required elements.', `Missing: ${missing.join(', ')}`],
      whatNotToDo: ['Do not rely on this page until the UI wiring is fixed.'],
      intelVersion: 'unknown',
      raw: { missingIds: missing, apiBase: API_BASE }
    });
    return;
  }

  wireUI(ui);
}

document.addEventListener('DOMContentLoaded', init);
