'use strict';

const fs = require("fs");
const path = require("path");
const os = require("os");
const sharp = require("sharp");
const { spawn } = require("child_process");

const TESSERACT_PATH =
  process.env.TESSERACT_PATH ||
  "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

function normalizeInput(input) {

  if (Buffer.isBuffer(input)) return input;

  if (typeof input === "string") {

    const match = input.match(/^data:image\/\w+;base64,(.+)$/);

    if (match) return Buffer.from(match[1], "base64");

    return Buffer.from(input, "base64");

  }

  return null;

}

async function preprocess(buffer) {

  return sharp(buffer)
    .rotate()
    .grayscale()
    .normalize()
    .sharpen()
    .resize({ width: 1400, withoutEnlargement: false })
    .png()
    .toBuffer();

}

async function crop(buffer, region) {

  return sharp(buffer)
    .extract(region)
    .png()
    .toBuffer();

}

async function runTesseract(buffer, psm = 6) {

  const tmp = path.join(os.tmpdir(), `ocr_${Date.now()}.png`);

  fs.writeFileSync(tmp, buffer);

  return new Promise((resolve) => {

    const proc = spawn(TESSERACT_PATH, [
      tmp,
      "stdout",
      "--oem",
      "1",
      "--psm",
      String(psm),
      "-l",
      "eng"
    ]);

    let output = "";

    proc.stdout.on("data", d => output += d.toString());

    proc.on("close", () => {

      try { fs.unlinkSync(tmp); } catch {}

      resolve(output);

    });

  });

}

function cleanText(text) {

  text = text
    .replace(/\r/g, "")
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim()
    .toLowerCase();

  const noise = [
    "reply",
    "forward",
    "delete",
    "menu",
    "search",
    "not spam",
    "learn more",
    "view details"
  ];

  noise.forEach(n => {

    const r = new RegExp(`\\b${n}\\b`, "g");

    text = text.replace(r, "");

  });

  return text;

}

function score(text) {

  let s = 0;

  if (/https?:\/\//.test(text)) s += 20;

  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(text)) s += 15;

  if (/r\s?\d+/i.test(text)) s += 10;

  if (/\+\d{8,}/.test(text)) s += 10;

  if (/urgent|verify|login|secure|claim/.test(text)) s += 20;

  s += text.split(" ").length;

  return s;

}

function buildRegions(width, height) {

  return [

    {
      left: Math.floor(width * 0.05),
      top: Math.floor(height * 0.12),
      width: Math.floor(width * 0.9),
      height: Math.floor(height * 0.75)
    },

    {
      left: Math.floor(width * 0.25),
      top: Math.floor(height * 0.1),
      width: Math.floor(width * 0.7),
      height: Math.floor(height * 0.8)
    },

    {
      left: 0,
      top: 0,
      width,
      height
    }

  ];

}

async function runOCR(input) {

  const buffer = normalizeInput(input);

  if (!buffer) {

    return {
      success: false,
      text: "",
      error: "Invalid image"
    };

  }

  const base = await preprocess(buffer);

  const meta = await sharp(base).metadata();

  const regions = buildRegions(meta.width, meta.height);

  const passes = [];

  for (const region of regions) {

    const cropped = await crop(base, region);

    const raw = await runTesseract(cropped);

    const cleaned = cleanText(raw);

    const sc = score(cleaned);

    passes.push({
      text: cleaned,
      score: sc
    });

  }

  passes.sort((a, b) => b.score - a.score);

  const best = passes[0];

  return {

    success: true,
    text: best.text,
    score: best.score,
    passes

  };

}

module.exports = { runOCR };