'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');

function decodeBase64Image(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) return null;

  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 2 * 1024 * 1024) return null; // 2MB limit (hard)

  return buffer;
}

module.exports = async function httpCheckHandler(req, res) {
  try {
    // Intel is loaded ONCE at boot in server.js and stored here
    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || null;
    const degraded = !!intelState.degraded;

    let rawText = '';
    let ingressType = 'TEXT';
    let ocrMeta = null;

    // IMAGE path (base64 data URL)
    if (req.body && req.body.imageBase64) {
      ingressType = 'IMAGE';
      const imageBuffer = decodeBase64Image(req.body.imageBase64);

      if (!imageBuffer) {
        return res.status(200).json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 50,
            ingressType,
            degraded: true,
            ocr: { success: false },
            reasons: ['Image could not be processed safely (invalid/too large).'],
            explanation: [
              'The image could not be processed safely.',
              'Try uploading a clearer screenshot or paste the text instead.'
            ]
          },
          message: 'OK'
        });
      }

      const ocrResult = await runOCR(imageBuffer);

      if (!ocrResult.success || !ocrResult.text) {
        return res.status(200).json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 50,
            ingressType,
            degraded: true,
            ocr: { success: false },
            reasons: ['OCR could not reliably extract text.'],
            explanation: [
              'We could not reliably read text from this image.',
              'Try a clearer screenshot or paste the message text.'
            ]
          },
          message: 'OK'
        });
      }

      rawText = String(ocrResult.text || '').trim();
      ocrMeta = {
        success: true,
        chars: rawText.length,
        excerpt: rawText.slice(0, 200)
      };
    } else {
      // TEXT path
      rawText = (req.body && req.body.raw) ? String(req.body.raw) : '';
      rawText = rawText.trim();
    }

    // Empty input -> bounded safe response (no scan)
    if (!rawText) {
      return res.status(200).json({
        success: true,
        data: {
          band: 'SAFE',
          score: 0,
          ingressType,
          degraded: false,
          reasons: ['No input provided.'],
          why: ['Paste a message, link, or email to scan.'],
          whatNotToDo: ['Never paste OTPs / PINs / CVV.'],
          intelVersion: intel?.version || 'unknown'
        },
        message: 'OK'
      });
    }

    // Fail-closed if intel is unavailable or degraded
    if (!intel || degraded) {
      return res.status(200).json({
        success: true,
        data: {
          band: 'SUSPICIOUS',
          score: 50,
          ingressType,
          degraded: true,
          reasons: ['Intel store unavailable (degraded mode).'],
          explanation: [
            'The system is running in degraded mode and cannot complete a reliable scan right now.',
            'Please try again shortly.'
          ],
          ...(ocrMeta ? { ocr: ocrMeta } : {})
        },
        message: 'OK'
      });
    }

    // Run scan
    const result = runCheck(rawText, intel);

    return res.status(200).json({
      success: true,
      data: {
        ...result,
        ingressType,
        degraded: false,
        ...(ocrMeta ? { ocr: ocrMeta } : {})
      },
      message: 'OK'
    });

  } catch (err) {
    // Bounded failure response (never HTML)
    return res.status(200).json({
      success: true,
      data: {
        band: 'SUSPICIOUS',
        score: 50,
        degraded: true,
        reasons: ['System error (bounded).'],
        explanation: [
          'The system could not complete this scan safely.',
          'Please try again with different input.'
        ]
      },
      message: 'OK'
    });
  }
};
