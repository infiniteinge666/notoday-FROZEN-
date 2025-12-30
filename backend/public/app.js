// app.js — NoToday Public Test UI (VPS / Nginx / Same-Origin Safe)
// Rule: default to SAME ORIGIN to avoid CSP connect-src blocks.
// If you later want cross-origin API (api.notoday.co.za from notoday.co.za),
// you must explicitly allow it in CSP connect-src.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function originSafeMetaBase() {
    const meta = document.querySelector('meta[name="notoday-api"]')?.content?.trim();
    if (!meta) return null;

    try {
      const url = new URL(meta, window.location.href);
      // Only allow override if it's the same origin (avoids CSP connect-src issues)
      if (url.origin === window.location.origin) return url.origin;
      return null;
    } catch {
      return null;
    }
  }

  // Same-origin API base by default.
  const API_BASE =
    (window.__NOTODAY_API__ && String(window.__NOTODAY_API__)) ||
    originSafeMetaBase() ||
    window.location.origin;

  function apiUrl(path) {
    const p = String(path || "").startsWith("/") ? String(path) : `/${path}`;
    return `${API_BASE}${p}`;
  }

  function setBand(band) {
    const allowed = ["SAFE", "SUSPICIOUS", "CRITICAL"];
    const b = allowed.includes(String(band).toUpperCase())
      ? String(band).toUpperCase()
      : "SUSPICIOUS";
    document.documentElement.setAttribute("data-band", b);
    const el = $("bandText");
    if (el) el.textContent = b;
  }

  function setScore(n) {
    const num = Number.isFinite(Number(n)) ? Math.max(0, Math.min(100, Number(n))) : 0;
    const el = $("scoreNum");
    if (el) el.textContent = String(num);
  }

  function clearList(ul) {
    while (ul && ul.firstChild) ul.removeChild(ul.firstChild);
  }

  function renderList(ulId, items) {
    const ul = $(ulId);
    if (!ul) return;
    clearList(ul);

    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) {
      const li = document.createElement("li");
      li.textContent = "No details available.";
      ul.appendChild(li);
      return;
    }

    for (const x of arr) {
      const li = document.createElement("li");
      li.textContent = String(x);
      ul.appendChild(li);
    }
  }

  function showResult() {
    const el = $("result");
    if (el) el.classList.remove("result-hidden");
  }

  function setLead(text) {
    const el = $("lead");
    if (el) el.textContent = String(text || "");
  }

  function setTech(obj) {
    const el = $("tech");
    if (!el) return;
    el.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
  }

  function setBusy(isBusy) {
    const btn = $("scanBtn");
    if (!btn) return;
    btn.disabled = !!isBusy;
    btn.classList.toggle("btn-busy", !!isBusy);
    btn.textContent = isBusy ? "CHECKING…" : "CHECK";
  }

  async function safeJson(res) {
    const ct = res.headers.get("content-type") || "";
    const text = await res.text();

    if (!ct.includes("application/json")) {
      return {
        success: false,
        error: "Network error",
        details: `Expected JSON but got "${ct || "unknown content-type"}". First 140 chars: ${text.slice(0, 140)}`
      };
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        success: false,
        error: "Network error",
        details: `Invalid JSON returned. First 140 chars: ${text.slice(0, 140)}`
      };
    }
  }

  async function getIntel() {
    const res = await fetch(apiUrl("/intel"), { method: "GET" });
    return safeJson(res);
  }

  async function postCheck(raw) {
    const res = await fetch(apiUrl("/check"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        raw: String(raw || "")
        // deviceTokenHash intentionally omitted in public-test UI baseline
      })
    });
    return safeJson(res);
  }

  // Normalise /check responses into one UI shape.
  function normaliseCheckResponse(r) {
    const ok = !!(r && r.success);
    const payload = (r && r.data) ? r.data : r;

    const band = payload?.band || payload?.data?.band;
    const score = payload?.score ?? payload?.data?.score ?? payload?.riskScore ?? 0;
    const reasons = payload?.reasons || payload?.why || payload?.data?.reasons || [];
    const whatNotToDo = payload?.whatNotToDo || payload?.dont || payload?.data?.whatNotToDo || [];
    const intelVersion =
      payload?.intelVersion ||
      payload?.data?.intelVersion ||
      payload?.version ||
      "unknown";

    if (!ok) {
      return {
        ok: false,
        band: "SUSPICIOUS",
        score: 0,
        reasons: ["Scan failed. The system returned an invalid response."],
        whatNotToDo: ["Do not act on unexpected messages."],
        intelVersion: "unknown",
        raw: r
      };
    }

    return {
      ok: true,
      band: band || "SUSPICIOUS",
      score: Number.isFinite(Number(score)) ? Number(score) : 0,
      reasons: Array.isArray(reasons) ? reasons : [],
      whatNotToDo: Array.isArray(whatNotToDo) ? whatNotToDo : [],
      intelVersion,
      raw: r
    };
  }

  function renderCheckResult(n) {
    setBand(n.band);
    setScore(n.score);

    const b = String(n.band).toUpperCase();
    if (b === "CRITICAL") setLead("Stop. High-risk indicators detected.");
    else if (b === "SUSPICIOUS") setLead("Pause. Risk markers detected.");
    else setLead("No strong scam indicators detected.");

    renderList("why", n.reasons);
    renderList("dont", n.whatNotToDo);
    setTech(n.raw);

    showResult();
  }

  function bindUI() {
    const clearBtn = $("clearBtn");
    const scanBtn = $("scanBtn");
    const rawEl = $("raw");
    const fileEl = $("file");

    if (clearBtn && rawEl) {
      clearBtn.onclick = () => {
        rawEl.value = "";
        rawEl.focus();
      };
    }

    if (scanBtn && rawEl) {
      scanBtn.onclick = async () => {
        const raw = rawEl.value || "";
        if (!raw.trim()) {
          setBand("SUSPICIOUS");
          setScore(0);
          setLead("Paste something first.");
          renderList("why", ["No input provided."]);
          renderList("dont", ["Don’t click links or share details until you’ve checked the message."]);
          setTech({ note: "empty input", apiBase: API_BASE });
          showResult();
          return;
        }

        try {
          setBusy(true);
          setLead("Checking…");
          showResult();

          const r = await postCheck(raw);
          const n = normaliseCheckResponse(r);
          renderCheckResult(n);
        } catch (e) {
          const n = normaliseCheckResponse({
            success: false,
            error: "Network error",
            details: String(e && e.message ? e.message : e)
          });
          renderCheckResult(n);
        } finally {
          setBusy(false);
        }
      };
    }

    if (rawEl) {
      rawEl.addEventListener("keydown", (ev) => {
        if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
          ev.preventDefault();
          const btn = $("scanBtn");
          if (btn) btn.click();
        }
      });
    }

    const exampleOtp = $("exampleOtp");
    if (exampleOtp && rawEl) {
      exampleOtp.onclick = () => {
        rawEl.value = "Your OTP is 123456. Please share your PIN and CVV immediately to keep your account active.";
        const btn = $("scanBtn");
        if (btn) btn.click();
      };
    }

    const exampleSafe = $("exampleSafe");
    if (exampleSafe && rawEl) {
      exampleSafe.onclick = () => {
        rawEl.value = "Hi, just a reminder that our meeting is tomorrow at 10:00. See you then.";
        const btn = $("scanBtn");
        if (btn) btn.click();
      };
    }

    // Screenshot upload placeholder (not wired in text-only baseline)
    if (fileEl) {
      fileEl.addEventListener("change", () => {
        const f = fileEl.files && fileEl.files[0];
        if (!f) return;

        setBand("SUSPICIOUS");
        setScore(0);
        setLead("Screenshot upload is not enabled in this public test build yet.");
        renderList("why", [
          "This UI can select a file, but the backend is currently expecting text-only JSON.",
          "To scan screenshots, we need an OCR path wired safely."
        ]);
        renderList("dont", [
          "Don’t trust screenshots as proof.",
          "If money is involved, verify via official channels you find yourself (not links in the message)."
        ]);
        setTech({ file: { name: f.name, type: f.type, size: f.size }, apiBase: API_BASE });
        showResult();

        // reset so selecting same file again triggers change
        fileEl.value = "";
      });
    }
  }

  async function init() {
    setBand("SAFE");
    setScore(0);

    // Intel banner
    try {
      const intel = await getIntel();
      const intelEl = $("intel");
      if (!intelEl) return;

      if (intel.success) {
        intelEl.textContent =
          `Intel: ${intel.data.version} | counts: ` +
          JSON.stringify(intel.data.counts) +
          (intel.data.degraded ? " | DEGRADED" : "");
      } else {
        intelEl.textContent = "Intel load failed: " + (intel.details || intel.error || "");
      }
    } catch {
      const intelEl = $("intel");
      if (intelEl) intelEl.textContent = "Intel request error.";
    }

    bindUI();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
