'use strict';

module.exports = function httpIntelHandler(req, res) {
  const intel = req.app.locals.intel;
  const degraded = !!req.app.locals.degraded;

  const counts = {
    knownBadDomains: (intel.knownBadDomains || []).length,
    scamDomainKeywords: (intel.scamDomainKeywords || []).length,
    saOfficialDomains: (intel.saOfficialDomains || []).length,
    scamPatterns: (intel.scamPatterns || []).length
  };

  return res.status(200).json({
    success: true,
    data: {
      version: intel.version,
      counts,
      degraded
    },
    message: 'OK'
  });
};
