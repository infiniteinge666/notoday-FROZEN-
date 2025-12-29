// app.js — NoToday Proof UI (Render baseline)
// Fix: always call the API origin (not the static site origin)

const API_BASE =
  (window.__NOTODAY_API__ && String(window.__NOTODAY_API__)) ||
  document.querySelector('meta[name="notoday-api"]')?.content ||
  "https://notoday.onrender.com"; // <-- set this to your REAL API

async function safeJson(res) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!ct.includes("application/json")) {
    // HTML or text came back instead of JSON
    return {
      success: false,
      error: "Network error",
      details: `Expected JSON but got "${ct || "unknown content-type"}". First 120 chars: ${text.slice(0, 120)}`
    };
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      success: false,
      error: "Network error",
      details: `Invalid JSON returned. First 120 chars: ${text.slice(0, 120)}`
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
    body: JSON.stringify({ raw })
  });
  return safeJson(res);
}

const $ = (id) => document.getElementById(id);

(async () => {
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
  } catch (e) {
    $("intel").textContent = "Intel request error.";
  }

  $("scan").onclick = async () => {
    $("out").textContent = "Scanning…";
    const raw = $("raw").value || "";
    const r = await postCheck(raw);
    $("out").textContent = JSON.stringify(r, null, 2);
  };

  $("otp").onclick = async () => {
    $("raw").value = "Your OTP is 123456. Please share your PIN and CVV immediately.";
    $("scan").click();
  };
})();
