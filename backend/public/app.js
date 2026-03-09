"use strict";

const scanInput = document.getElementById("scanInput");
const scanBtn = document.getElementById("scanBtn");
const scanButtonTitle = document.getElementById("scanButtonTitle");
const scanButtonSubtitle = document.getElementById("scanButtonSubtitle");

const uploadBtn = document.getElementById("uploadBtn");
const clearBtn = document.getElementById("clearBtn");
const imageUpload = document.getElementById("imageUpload");
const removeImageBtn = document.getElementById("removeImageBtn");

const previewTray = document.getElementById("previewTray");
const previewImage = document.getElementById("previewImage");
const previewMeta = document.getElementById("previewMeta");

const charCount = document.getElementById("charCount");
const typingState = document.getElementById("typingState");

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
let uploadedImageBase64 = "";
let uploadedImageName = "";
let isScanning = false;
let typingTimer = null;

function setCardState(state) {
  resultCard.className = `result-panel state-${state}`;
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
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const formatted = value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1);
  return `${formatted} ${units[index]}`;
}

function getInputModeLabel() {
  const hasText = scanInput.value.trim().length > 0;
  const hasImage = Boolean(uploadedImageBase64);

  if (hasText && hasImage) return "Hybrid";
  if (hasImage) return "Screenshot";
  return "Text";
}

function updateTypingState(label) {
  typingState.innerHTML = `<span class="status-dot"></span><span>${label}</span>`;
}

function updateCharCount() {
  const count = scanInput.value.length;
  charCount.textContent = String(count);

  if (count === 0) {
    updateTypingState(uploadedImageBase64 ? "Image loaded" : "Ready");
    signalInput.textContent = getInputModeLabel();
    return;
  }

  updateTypingState("Typing");

  window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => {
    updateTypingState("Input loaded");
  }, 700);

  signalInput.textContent = getInputModeLabel();
}

