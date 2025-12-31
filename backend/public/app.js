(() => {
  'use strict';

  // Same-origin by default. If you need remote later, set it here:
  // const API_BASE = "https://api.notoday.co.za";
  const API_BASE = "";

  const slab   = document.getElementById('slab');
  const bandEl = document.getElementById('band');
  const scoreEl= document.getElementById('score');
  const hintEl = document.getElementById('hint');
  const input  = document.getElementById('input');
  const btn    = document.getElementById('scanBtn');

  function normalizeText(t){
    return (t || "")
      .toString()
      .replace(/\u00A0/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  async function safeJson(res){
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) {
      const text = await res.text();
      throw new Error(`Non-JSON response (${res.status}). First chars: ${text.slice(0, 80)}`);
    }
    return res.json();
  }

  function setResult(band, score, hint){
    slab.dataset.band = band;
    bandEl.textContent = band;
    scoreEl.textContent = `${score} / 100`;
    hintEl.textContent = hint || '';
  }

  function summarize(apiPayload){
    // Expected (from your backend): { band, reasons, whatNotToDo, intelVersion, score? }
    // We stay defensive because platforms lie.
    const band = (apiPayload && apiPayload.band) ? String(apiPayload.band).toUpperCase() : "SUSPICIOUS";
    const score = (apiPayload && Number.isFinite(apiPayload.score)) ? apiPayload.score : (
      apiPayload && apiPayload.data && Number.isFinite(apiPayload.data.score) ? apiPayload.data.score : 0
    );

    const reasons = apiPayload?.reasons || apiPayload?.data?.reasons || [];
    const hint = Array.isArray(reasons) && reasons.length
      ? reasons[0]
      : (band === "SAFE"
          ? "No threats detected in this message."
          : "Risk markers detected. Slow down.");

    return { band, score, hint };
  }

  async function runScan(){
    const raw = normalizeText(input.value);

    if (!raw) {
      setResult("SUSPICIOUS", 5, "Paste one message, link, or email first.");
      return;
    }

    // UI should never feel broken: show “working” state instantly.
    setResult("SUSPICIOUS", 0, "Scanning…");

    try {
      const res = await fetch(`${API_BASE}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, deviceTokenHash: "demo" })
      });

      const json = await safeJson(res);
      const payload = json?.data ? json.data : json;

      const { band, score, hint } = summarize(payload);
      setResult(band, score, hint);

    } catch (err) {
      setResult("SUSPICIOUS", 0, "Scan failed. Try again.");
      // console for dev only
      console.error(err);
    }
  }

  btn.addEventListener('click', runScan);

  // Default state (mockup-like)
  setResult("SAFE", 0, "No threats detected in this message.");
})();
