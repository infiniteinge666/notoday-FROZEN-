'use strict';

const { runCheck } = require('../../core/engine');
const { runOCR } = require('../../core/ocr');

function decodeBase64Image(dataUrl) {
  const s = String(dataUrl || '').trim();

  // data URL path
  const match = s.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
  if (match) {
    try {
      const buffer = Buffer.from(match[3], 'base64');
      if (buffer.length > 4 * 1024 * 1024) return null; // 4MB hard limit
      return buffer;
    } catch {
      return null;
    }
  }

  // raw base64 fallback
  try {
    const buffer = Buffer.from(s, 'base64');
    if (!buffer.length || buffer.length > 4 * 1024 * 1024) return null;
    return buffer;
  } catch {
    return null;
  }
}

module.exports = async function httpCheckHandler(req, res) {
  try {
    const intelState = req.app.locals.intelState || {};
    const intel = intelState.intel || null;
    const degraded = !!intelState.degraded;

    let rawText = '';
    let ingressType = 'TEXT';
    let ocrMeta = null;

    const imagePayload =
      req.body?.imageBase64 ||
      req.body?.image ||
      null;

    if (imagePayload) {
      ingressType = 'IMAGE';

      const imageBuffer = decodeBase64Image(imagePayload);

      if (!imageBuffer) {
        return res.status(200).json({
          success: true,
          data: {
            band: 'SUSPICIOUS',
            score: 50,
            ingressType,
            degraded: true,
            ocr: { success: false },
            reasons: ['Image could not be processed safely (invalid or too large).'],
            explanation: [
              'The image could not be processed safely.',
              'Try uploading or pasting a clearer screenshot, or paste the text instead.'
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
            ocr: {
              success: false,
              ...(ocrResult?.error ? { error: ocrResult.error } : {})
            },
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
      // Accept BOTH "raw" and "text" input fields
      rawText = (req.body?.raw || req.body?.text || '');
      rawText = String(rawText).trim();
    }

    if (!rawText) {
      return res.status(200).json({
        success: true,
        data: {
          band: 'SAFE',
          score: 0,
          ingressType,
          degraded: false,
          reasons: ['No input provided.'],
          why: ['Paste a message, link, email, or screenshot to scan.'],
          whatNotToDo: ['Never paste OTPs / PINs / CVV.'],
          intelVersion: intel?.version || 'unknown'
        },
        message: 'OK'
      });
    }

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