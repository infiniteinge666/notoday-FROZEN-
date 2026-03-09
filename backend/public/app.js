"use strict";

const scanInput = document.getElementById("scanInput");
const scanBtn = document.getElementById("scanBtn");
const uploadBtn = document.getElementById("uploadBtn");
const cameraBtn = document.getElementById("cameraBtn");
const clearBtn = document.getElementById("clearBtn");
const imageUpload = document.getElementById("imageUpload");
const removeImageBtn = document.getElementById("removeImageBtn");
const previewTray = document.getElementById("previewTray");
const previewImage = document.getElementById("previewImage");
const previewMeta = document.getElementById("previewMeta");
const charCount = document.getElementById("charCount");
const typingState = document.getElementById("typingState");
const themePulseBtn = document.getElementById("themePulseBtn");

const resultCard = document.getElementById("resultCard");
const resultGlyph = document.getElementById("resultGlyph");
const resultBand = document.getElementById("resultBand");
const resultSummary = document.getElementById("resultSummary");
const riskScoreValue = document.getElementById("riskScoreValue");
const riskMeterBar = document.getElementById("riskMeterBar");
const signalState = document.getElementById("signalState");
const signalInput = document.getElementById("signalInput");
const signalConfidence = document.getElementById("signalConfidence");

let uploadedImageDataUrl = "";
let uploadedImageName = "";
let isScanning = false;
let typingTimer = null;

