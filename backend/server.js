/**
 * NoToday — Render Proof Build (Single Service)
 * LOCKED ROUTE SURFACE: POST /check, GET /intel
 * Canonical intel path: backend/data/scamIntel.json
 * No utils/ folder. No alternate intel locations.
 */
'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const registerRoutes = require('./routes');
const { loadIntelOrDie } = require('./intel/loadIntel');

const app = express();

// Security-ish defaults (minimal, lawful, not “WAF”)
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true }));

// Body limits: keep small; you can increase later if you add image upload.
app.use(express.json({ limit: '256kb' }));

// Boot gate: intel must load & validate OR failsafe must load
const INTEL_PATH = path.join(__dirname, 'data', 'scamIntel.json');
const intelBoot = loadIntelOrDie(INTEL_PATH);

// Make intel available to handlers
app.locals.intel = intelBoot.intel;
app.locals.degraded = intelBoot.degraded;
app.locals.intelPath = INTEL_PATH;

// Static UI
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

// Locked routes
registerRoutes(app);

// Fail-closed for unknown endpoints: return bounded SUSPICIOUS response (not a 404 HTML page)
app.use((req, res) => {
  res.status(200).json({
    success: true,
    data: {
      band: 'SUSPICIOUS',
      score: 60,
      reasons: ['Unknown or unsupported endpoint.'],
      whatNotToDo: ['Do not act on unexpected messages.'],
      intelVersion: app.locals.intel?.version || 'unknown',
      degraded: !!app.locals.degraded
    },
    message: 'Fail-closed.'
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`[notoday] listening on :${port}`);
  console.log(`[notoday] intelPath=${INTEL_PATH} version=${app.locals.intel?.version} degraded=${!!app.locals.degraded}`);
});
