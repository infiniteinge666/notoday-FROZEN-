'use strict';

const $ = (id) => document.getElementById(id);

async function getIntel() {
  const res = await fetch('/intel', { method: 'GET' });
  return res.json();
}

async function postCheck(raw) {
  const res = await fetch('/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ raw })
  });
  return res.json();
}

function setBandUI(band) {
  const root = document.documentElement;
  root.dataset.band = band; // used by CSS

  $('bandText').textContent = band;

  const lead = $('lead');
  if (band === 'SAFE') lead.textContent = "You're safe. Let's check it.";
  else if (band === 'SUSPICIOUS') lead.textContent = 'Pause. Risk markers detected.';
  else lead.textContent = 'Stop. High-risk indicators detected.';
}

function setList(id, items) {
  const ul = $(id);
  ul.innerHTML = '';
  (items || []).slice(0, 8).forEach((t) => {
    const li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
}

function showResult(payload) {
  const result = $('result');
  result.classList.remove('result-hidden');

  // animation trigger (subtle emphasis)
  result.classList.remove('pop');
  void result.offsetWidth; // reflow
  result.classList.add('pop');

  if (!payload || !payload.success || !payload.data) {
    setBandUI('SUSPICIOUS');
    $('scoreNum').textContent = '0';
    setList('why', ['Scan failed. The system returned an invalid response.']);
    setList('dont', ['Do not act on unexpected messages.', 'Do not share OTP/PIN/CVV.']);
    $('tech').textContent = JSON.stringify(payload, null, 2);
    return;
  }

  const d = payload.data;

  setBandUI(d.band || 'SUSPICIOUS');
  $('scoreNum').textContent = String(d.score ?? 0);

  // Nice readable bullets (prefer curated lines, fall back to raw reasons)
  const why = (d.why && d.why.length) ? d.why : (d.reasons || []);
  const dont = d.whatNotToDo || [];

  setList('why', why);
  setList('dont', dont);

  $('tech').textContent = JSON.stringify(payload, null, 2);
}

(async () => {
  // Intel banner
  try {
    const intel = await getIntel();
    if (intel && intel.success && intel.data) {
      $('intel').textContent =
        `Intel: ${intel.data.version} | counts: ` +
        JSON.stringify(intel.data.counts) +
        (intel.data.degraded ? ' | DEGRADED' : '');
    } else {
      $('intel').textContent = 'Intel load failed.';
    }
  } catch {
    $('intel').textContent = 'Intel request error.';
  }

  // Clear
  $('clearBtn').onclick = () => {
    $('raw').value = '';
    $('raw').focus();
  };

  // Upload (proof build: no OCR yet, so we don’t pretend)
  $('file').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    showResult({
      success: true,
      data: {
        band: 'SUSPICIOUS',
        score: 35,
        why: [
          'Screenshot upload is present in the UI, but image OCR is not enabled in this proof build yet.',
          'For now: paste the message text, link, or email body into the box.'
        ],
        whatNotToDo: [
          'Do not trust screenshots as proof.',
          'Do not share OTP/PIN/CVV.',
          'Do not pay into a private individual’s account.'
        ],
        reasons: ['Image OCR not enabled in this build.'],
        intelVersion: 'ui'
      },
      message: 'OK'
    });
    e.target.value = '';
  });

  // Scan
  $('scanBtn').onclick = async () => {
    const raw = $('raw').value || '';
    showResult({ success: true, data: { band: 'SUSPICIOUS', score: 0, why: ['Scanning…'], whatNotToDo: [] } });

    try {
      const r = await postCheck(raw);
      showResult(r);
    } catch (e) {
      showResult({ success: false, error: 'Network error', details: String(e && e.message ? e.message : e) });
    }
  };
})();
