'use strict';

const slab = document.getElementById('slab');
const input = document.getElementById('input');
const inputShell = document.getElementById('inputShell');

const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');
const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');

const bandEl = document.getElementById('band');
const threatsEl = document.getElementById('threats');
const hintEl = document.getElementById('hint');
const ocrStatusEl = document.getElementById('ocrStatus');
const pasteHintEl = document.getElementById('pasteHint');

let pendingImageBase64 = null;
let pendingImageName = '';

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

function setBusy(isBusy, labelText = 'SCAN') {
  scanBtn.disabled = isBusy;
  if (uploadBtn) uploadBtn.disabled = isBusy;
  if (clearBtn) clearBtn.disabled = isBusy;

  const label = scanBtn.querySelector('.scan-label');
  if (label) label.textContent = labelText;
}

function setOCRStatus(text = '') {
  if (ocrStatusEl) ocrStatusEl.textContent = text;
}

function resetPendingImage() {
  pendingImageBase64 = null;
  pendingImageName = '';
  setOCRStatus('');
  if (pasteHintEl) {
    pasteHintEl.textContent = 'Paste text or press Ctrl+V with a screenshot copied.';
  }
  inputShell?.classList.remove('has-image');
  if (imageInput) imageInput.value = '';
}

function renderIdle() {
  setBand('SAFE');
  bandEl.textContent = 'SAFE';
  threatsEl.textContent = '0 Threats';
  hintEl.textContent = 'No threats detected in this message.';
}

function renderFailure(message = 'Scan failed. Try again.') {
  setBand('SUSPICIOUS');
  bandEl.textContent = 'SUSPICIOUS';
  threatsEl.textContent = '1 Threat';
  hintEl.textContent = message;
}

function renderResult(json) {
  const band = normalizeBand(json?.data?.band);
  const threatCount = computeThreatCount(json);

  setBand(band);
  bandEl.textContent = band;
  threatsEl.textContent = threatCount === 1 ? '1 Threat' : `${threatCount} Threats`;
  hintEl.textContent = pickHint(json);

  const ocr = json?.data?.ocr;
  if (ocr?.success) {
    setOCRStatus(`Screenshot read successfully (${ocr.chars || 0} chars).`);
  }
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

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function attachImageFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    setOCRStatus('Unsupported image type. Use PNG, JPG, JPEG, or WEBP.');
    return;
  }

  try {
    const dataUrl = await fileToDataURL(file);
    pendingImageBase64 = dataUrl;
    pendingImageName = file.name || 'Screenshot';
    inputShell?.classList.add('has-image');
    setOCRStatus(`Screenshot ready: ${pendingImageName}`);
    if (pasteHintEl) {
      pasteHintEl.textContent = 'Screenshot attached. Click SCAN to analyse it.';
    }
  } catch {
    setOCRStatus('Could not read screenshot file.');
  }
}

async function runScan() {
  const raw = String(input.value || '').trim();

  if (!raw && !pendingImageBase64) {
    renderIdle();
    input.focus();
    return;
  }

  setBusy(true, pendingImageBase64 ? 'READING...' : 'SCANNING...');

  const body = pendingImageBase64
    ? { imageBase64: pendingImageBase64, deviceTokenHash: 'web' }
    : { raw, deviceTokenHash: 'web' };

  const { ok, json } = await fetchJson('/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!ok || !json) {
    renderFailure('Scan failed. Try again.');
    setBusy(false, 'SCAN');
    return;
  }

  renderResult(json);
  setBusy(false, 'SCAN');
}

/* Click actions */
scanBtn.addEventListener('click', runScan);

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    input.value = '';
    resetPendingImage();
    renderIdle();
    input.focus();
  });
}

if (uploadBtn && imageInput) {
  uploadBtn.addEventListener('click', () => imageInput.click());

  imageInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) await attachImageFile(file);
  });
}

/* Enter to scan, Shift+Enter for newline */
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runScan();
  }
});

/* Paste support: text remains normal, images become pending screenshot */
document.addEventListener('paste', async (e) => {
  const items = Array.from(e.clipboardData?.items || []);
  const imageItem = items.find(item => item.type && item.type.startsWith('image/'));

  if (!imageItem) return;

  e.preventDefault();
  const file = imageItem.getAsFile();
  await attachImageFile(file);
});

/* Drag & drop screenshot support */
['dragenter', 'dragover'].forEach(evt => {
  inputShell?.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputShell.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(evt => {
  inputShell?.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    inputShell.classList.remove('dragover');
  });
});

inputShell?.addEventListener('drop', async (e) => {
  const files = Array.from(e.dataTransfer?.files || []);
  const imageFile = files.find(f => /^image\/(png|jpeg|jpg|webp)$/i.test(f.type));
  if (imageFile) {
    await attachImageFile(imageFile);
  }
});

renderIdle();