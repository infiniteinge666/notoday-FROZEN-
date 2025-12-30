// app.js — NoToday Public Test UI
// Rule: UI always calls the API origin (not the static UI origin).

const API_BASE =
  (window.__NOTODAY_API__ && String(window.__NOTODAY_API__)) ||
  document.querySelector('meta[name="notoday-api"]')?.content ||
  "https://api.notoday.co.za";

const $ = (id) => document.getElementById(id);

function setBand(band) {
  const allowed = ["SAFE", "SUSPICIOUS", "CRITICAL"];
  const b = allowed.includes(String(band).toUpperCase()) ? String(band).toUpperCase() : "SUSPICIOUS";
  document.documentElement.setAttribute("data-band", b);
  $("bandText").textContent = b;
}

function setScore(n) {
  const num = Number.isFinite(Number(n)) ? Math.max(0, Math.min(100, Number(n))) : 0;
  $("scoreNum").textContent = String(num);
}

function clearList(ul) {
  while (ul.firstChild) ul.removeChild(ul.firstChild);
}

function renderList(ulId, items) {
  const ul = $(ulId);
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
  $("result").classList.remove("result-hidden");
}

function setLead(text) {
  $("lead").textContent = String(text || "");
}

function setTech(obj) {
  $("tech").textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function setBusy(isBusy) {
  const btn = $("scanBtn");
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
  const res = await fetch(`${API_BASE}/intel`, { method: "GET" });
  return safeJson(res);
}

async function postCheck(raw) {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      raw: String(raw || "")
      // deviceTokenHash intentionally omitted in public-test UI baseline
    })
  });
  return safeJson(res);
}

/**
 * Normalise /check responses into a single UI shape.
 * Supports:
 *  - { success:true, data:{ band, score, reasons, whatNotToDo, intelVersion } }
 *  - legacy-ish variants (band/score at top level)
 */
function normaliseCheckResponse(r) {
  const ok = !!(r && r.success);
  const payload = (r && r.data) ? r.data : r;

  const band = payload?.band || payload?.data?.band;
  const score = payload?.score ?? payload?.data?.score ?? payload?.riskScore ?? 0;
  const reasons = payload?.reasons || payload?.why || payload?.data?.reasons;
  const whatNotToDo = payload?.whatNotToDo || payload?.dont || payload?.data?.whatNotToDo;
  const intelVersion = payload?.intelVersion || payload?.data?.intelVersion || payload?.version || "unknown";

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

  if (String(n.band).toUpperCase() === "CRITICAL") {
    setLead("Stop. High-risk indicators detected.");
  } else if (String(n.band).toUpperCase() === "SUSPICIOUS") {
    setLead("Pause. Risk markers detected.");
  } else {
    setLead("No strong scam indicators detected.");
  }

  renderList("why", n.reasons);
  renderList("dont", n.whatNotToDo);
  setTech(n.raw);

  showResult();
}

function bindUI() {
  $("clearBtn").onclick = () => {
    $("raw").value = "";
    $("raw").focus();
  };

  $("scanBtn").onclick = async () => {
    const raw = $("raw").value || "";
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

  // Ctrl+Enter (or Cmd+Enter on Mac)
  $("raw").addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      $("scanBtn").click();
    }
  });

  $("exampleOtp").onclick = () => {
    $("raw").value =
      "Your OTP is 123456. Please share your PIN and CVV immediately to keep your account active.";
    $("scanBtn").click();
  };

  $("exampleSafe").onclick = () => {
    $("raw").value = "Hi, just a reminder that our meeting is tomorrow at 10:00. See you then.";
    $("scanBtn").click();
  };

  // Screenshot upload: not wired in this public baseline.
  $("file").addEventListener("change", () => {
    const f = $("file").files && $("file").files[0];
    if (!f) return;

    setBand("SUSPICIOUS");
    setScore(0);
    setLead("Screenshot upload is not enabled in this public test build yet.");
    renderList("why", [
      "This UI can upload a file, but the backend is currently expecting text-only JSON.",
      "To scan screenshots, we need an OCR path (server-side or client-side) wired safely."
    ]);
    renderList("dont", [
      "Don’t trust screenshots as proof.",
      "If money is involved, verify via official channels you find yourself (not links in the message)."
    ]);
    setTech({ file: { name: f.name, type: f.type, size: f.size }, apiBase: API_BASE });
    showResult();

    $("file").value = "";
  });
}

(async function init() {
  setBand("SAFE");
  setScore(0);

  try {
    const intel = await getIntel();
    if (intel.success) {
      $("intel").textContent =
        `Intel: ${intel.data.version} | counts: ` +
        JSON.stringify(intel.data.counts) +
        (intel.data.degraded ? " | DEGRADED" : "");
    } else {
      $("intel").textContent = "Intel load failed: " + (intel.details || intel.error || "");
    }
  } catch {
    $("intel").textContent = "Intel request error.";
  }

  bindUI();
})();
