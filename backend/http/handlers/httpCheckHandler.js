'use strict';

const engine = require('../../core/engine');

module.exports = function httpCheckHandler(req, res) {
  const intel = req.app.locals.intel;

  // Accept { raw: "..." } only (simple, deterministic)
  const raw = (req.body && typeof req.body.raw === 'string') ? req.body.raw : '';

  // Be compatible with either export shape
  const scanFn = engine.scan || engine.runCheck;

  if (typeof scanFn !== 'function') {
    return res.status(200).json({
      success: true,
      data: {
        band: 'SUSPICIOUS',
        score: 0,
        reasons: ['Scan failed. Engine function missing.'],
        whatNotToDo: ['Do not act on unexpected messages.'],
        intelVersion: (intel && intel.version) ? intel.version : 'unknown'
      },
      message: 'OK'
    });
  }

  const result = scanFn(raw, intel);

  return res.status(200).json({
    success: true,
    data: result,
    message: 'OK'
  });
};
