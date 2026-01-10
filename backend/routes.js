'use strict';

const express = require('express');
const checkMod = require('./http/handlers/httpCheckHandler');
const intelMod = require('./http/handlers/httpIntelHandler');

const httpCheckHandler = (typeof checkMod === 'function') ? checkMod : checkMod.httpCheckHandler;
const httpIntelHandler = (typeof intelMod === 'function') ? intelMod : intelMod.httpIntelHandler;

const router = express.Router();

// HARD FAIL if handlers are not functions (prevents Express undefined callback crash)
function mustBeFn(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`[routes] ${name} is not a function. Got: ${typeof fn}`);
  }
  return fn;
}

router.get('/intel', mustBeFn(httpIntelHandler, 'httpIntelHandler'));
router.post('/check', mustBeFn(httpCheckHandler, 'httpCheckHandler'));

// Unknown routes must fail closed and return bounded JSON (never HTML)
router.use((req, res) => {
  res.status(200).json({
    success: true,
    data: {
      band: 'SUSPICIOUS',
      score: 50,
      reasons: ['Unknown route (fail-closed).'],
      degraded: true
    },
    message: 'OK'
  });
});

module.exports = router;