function updateScanAvailability() {
  const hasText = scanInput.value.trim().length > 0;
  const hasImage = Boolean(uploadedImageBase64);
  scanBtn.disabled = isScanning || (!hasText && !hasImage);
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

function setPreparedState(metaText = "--") {
  setCardState("idle");
  resultGlyph.textContent = "◌";
  resultBand.textContent = "Prepared";
  resultSummary.textContent = "Input is attached and ready for analysis.";
  riskScoreValue.textContent = "--";
  riskMeterBar.style.width = "0%";
  signalState.textContent = "Prepared";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = metaText;
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

function setScanningState() {
  setCardState("scanning");
  resultGlyph.textContent = "◔";
  resultBand.textContent = "Scanning";
  resultSummary.textContent = "Analyzing urgency, manipulation patterns, and suspicious signals…";
  riskScoreValue.textContent = "...";
  riskMeterBar.style.width = "68%";
  signalState.textContent = "Scanning";
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = "Model active";
}

function renderResult(data) {
  const bandRaw = String(data?.band || "UNKNOWN").toUpperCase();
  const score = normalizeScore(data?.score);
  const reasons = Array.isArray(data?.reasons) ? data.reasons : [];
  const firstReason = reasons[0] || "";

  let derivedConfidence = "--";
  if (typeof data?.confidence === "number") {
    derivedConfidence = `${clamp(Math.round(data.confidence), 0, 100)}%`;
  } else if (score !== null) {
    derivedConfidence = `${Math.max(55, 100 - Math.abs(50 - score))}%`;
  }

  let state = "idle";
  let glyph = "?";
  let heading = "Unknown";
  let summary = firstReason || "The scan returned an unclassified result.";

  if (bandRaw === "SAFE") {
    state = "safe";
    glyph = "✓";
    heading = "Safe";
    summary = firstReason || "Low-risk patterns detected. Still verify the sender and any linked destination.";
  } else if (bandRaw === "SUSPICIOUS") {
    state = "suspicious";
    glyph = "!";
    heading = "Suspicious";
    summary = firstReason || "Potential scam or manipulation indicators were found. Review carefully before acting.";
  } else if (bandRaw === "CRITICAL") {
    state = "critical";
    glyph = "⨯";
    heading = "Critical";
    summary = firstReason || "Strong scam or coercion signals detected. Do not click, pay, or reply yet.";
  }

  setCardState(state);
  resultGlyph.textContent = glyph;
  resultBand.textContent = heading;
  resultSummary.textContent = summary;
  riskScoreValue.textContent = score === null ? "--" : `${score}/100`;
  riskMeterBar.style.width = score === null ? "0%" : `${score}%`;
  signalState.textContent = heading;
  signalInput.textContent = getInputModeLabel();
  signalConfidence.textContent = derivedConfidence;
}

function renderErrorState(message = "Scan failed. The server could not complete the request.") {
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

function setLoadingState(enabled) {
  isScanning = enabled;

  scanBtn.disabled = enabled;
  uploadBtn.disabled = enabled;
  clearBtn.disabled = enabled;
  if (removeImageBtn) removeImageBtn.disabled = enabled;

  if (enabled) {
    scanButtonTitle.textContent = "Scanning";
    scanButtonSubtitle.textContent = "Please wait";
  } else {
    scanButtonTitle.textContent = "Scan";
    scanButtonSubtitle.textContent = "Shield analysis";
    updateScanAvailability();
  }
}

function openFilePicker() {
  imageUpload.click();
}

function resetImage() {
  uploadedImageDataUrl = "";
  uploadedImageBase64 = "";
  uploadedImageName = "";
  imageUpload.value = "";
  previewImage.removeAttribute("src");
  previewMeta.textContent = "Ready for scan";
  previewTray.classList.add("hidden");

  if (scanInput.value.trim()) {
    setPreparedState(`${scanInput.value.trim().length} chars`);
  } else {
    setIdleState();
  }

  updateScanAvailability();
}

function clearAll() {
  scanInput.value = "";
  charCount.textContent = "0";
  updateTypingState("Ready");
  resetImage();
  setIdleState();
  updateScanAvailability();
  scanInput.focus();
}

async function parseJsonSafely(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }
}

scanInput.addEventListener("input", () => {
  updateCharCount();

  if (scanInput.value.trim() || uploadedImageBase64) {
    const metaText = uploadedImageBase64
      ? "Input attached"
      : `${scanInput.value.trim().length} chars`;
    setPreparedState(metaText);
  } else {
    setIdleState();
  }

  updateScanAvailability();
});

scanInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    scanBtn.click();
  }
});

uploadBtn.addEventListener("click", openFilePicker);
clearBtn.addEventListener("click", clearAll);
removeImageBtn.addEventListener("click", resetImage);

imageUpload.addEventListener("change", () => {
  const file = imageUpload.files?.[0];
  if (!file) return;

  uploadedImageName = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageDataUrl = String(reader.result || "");
    uploadedImageBase64 = uploadedImageDataUrl.includes(",")
      ? uploadedImageDataUrl.split(",")[1]
      : uploadedImageDataUrl;

    previewImage.src = uploadedImageDataUrl;
    previewMeta.textContent = `${uploadedImageName} · ${formatFileSize(file.size)}`;
    previewTray.classList.remove("hidden");
    updateTypingState("Screenshot loaded");
    setPreparedState(formatFileSize(file.size));
    updateScanAvailability();
  };

  reader.readAsDataURL(file);
});

scanBtn.addEventListener("click", async () => {
  if (isScanning) return;

  const text = scanInput.value.trim();
  const hasImage = Boolean(uploadedImageBase64);

  if (!text && !hasImage) {
    setEmptyState();
    updateScanAvailability();
    return;
  }

  setLoadingState(true);
  setScanningState();

  try {
    const payload = { text };

    if (hasImage) {
      payload.image = uploadedImageBase64;
      payload.imageName = uploadedImageName;
    }

    const response = await fetch("/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const json = await parseJsonSafely(response);

    if (!response.ok) {
      throw new Error(json?.message || `HTTP ${response.status}`);
    }

    renderResult(json?.data || {});
    updateTypingState("Scan complete");
  } catch (error) {
    renderErrorState(error.message || "Scan failed. The server could not complete the request.");
    updateTypingState("Unavailable");
  } finally {
    setLoadingState(false);
  }
});

updateCharCount();
setIdleState();
updateScanAvailability();