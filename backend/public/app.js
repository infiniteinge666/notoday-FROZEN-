"use strict";

/* ---------------- DOM ---------------- */

const scanInput = document.getElementById("scanInput");
const scanBtn = document.getElementById("scanBtn");
const uploadBtn = document.getElementById("uploadBtn");
const imageUpload = document.getElementById("imageUpload");
const clearBtn = document.getElementById("clearBtn");
const intelBtn = document.getElementById("intelBtn");

const bandLabel = document.getElementById("bandLabel");
const scoreLabel = document.getElementById("scoreLabel");
const reasonText = document.getElementById("reasonText");
const whyText = document.getElementById("whyText");
const inputHelp = document.getElementById("inputHelp");

const previewWrap = document.getElementById("previewWrap");
const previewImage = document.getElementById("previewImage");
const previewMeta = document.getElementById("previewMeta");

const API_BASE = window.location.origin;

/* ---------------- STATE ---------------- */

let selectedImageBase64 = "";
let selectedImageName = "";
let isScanning = false;

/* ---------------- HELPERS ---------------- */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hasTextInput() {
  return scanInput.value.trim().length > 0;
}

function hasImageInput() {
  return selectedImageBase64.trim().length > 0;
}

function hasAnyInput() {
  return hasTextInput() || hasImageInput();
}

function setBandClass(band) {
  const normalized = String(band || "READY").toUpperCase();
  bandLabel.classList.remove(
    "band-ready",
    "band-safe",
    "band-suspicious",
    "band-critical",
    "band-error"
  );

  switch (normalized) {
    case "SAFE":
      bandLabel.classList.add("band-safe");
      break;
    case "SUSPICIOUS":
      bandLabel.classList.add("band-suspicious");
      break;
    case "CRITICAL":
      bandLabel.classList.add("band-critical");
      break;
    case "ERROR":
      bandLabel.classList.add("band-error");
      break;
    default:
      bandLabel.classList.add("band-ready");
      break;
  }
}

function updateScanButtonState() {
  scanBtn.disabled = isScanning || !hasAnyInput();
}

function showPreview(dataUrl, metaText) {
  previewImage.src = dataUrl;
  previewMeta.textContent = metaText || "Ready to scan";
  previewWrap.classList.remove("hidden");
}

function hidePreview() {
  previewImage.removeAttribute("src");
  previewMeta.textContent = "Ready to scan";
  previewWrap.classList.add("hidden");
}

function resetStatusCard() {
  bandLabel.textContent = "READY";
  scoreLabel.textContent = hasAnyInput()
    ? "Input loaded"
    : "Waiting for input";
  reasonText.textContent = hasAnyInput()
    ? "Ready to scan. Press SCAN when you want NoToday to check it."
    : "Upload a screenshot from Photos or paste a suspicious message.";
  whyText.innerHTML = "";
  setBandClass("READY");
}

function setScanningState() {
  bandLabel.textContent = "SCANNING";
  scoreLabel.textContent = "Checking...";
  reasonText.textContent = "Analyzing your input now.";
  whyText.innerHTML = "";
  setBandClass("READY");
}

function renderArrayLines(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
}

function displayResult(payload) {
  const data = payload?.data || {};
  const band = String(data.band || "UNKNOWN").toUpperCase();
  const score =
    typeof data.score === "number" ? `Score ${data.score}` : "Scan complete";

  const reasons = Array.isArray(data.reasons) ? data.reasons : [];
  const why = Array.isArray(data.why) ? data.why : [];
  const whatNotToDo = Array.isArray(data.whatNotToDo) ? data.whatNotToDo : [];

  bandLabel.textContent = band;
  scoreLabel.textContent = score;
  setBandClass(band);

  if (reasons.length > 0) {
    reasonText.textContent = reasons[0];
  } else {
    reasonText.textContent = "Scan complete.";
  }

  const whyBlock = [];
  if (why.length > 0) {
    whyBlock.push(
      `<div class="nt-list-block"><strong>Why:</strong>${renderArrayLines(why)}</div>`
    );
  }
  if (whatNotToDo.length > 0) {
    whyBlock.push(
      `<div class="nt-list-block"><strong>Do not:</strong>${renderArrayLines(whatNotToDo)}</div>`
    );
  }

  whyText.innerHTML = whyBlock.join("");
}

function displayError(message) {
  bandLabel.textContent = "ERROR";
  scoreLabel.textContent = "Try again";
  reasonText.textContent = message || "Something went wrong.";
  whyText.innerHTML = "";
  setBandClass("ERROR");
}

