'use strict';

const { spawn } = require('child_process');

function normalizeToBuffer(input) {
  if (!input) return null;

  if (Buffer.isBuffer(input)) {
    return input;
  }

  if (typeof input === 'string') {
    // data URL
    const dataUrlMatch = input.match(/^data:image\/(?:png|jpeg|jpg|webp);base64,(.+)$/i);
    if (dataUrlMatch) {
      try {
        return Buffer.from(dataUrlMatch[1], 'base64');
      } catch {
        return null;
      }
    }

    // raw base64 string
    try {
      return Buffer.from(input, 'base64');
    } catch {
      return null;
    }
  }

  return null;
}

async function runOCR(imageInput) {
  return new Promise((resolve) => {
    try {
      const buffer = normalizeToBuffer(imageInput);

      if (!buffer || !buffer.length) {
        return resolve({
          success: false,
          text: '',
          error: 'Invalid image input'
        });
      }

      // stdin -> stdout OCR
      const tesseract = spawn('tesseract', ['stdin', 'stdout', '-l', 'eng'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (payload) => {
        if (settled) return;
        settled = true;
        resolve(payload);
      };

      const timeout = setTimeout(() => {
        try { tesseract.kill('SIGKILL'); } catch {}
        finish({
          success: false,
          text: '',
          error: 'OCR timed out'
        });
      }, 15000);

      tesseract.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      tesseract.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tesseract.on('error', (err) => {
        clearTimeout(timeout);
        finish({
          success: false,
          text: '',
          error: err.message || 'Failed to start OCR'
        });
      });

      tesseract.on('close', (code) => {
        clearTimeout(timeout);

        const cleaned = String(stdout || '')
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]{2,}/g, ' ')
          .trim();

        if (cleaned.length > 0) {
          return finish({
            success: true,
            text: cleaned,
            exitCode: code,
            stderr: stderr || null
          });
        }

        return finish({
          success: false,
          text: '',
          exitCode: code,
          stderr: stderr || 'No text detected'
        });
      });

      tesseract.stdin.write(buffer);
      tesseract.stdin.end();

    } catch (err) {
      return resolve({
        success: false,
        text: '',
        error: err.message
      });
    }
  });
}

module.exports = { runOCR };