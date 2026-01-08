'use strict';

const express = require('express');
const { httpCheckHandler } = require('./http/handlers/httpCheckHandler');
const { httpIntelHandler } = require('./http/handlers/httpIntelHandler');

const router = express.Router();

// Locked routes
router.get('/intel', httpIntelHandler);
router.post('/check', httpCheckHandler);

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
