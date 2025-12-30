// app.js — NoToday Public Test UI (canonical)
// Rule: always call the API origin (never the static UI origin).

const API_BASE =
  (window.__NOTODAY_API__ && String(window.__NOTODAY_API__)) ||
  document.querySelector('meta[name="notoday-api"]')?.content ||
  "https://api.notoday.co.za";

const $ = (id) => document.getElementById(id);

/* ---------------------------
   Anonymous device token
   (no identity, no tracking)
---------------------------- */
function getDeviceTokenHash() {
  const key = "notoday_device_token";
  let token = localStorage.getItem(key);

  if (!token) {
    token =
      (crypto.randomUUID && crypto.randomUUID()) ||
      (Math.random().toString(36).slice(2) + Date.now());
    localStorage.setItem(key, token);
  }
  return token;
}

/* ---------------------------
   UI helpers
---------------------------- */
function setBand(band) {
  const allowed = ["SAFE", "SUSPICIOUS", "CRITICAL"];
  const b = allowed.includes(String(band).toUpperCase())
    ? String(band).toUpperCase()
    : "SUSPICIOUS";

  document.documentElement.setAttribute("data-band", b);
  $("bandText").textContent = b;
}

function setScore(value) {
  const n = Number.isFinite(Number(value))
    ? Math.max(0, Math.min(100, Number(value)))
    : 0;
  $("scoreNum").textContent = String(n);
}

function clearList(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function renderList(id, items) {
  const ul = $(id);
  clearList(ul);

  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No details available.";
    ul.appendChild(li);
    return;
  }

  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = String(item);
    ul.appendChild(li);
  }
}

function setLead(text) {
  $("lead").textContent = String(text || "");
}

function setTech(obj) {
  $("tech").textContent =
    typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

function showResult() {
  $("result").classList.remove("result-hidden");
}

function setBusy(state) {
  const btn = $("scanBtn");
  btn.disabled = !!state;
  btn.classList.toggle("btn-busy", !!state);
  btn.textContent = state ? "CHECKING…" : "CHECK";
}

/* ---------------------------
   Network safety
---------------------------- */
async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!ct.includes("application/json")) {
    return {
      success: false,
      error: "Network error",
      details: `Expected JSON, got "${ct || "unknown"}". Snippet: ${text.slice(0, 120)}`
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      success: false,
      error: "Network error",
      details: `Invalid JSON. Snippet: ${text.slice(0, 120)}`
    };
  }
}

/* ---------------------------
   API calls
---------------------------- */
async function getIntel() {
  const res = await fetch(`${API_BASE}/intel`);
  return safeJson(res);
}

async function postCheck(raw) {
  const res = await fetch(`${API_BASE}/check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      raw: String(raw || ""),
      deviceTokenHash: getDeviceTokenHash()
    })
  });
  return safeJson(res);
}

/* ---------------------------
   Response normalisation
---------------------------- */
function normaliseCheckResponse(r) {
  const ok = !!(r && r.success);
  const payload = r?.data || r || {};

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
    band: payload.band || "SUSPICIOUS",
    score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : 0,
    reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
    whatNotToDo: Array.isArray(payload.whatNotToDo) ? payload.whatNotToDo : [],
    intelVersion: payload.intelVersion || payload.version || "unknown",
    raw: r
  };
}

/* ---------------------------
   Render result
---------------------------- */
function renderCheckResult(n) {
  setBand(n.band);
  setScore(n.score);

  if (n.band === "CRITICAL") {
    setLead("Stop. High-risk indicators detected.");
  } else if (n.band === "SUSPICIOUS") {
    setLead("Pause. Risk markers detected.");
  } else {
    setLead("No strong scam indicators detected.");
  }

  renderList("why", n.reasons);
  renderList("dont", n.whatNotToDo);
  setTech(n.raw);
  showResult();
}

/* ---------------------------
   Bind UI
---------------------------- */
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
      renderList("dont", ["Don’t click links or share details until checked."]);
      setTech({ note: "empty input" });
      showResult();
      return;
    }

    try {
      setBusy(true);
      setLead("Checking…");
      showResult();

      const r = await postCheck(raw);
      renderCheckResult(normaliseCheckResponse(r));
    } catch (e) {
      renderCheckResult(
        normaliseCheckResponse({
          success: false,
          error: "Network error",
          details: String(e?.message || e)
        })
      );
    } finally {
      setBusy(false);
    }
  };

  $("raw").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      $("scanBtn").click();
    }
  });

  $("exampleOtp").onclick = () => {
    $("raw").value =
      "Your OTP is 123456. Please share your PIN and CVV immediately.";
    $("scanBtn").click();
  };

  $("exampleSafe").onclick = () => {
    $("raw").value =
      "Hi, just a reminder that our meeting is tomorrow at 10:00.";
    $("scanBtn").click();
  };

  $("file").addEventListener("change", () => {
    const f = $("file").files?.[0];
    if (!f) return;

    setBand("SUSPICIOUS");
    setScore(0);
    setLead("Screenshot scanning is not enabled in this public test build.");
    renderList("why", [
      "This UI accepts files, but OCR is not wired yet."
    ]);
    renderList("dont", [
      "Do not trust screenshots as proof.",
      "Verify independently before sending money."
    ]);
    setTech({ file: { name: f.name, size: f.size, type: f.type } });
    showResult();
    $("file").value = "";
  });
}

/* ---------------------------
   Init
---------------------------- */
(async function init() {
  setBand("SAFE");
  setScore(0);

  try {
    const intel = await getIntel();
    $("intel").textContent = intel.success
      ? `Intel: ${intel.data.version} | counts: ${JSON.stringify(intel.data.counts)}`
      : "Intel load failed.";
  } catch {
    $("intel").textContent = "Intel request error.";
  }

  bindUI();
})();
