'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');
const { loadIntel } = require('../../intel/loadIntel');

function decodeBase64Image(dataUrl) {
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) return null;

  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 2 * 1024 * 1024) return null; // 2MB limit

  return buffer;
}

module.exports = async function httpCheckHandler(req, res) {
  try {
    const intel = loadIntel();
    let rawText = '';
    let ingressType = 'TEXT';
    let ocrMeta = null;

    if (req.body && req.body.imageBase64) {
      const imageBuffer = decodeBase64Image(req.body.imageBase64);

      if (!imageBuffer) {
        return res.json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 0,
            ingressType: 'IMAGE',
            ocr: { success: false },
            explanation: [
              'The image could not be processed safely.',
              'Try uploading a clearer screenshot or paste the text instead.'
            ]
          },
          message: 'OK'
        });
      }

      const ocrResult = await runOCR(imageBuffer);
      ingressType = 'IMAGE';

      if (!ocrResult.success || !ocrResult.text) {
        return res.json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 0,
            ingressType,
            ocr: { success: false },
            explanation: [
              'We could not reliably read text from this image.',
              'Try a clearer screenshot or paste the message text.'
            ]
          },
          message: 'OK'
        });
      }

      rawText = ocrResult.text;
      ocrMeta = {
        success: true,
        chars: rawText.length,
        excerpt: rawText.slice(0, 200)
      };

    } else {
      rawText = (req.body && req.body.raw) ? String(req.body.raw) : '';
    }

    const result = runCheck(rawText, intel);

    return res.json({
      success: true,
      data: {
        ...result,
        ingressType,
        ...(ocrMeta ? { ocr: ocrMeta } : {})
      },
      message: 'OK'
    });

  } catch (err) {
    return res.json({
      success: true,
      data: {
        band: 'SUSPICIOUS',
        score: 0,
        explanation: [
          'The system could not complete this scan safely.',
          'Please try again with different input.'
        ]
      },
      message: 'OK'
    });
  }
};