function clearImageState() {
  selectedImageBase64 = "";
  selectedImageName = "";
  imageUpload.value = "";
  hidePreview();
}

function resetAll() {
  scanInput.value = "";
  clearImageState();
  inputHelp.innerHTML =
    'Paste text here, or tap <strong>Screenshot</strong> to choose from Photos.';
  resetStatusCard();
  updateScanButtonState();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));

    reader.readAsDataURL(file);
  });
}

async function safeJson(response) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new Error(`Expected JSON but received: ${text.slice(0, 200)}`);
  }
}

/* ---------------- EVENTS ---------------- */

scanInput.addEventListener("input", () => {
  resetStatusCard();
  updateScanButtonState();
});

uploadBtn.addEventListener("click", () => {
  imageUpload.click();
});

imageUpload.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    displayError("Please choose an image from Photos.");
    clearImageState();
    updateScanButtonState();
    return;
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const base64 = String(dataUrl).split(",")[1] || "";

    selectedImageBase64 = base64;
    selectedImageName = file.name || "screenshot";

    showPreview(dataUrl, "Screenshot selected from Photos");
    inputHelp.innerHTML =
      'Screenshot uploaded ✓ Press <strong>SCAN</strong> to analyze it.';
    resetStatusCard();
    updateScanButtonState();
  } catch (error) {
    displayError(error.message || "Could not load screenshot.");
    clearImageState();
    updateScanButtonState();
  }
});

clearBtn.addEventListener("click", () => {
  resetAll();
});

scanBtn.addEventListener("click", async () => {
  if (!hasAnyInput() || isScanning) return;

  isScanning = true;
  updateScanButtonState();
  setScanningState();

  const payload = {};

  if (hasTextInput()) {
    payload.text = scanInput.value.trim();
  }

  if (hasImageInput()) {
    payload.image = selectedImageBase64;
  }

  try {
    const response = await fetch(`${API_BASE}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await safeJson(response);

    if (!response.ok) {
      throw new Error(json?.message || "Scan failed.");
    }

    displayResult(json);

    if (hasImageInput()) {
      const reasonCount =
        Array.isArray(json?.data?.reasons) && json.data.reasons.length > 0
          ? json.data.reasons.length
          : 0;

      previewMeta.textContent =
        reasonCount > 0
          ? `Screenshot scanned successfully`
          : `Screenshot uploaded`;
    }
  } catch (error) {
    displayError(error.message || "Could not complete scan.");
  } finally {
    isScanning = false;
    updateScanButtonState();
  }
});

intelBtn.addEventListener("click", async () => {
  try {
    const response = await fetch(`${API_BASE}/intel`);
    const json = await safeJson(response);

    if (!response.ok) {
      throw new Error(json?.message || "Could not load intel.");
    }

    const data = json?.data || {};
    const counts = data.counts || {};

    bandLabel.textContent = "INTEL";
    scoreLabel.textContent = `v${String(data.version || "").replace(/^v/i, "") || "?"}`;
    reasonText.textContent = "Current live intelligence loaded.";
    whyText.innerHTML = `
      <div class="nt-list-block">
        <div><strong>Known bad domains:</strong> ${escapeHtml(counts.knownBadDomains ?? "-")}</div>
        <div><strong>Scam keywords:</strong> ${escapeHtml(counts.scamDomainKeywords ?? "-")}</div>
        <div><strong>Official domains:</strong> ${escapeHtml(counts.saOfficialDomains ?? "-")}</div>
        <div><strong>Scam patterns:</strong> ${escapeHtml(counts.scamPatterns ?? "-")}</div>
      </div>
    `;
    setBandClass("READY");
  } catch (error) {
    displayError(error.message || "Could not load intel.");
  }
});

document.addEventListener("paste", async (event) => {
  const items = event.clipboardData?.items;
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (item.type && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (!file) return;

      try {
        const dataUrl = await fileToDataUrl(file);
        const base64 = String(dataUrl).split(",")[1] || "";

        selectedImageBase64 = base64;
        selectedImageName = "pasted-image";

        showPreview(dataUrl, "Screenshot pasted successfully");
        inputHelp.innerHTML =
          'Screenshot pasted ✓ Press <strong>SCAN</strong> to analyze it.';
        resetStatusCard();
        updateScanButtonState();
      } catch (error) {
        displayError(error.message || "Could not paste screenshot.");
      }

      event.preventDefault();
      return;
    }
  }
});

/* ---------------- INIT ---------------- */

resetAll();