function setCardState(state) {
  resultCard.className = `result-card glass-panel state-${state}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeScore(score) {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) return null;
  return clamp(Math.round(numeric), 0, 100);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}

function updateCharCount() {
  const length = scanInput.value.length;
  charCount.textContent = String(length);

  if (length === 0) {
    typingState.innerHTML = `<span class="live-dot"></span>Ready`;
    return;
  }

  typingState.innerHTML = `<span class="live-dot"></span>Typing`;

  window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => {
    typingState.innerHTML = `<span class="live-dot"></span>Input loaded`;
  }, 700);
}

function getInputModeLabel() {
  if (uploadedImageDataUrl && scanInput.value.trim()) return "Hybrid";
  if (uploadedImageDataUrl) return "Screenshot";
  return "Text";
}

function setIdleState() {
  setCardState("idle");
  resultGlyph.textContent = "◎";
  resultBand.textContent = "Ready";
  resultSummary.textContent = "Waiting for text or screenshot input.";
  riskScoreValue.textContent = "--";
  riskMeterBar.style.width = "0%";
  signalState.textContent = "Idle";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = "--";
}

function setUploadingState(file) {
  setCardState("idle");
  resultGlyph.textContent = "◌";
  resultBand.textContent = "Image loaded";
  resultSummary.textContent = "Screenshot attached and ready for scan.";
  riskScoreValue.textContent = "--";
  riskMeterBar.style.width = "0%";
  signalState.textContent = "Prepared";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = file ? formatFileSize(file.size) : "--";
}

function setScanningState() {
  setCardState("scanning");
  resultGlyph.textContent = "◔";
  resultBand.textContent = "Scanning";
  resultSummary.textContent = "Analyzing linguistic pressure, urgency, and suspicious patterns…";
  riskScoreValue.textContent = "...";
  riskMeterBar.style.width = "68%";
  signalState.textContent = "Scanning";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = "Model active";
}

function setEmptyState() {
  setCardState("error");
  resultGlyph.textContent = "!";
  resultBand.textContent = "Nothing to scan";
  resultSummary.textContent = "Paste text or upload a screenshot before starting a scan.";
  riskScoreValue.textContent = "--";
  riskMeterBar.style.width = "0%";
  signalState.textContent = "Blocked";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = "--";
}

function renderResult(data) {
  const bandRaw = String(data?.band || "UNKNOWN").toUpperCase();
  const score = normalizeScore(data?.score);
  const confidence = data?.confidence ?? (score === null ? "--" : `${Math.max(55, 100 - Math.abs(50 - score))}%`);

  let state = "idle";
  let glyph = "◎";
  let heading = bandRaw;
  let summary = "Analysis complete.";

  switch (bandRaw) {
    case "SAFE":
      state = "safe";
      glyph = "✓";
      heading = "Safe";
      summary = "Low-risk patterns detected. Still verify links and sender identity.";
      break;
    case "SUSPICIOUS":
      state = "suspicious";
      glyph = "!";
      heading = "Suspicious";
      summary = "Potential manipulation or scam indicators were found. Review carefully.";
      break;
    case "CRITICAL":
      state = "critical";
      glyph = "⨯";
      heading = "Critical";
      summary = "Strong scam or coercion signals detected. Do not click, pay, or respond yet.";
      break;
    default:
      state = "idle";
      glyph = "?";
      heading = "Unknown";
      summary = "The scan returned an unclassified result.";
      break;
  }

  setCardState(state);
  resultGlyph.textContent = glyph;
  resultBand.textContent = heading;
  resultSummary.textContent = summary;
  riskScoreValue.textContent = score === null ? "--" : `${score}/100`;
  riskMeterBar.style.width = score === null ? "0%" : `${score}%`;
  signalState.textContent = heading;
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = typeof confidence === "number" ? `${confidence}%` : String(confidence);
}

function renderErrorState(message = "Server unavailable. Try again in a moment.") {
  setCardState("error");
  resultGlyph.textContent = "×";
  resultBand.textContent = "Error";
  resultSummary.textContent = message;
  riskScoreValue.textContent = "--";
  riskMeterBar.style.width = "0%";
  signalState.textContent = "Failed";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = "--";
}

function openFilePicker() {
  imageUpload.click();
}

function resetImage() {
  uploadedImageDataUrl = "";
  uploadedImageName = "";
  imageUpload.value = "";
  previewImage.removeAttribute("src");
  previewMeta.textContent = "Ready for scan";
  previewTray.classList.add("hidden");

  if (!scanInput.value.trim()) {
    setIdleState();
  } else {
    signalInput.textContent = getInputModeLabel();
  }
}

function clearAll() {
  scanInput.value = "";
  charCount.textContent = "0";
  typingState.innerHTML = `<span class="live-dot"></span>Ready`;
  resetImage();
  setIdleState();
  scanInput.focus();
}

function setLoading(enabled) {
  isScanning = enabled;
  scanBtn.disabled = enabled;
  uploadBtn.disabled = enabled;
  cameraBtn.disabled = enabled;
  clearBtn.disabled = enabled;

  if (enabled) {
    scanBtn.querySelector(".scan-button-label").textContent = "Scanning…";
    scanBtn.querySelector(".scan-button-meta").textContent = "Checking risk signals";
  } else {
    scanBtn.querySelector(".scan-button-label").textContent = "Run Shield Scan";
    scanBtn.querySelector(".scan-button-meta").textContent = "Private analysis preview";
  }
}

scanInput.addEventListener("input", updateCharCount);

scanInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    scanBtn.click();
  }
});

uploadBtn.addEventListener("click", openFilePicker);
cameraBtn.addEventListener("click", openFilePicker);
clearBtn.addEventListener("click", clearAll);
removeImageBtn.addEventListener("click", resetImage);

imageUpload.addEventListener("change", () => {
  const file = imageUpload.files?.[0];
  if (!file) return;

  uploadedImageName = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageDataUrl = String(reader.result || "");
    previewImage.src = uploadedImageDataUrl;
    previewMeta.textContent = `${uploadedImageName || "image"} · ${formatFileSize(file.size)}`;
    previewTray.classList.remove("hidden");
    setUploadingState(file);
  };
  reader.readAsDataURL(file);
});

scanBtn.addEventListener("click", async () => {
  if (isScanning) return;

  const text = scanInput.value.trim();
  const hasImage = Boolean(uploadedImageDataUrl);

  if (!text && !hasImage) {
    setEmptyState();
    return;
  }

  setLoading(true);
  setScanningState();

  try {
    const payload = { text };

    /**
     * Kept compatible with the existing backend contract:
     * original app only sent { text } to /check.
     * We add image fields only when present, which most backends will safely ignore.
     */
    if (hasImage) {
      payload.image = uploadedImageDataUrl;
      payload.imageName = uploadedImageName;
    }

    const response = await fetch("/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    renderResult(json?.data || {});
  } catch (error) {
    renderErrorState("Scan failed. The server could not complete the request.");
  } finally {
    setLoading(false);
  }
});

themePulseBtn.addEventListener("click", () => {
  document.body.animate(
    [
      { filter: "saturate(1) brightness(1)" },
      { filter: "saturate(1.06) brightness(1.02)" },
      { filter: "saturate(1) brightness(1)" }
    ],
    {
      duration: 900,
      easing: "cubic-bezier(.2,.8,.2,1)"
    }
  );
});

updateCharCount();
setIdleState();