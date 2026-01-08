'use strict';

function httpIntelHandler(req, res) {
  const intelState = req.app.locals.intelState || {};
  const intel = intelState.intel || {};
  const degraded = !!intelState.degraded;

  const counts = {
    knownBadDomains: Array.isArray(intel.knownBadDomains) ? intel.knownBadDomains.length : 0,
    scamDomainKeywords: Array.isArray(intel.scamDomainKeywords) ? intel.scamDomainKeywords.length : 0,
    saOfficialDomains: Array.isArray(intel.saOfficialDomains) ? intel.saOfficialDomains.length : 0,
    scamPatterns: Array.isArray(intel.scamPatterns) ? intel.scamPatterns.length : 0
  };

  res.status(200).json({
    success: true,
    data: {
      version: intel.version || 'unknown',
      counts,
      degraded
    },
    message: 'OK'
  });
}

module.exports = { httpIntelHandler };
