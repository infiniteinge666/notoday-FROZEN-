'use strict';

const express = require('express');
const path = require('path');

const routes = require('./routes');
const { loadIntel } = require('./intel/loadIntel');

const app = express();
app.disable('x-powered-by');

// Parse JSON only
app.use(express.json({ limit: '256kb' }));

// Serve UI
app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  index: 'index.html'
}));

// Load intel at boot (validated). No runtime mutation.
const intelPath = path.join(__dirname, 'data', 'scamIntel.json');
const intelState = loadIntel(intelPath);
app.locals.intelState = intelState;

// Locked API surface
app.use('/', routes);

// Never return HTML stack traces
app.use((err, req, res, next) => {
  res.status(200).json({
    success: true,
    data: {
      band: 'SUSPICIOUS',
      score: 50,
      reasons: ['System error (bounded).'],
      degraded: true
    },
    message: 'OK'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const intel = intelState?.intel || null;
  const version = intel?.version || 'unknown';
  const degraded = !!intelState?.degraded;

  console.log(`[notoday] listening on :${PORT}`);
  console.log(`[notoday] intelPath=${intelState.intelPath} version=${version} degraded=${degraded}`);
});
