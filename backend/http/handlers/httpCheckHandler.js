'use strict';

const { scan } = require('../../core/engine');

module.exports = function httpCheckHandler(req, res) {
  const intel = req.app.locals.intel;
  const degraded = !!req.app.locals.degraded;

  // Accept { raw: "..." } only (simple, deterministic)
  const raw = (req.body && typeof req.body.raw === 'string') ? req.body.raw : '';

  const result = scan(raw, intel, degraded);

  return res.status(200).json({
    success: true,
    data: result,
    message: 'OK'
  });
};
