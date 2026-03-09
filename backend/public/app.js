"use strict";

/* =====================================================
   NOTODAY FRONTEND APP
   Mobile-first scanner UI
===================================================== */

const API_BASE = ""; // same origin

/* ---------------- DOM ---------------- */

const scanInput = document.getElementById("scanInput");
const scanBtn = document.getElementById("scanBtn");
const uploadBtn = document.getElementById("uploadBtn");
const imageUpload = document.getElementById("imageUpload");
const resultDiv = document.getElementById("result");
const clearBtn = document.getElementById("clearBtn");
const intelBtn = document.getElementById("intelBtn");

/* ---------------- Animation helpers ---------------- */

function restartAnimation(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function clearStateClasses() {
  resultDiv.classList.remove(
    "is-safe",
    "is-suspicious",
    "is-critical",
    "is-entering",
    "is-exiting"
  );
}

/* ---------------- Result UI ---------------- */

function display(data) {
  const band = data?.band || "UNKNOWN";
  const score = data?.score ?? "-";

  const reasons = (data?.reasons || []).join("<br>");
  const why = (data?.why || []).join("<br>");
  const whatNotToDo = (data?.whatNotToDo || []).join("<br>");

  clearStateClasses();

  if (band === "SAFE") resultDiv.classList.add("is-safe");
  if (band === "SUSPICIOUS") resultDiv.classList.add("is-suspicious");
  if (band === "CRITICAL") resultDiv.classList.add("is-critical");

  resultDiv.innerHTML = `
    <div class="result-left">
      <div class="band">${band}</div>
      <div class="score">Score: ${score}</div>
    </div>

    <div class="hint">
      ${reasons || "Scan completed."}
    </div>

    ${
      why
        ? `<div class="why">
            <strong>Why:</strong><br>${why}
           </div>`
        : ""
    }

    ${
      whatNotToDo
        ? `<div class="warn">
            <strong>Do not:</strong><br>${whatNotToDo}
           </div>`
        : ""
    }
  `;

  restartAnimation(resultDiv, "is-entering");
}

/* ---------------- Reset UI ---------------- */

function resetUI() {
  clearStateClasses();

  resultDiv.innerHTML = `
    <div class="result-left">
      <div class="band">READY</div>
      <div class="score">Paste text or upload screenshot</div>
    </div>
  `;

  scanInput.value = "";
  imageUpload.value = "";

  restartAnimation(resultDiv, "is-entering");
}

/* ---------------- Input acknowledgement ---------------- */

function acknowledgeInput() {
  restartAnimation(scanInput, "is-ack");
}

/* ---------------- Screenshot Upload ---------------- */

uploadBtn.addEventListener("click", () => {
  imageUpload.click();
});

imageUpload.addEventListener("change", () => {
  if (imageUpload.files.length) {
    acknowledgeInput();
  }
});

/* ---------------- Convert image to Base64 ---------------- */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result.split(",")[1]);
    };

    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

/* ---------------- Scan Logic ---------------- */

async function runScan() {
  const text = scanInput.value.trim();
  const file = imageUpload.files[0];

  if (!text && !file) {
    display({
      band: "SAFE",
      score: 0,
      reasons: ["No input provided."],
      why: ["Paste a message, link, or upload screenshot."],
      whatNotToDo: []
    });
    return;
  }

  scanBtn.disabled = true;
  scanBtn.classList.add("is-scanning");

  try {
    let payload = {};

    if (text) payload.text = text;

    if (file) {
      payload.image = await fileToBase64(file);
    }

    const res = await fetch(`${API_BASE}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const json = await res.json();

    if (json.success) {
      display(json.data);
    } else {
      throw new Error(json.message || "Scan failed");
    }
  } catch (err) {
    console.error(err);

    display({
      band: "SUSPICIOUS",
      score: "-",
      reasons: ["Scan failed."],
      why: ["Network error or server unavailable."],
      whatNotToDo: ["Do not trust suspicious messages."]
    });
  }

  scanBtn.disabled = false;
  scanBtn.classList.remove("is-scanning");
}

/* ---------------- Scan button ---------------- */

scanBtn.addEventListener("click", runScan);

/* ---------------- Clear ---------------- */

clearBtn.addEventListener("click", resetUI);

/* ---------------- Intel button ---------------- */

intelBtn.addEventListener("click", async () => {
  try {
    const res = await fetch(`${API_BASE}/intel`);
    const json = await res.json();

    const intel = json?.data;

    resultDiv.innerHTML = `
      <div class="result-left">
        <div class="band">INTEL</div>
        <div class="score">Version ${intel.version}</div>
      </div>

      <div class="hint">
        Scam patterns: ${intel.scamPatterns}<br>
        Bad domains: ${intel.knownBadDomains}<br>
        Domain keywords: ${intel.scamDomainKeywords}
      </div>
    `;

    restartAnimation(resultDiv, "is-entering");
  } catch (err) {
    console.error(err);

    display({
      band: "SAFE",
      score: "-",
      reasons: ["Intel unavailable"],
      why: ["Server did not respond"],
      whatNotToDo: []
    });
  }
});

/* ---------------- Paste detection ---------------- */

scanInput.addEventListener("paste", () => {
  setTimeout(acknowledgeInput, 0);
});

/* ---------------- Initial state ---------------- */

resetUI();