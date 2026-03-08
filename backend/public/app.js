"use strict";

/* ---------------- DOM ---------------- */

const scanInput = document.getElementById("inputText");
const scanBtn = document.getElementById("scanBtn");
const uploadBtn = document.getElementById("uploadBtn");
const pasteBtn = document.getElementById("pasteBtn");
const imageUpload = document.getElementById("imageInput");

const resultDiv = document.getElementById("resultBox");

const clearBtn = document.getElementById("clearBtn");
const intelBtn = document.getElementById("intelBtn");

/* ---------------- UI ---------------- */

function display(data) {

  const band = data?.band || "UNKNOWN";
  const score = data?.score ?? "-";
  const reasons = (data?.reasons || []).join("<br>");

  resultDiv.innerHTML = `
    <div class="result-left">
      <div class="band">${band}</div>
      <div class="score">Score: ${score}</div>
    </div>
    <div class="hint">
      ${reasons || "Scan completed."}
    </div>
  `;

}

function resetUI() {

  resultDiv.innerHTML = `
    <div class="result-left">
      <div class="band">READY</div>
      <div class="score">Score: 0</div>
    </div>
    <div class="hint">
      Paste a suspicious message or upload a screenshot.
    </div>
  `;

}

/* ---------------- TEXT SCAN ---------------- */

scanBtn.onclick = async () => {

  const text = scanInput.value.trim();

  if (!text) return;

  try {

    const response = await fetch("/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text
      })
    });

    const data = await response.json();

    display(data.data);

  } catch (err) {

    console.error(err);

    resultDiv.innerHTML = `
      <div class="result-left">
        <div class="band">ERROR</div>
        <div class="score">Scan failed</div>
      </div>
      <div class="hint">
        Unable to contact scanner API.
      </div>
    `;

  }

};

/* ---------------- PASTE BUTTON ---------------- */

pasteBtn.onclick = async () => {

  try {

    const clipboardText = await navigator.clipboard.readText();

    scanInput.value = clipboardText;

  } catch (err) {

    alert("Clipboard access blocked by browser.");

  }

};

/* ---------------- OCR IMAGE ---------------- */

uploadBtn.onclick = () => imageUpload.click();

imageUpload.onchange = () => {

  const file = imageUpload.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (e) => {

    try {

      const response = await fetch("/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageBase64: e.target.result
        })
      });

      const data = await response.json();

      display(data.data);

    } catch (err) {

      console.error(err);

      alert("OCR scan failed.");

    }

  };

  reader.readAsDataURL(file);

};

/* ---------------- CLEAR ---------------- */

clearBtn.onclick = () => {

  scanInput.value = "";

  resetUI();

};

/* ---------------- INTEL INFO ---------------- */

if (intelBtn) {

  intelBtn.onclick = async () => {

    try {

      const response = await fetch("/intel");

      const data = await response.json();

      alert(
        "Intel version: " +
        data.data.version +
        "\nPatterns: " +
        data.data.counts.scamPatterns +
        "\nKnown bad domains: " +
        data.data.counts.knownBadDomains
      );

    } catch (err) {

      alert("Unable to load intel information.");

    }

  };

}

/* ---------------- INIT ---------------- */

resetUI();