'use strict';

function buildExplanation(scored, intel) {
  const band = scored.band;
  const score = scored.score;

  const reasons = Array.isArray(scored.reasons) ? scored.reasons : [];

  const why =
    band === 'CRITICAL'
      ? ['High-risk scam indicators detected. Pause and verify before you act.']
      : band === 'SUSPICIOUS'
        ? ['Some risk markers were detected. Verify independently before taking action.']
        : ['No high-confidence scam indicators were detected in the pasted content.'];

  const whatNotToDo =
    band === 'CRITICAL'
      ? [
          'Do not share OTP, PIN, CVV, or passwords.',
          'Do not click unexpected links.',
          'Do not pay into a private individual’s account.',
          'Contact the organisation using official channels you look up yourself.'
        ]
      : band === 'SUSPICIOUS'
        ? [
            'Do not rush. Verify the sender and links independently.',
            'Avoid sharing personal details until verified.'
          ]
        : ['If money, urgency, or credentials are involved, verify anyway.'];

  return {
    band,
    score,
    reasons,
    why,
    whatNotToDo,
    intelVersion: intel?.version || 'unknown'
  };
}

module.exports = { buildExplanation };
