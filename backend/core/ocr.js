'use strict';

const Tesseract = require('tesseract.js');

const MAX_OCR_CHARS = 8000;
const OCR_TIMEOUT_MS = 12000;

async function runOCR(imageBuffer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng',
      {
        logger: () => {},
        abortSignal: controller.signal
      }
    );

    let text = (result.data.text || '').trim();

    if (!text) {
      return { success: false, text: '' };
    }

    if (text.length > MAX_OCR_CHARS) {
      text = text.slice(0, MAX_OCR_CHARS);
    }

    return {
      success: true,
      text
    };

  } catch (err) {
    return { success: false, text: '' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { runOCR };
