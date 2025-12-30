(() => {
  'use strict';

  const API_BASE = ""; // same-origin by default

  const slab   = document.getElementById("slab");
  const result = document.getElementById("result");
  const band   = document.getElementById("band");
  const score  = document.getElementById("score");
  const hint   = document.getElementById("hint");
  const input  = document.getElementById("input");
  const btn    = document.getElementById("scanBtn");

  function setState(b, s, h) {
    const B = b || "SUSPICIOUS";
    slab.dataset.band = B;
    band.textContent = B;
    score.textContent = `${Number.isFinite(s) ? s : 0} / 100`;
    hint.textContent = h || "Scan complete.";
    result.hidden = false;
  }

  function normalizeText(t) {
    return (t ?? "")
      .toString()
      .replace(/\u00A0/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  async function safeJson(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error(`Non-JSON response (${res.status}). First chars: ${text.slice(0, 80)}`);
    }
    return res.json();
  }

  async function runScan() {
    const raw = normalizeText(input.value);

    if (!raw) {
      setState("SUSPICIOUS", 5, "Paste one message, link, or email first.");
      return;
    }

    btn.disabled = true;
    btn.style.opacity = "0.92";

    try {
      const res = await fetch(`${API_BASE}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw, deviceTokenHash: "demo" })
      });

      const data = await safeJson(res);

      const b = data.band || data?.data?.band || "SUSPICIOUS";
      const s = (data.score ?? data?.data?.score ?? 0);

      let h = "Scan complete.";
      const reasons = data.reasons || data?.data?.reasons;
      if (Array.isArray(reasons) && reasons.length) h = reasons[0];

      setState(b, s, h);
    } catch (err) {
      setState("SUSPICIOUS", 0, "Scan failed. The system returned an invalid response.");
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  }

  btn.addEventListener("click", runScan);

  // default state
  setState("SAFE", 0, "No threats detected in this message.");
})();
