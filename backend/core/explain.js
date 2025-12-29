'use strict';

// Curated guidance per category (non-shaming, practical).
const CATEGORY_GUIDE = {
  credentials: {
    why: 'Asking for OTP/PIN/CVV/password is a direct account-takeover tactic.',
    dont: [
      'Do not share OTP/PIN/CVV/password — not with anyone, ever.',
      'Do not screenshot or share banking-app screens.',
      'Contact your bank via the official app or printed number.'
    ]
  },
  payment: {
    why: 'Pressure to pay fees fast (often into personal accounts) is a common extraction pattern.',
    dont: [
      'Do not pay into a private individual’s account.',
      'Do not pay “release / admin / clearance / activation” fees from messages.',
      'Verify fees only via official websites or apps you open yourself.'
    ]
  },
  authority: {
    why: 'Threats (fines, summons, arrest) are used to trigger panic and fast compliance.',
    dont: [
      'Do not pay “fines” from links in messages.',
      'Go directly to the official site/app (type it yourself).',
      'If you’re unsure, phone the institution using a trusted number.'
    ]
  },
  delivery: {
    why: 'Parcel scams mimic tracking notices to push “customs” or “delivery” payments.',
    dont: [
      'Do not click tracking links you didn’t request.',
      'Open the courier site manually and paste the tracking number.',
      'Do not pay customs/delivery fees from message links.'
    ]
  },
  jobs: {
    why: 'Task/job scams start with small wins, then escalate to “fees” and “VIP” upgrades.',
    dont: [
      'Do not pay to “unlock” work, levels, or withdrawals.',
      'Be suspicious of “earn per like/follow” offers.',
      'Never move money to get paid.'
    ]
  },
  investment: {
    why: 'Guaranteed returns and urgent “limited slots” are classic investment bait.',
    dont: [
      'Do not send crypto to strangers or “platforms” from messages.',
      'Avoid “withdrawal fees” — that’s a trap.',
      'Verify providers independently (FSCA checks, official domains, real paperwork).'
    ]
  },
  marketplace: {
    why: 'Marketplace scams abuse fake Proof of Payment and courier narratives.',
    dont: [
      'Do not trust POP screenshots — confirm cleared funds in your own banking app.',
      'Do not refund “extra paid by mistake”.',
      'Avoid payment links sent by buyers.'
    ]
  },
  tech_support: {
    why: 'Fake support uses “account suspended” panic + remote-access tools.',
    dont: [
      'Do not install remote-access apps (AnyDesk/TeamViewer) for “support”.',
      'Do not click “verify account” links in messages.',
      'Open the service site/app manually and check notifications there.'
    ]
  },
  simswap: {
    why: 'SIM-swap tactics aim to intercept OTPs and reset accounts.',
    dont: [
      'Do not share one-time pins.',
      'If you suspect a SIM swap, contact your network via official channels immediately.',
      'Enable extra security (SIM swap lock / port-out PIN) if available.'
    ]
  },
  loan: {
    why: 'Loan scams demand upfront fees for “processing/insurance”.',
    dont: [
      'Do not pay upfront fees to receive a loan.',
      'Verify lenders independently (registration, physical address, official domain).',
      'Be cautious of “pre-approved” messages you never applied for.'
    ]
  },
  charity: {
    why: 'Emotional pressure + urgency is used to bypass verification.',
    dont: [
      'Do not send money to unverified personal accounts.',
      'Ask for verifiable references (registered org, public footprint).',
      'Pause and confirm through trusted contacts.'
    ]
  },
  prize: {
    why: 'Prize scams demand “fees/tax” to release winnings that don’t exist.',
    dont: [
      'Do not pay to claim a prize.',
      'Do not share personal documents to “verify” winnings.',
      'Verify competitions on the organiser’s official channels.'
    ]
  },
  romance: {
    why: 'Romance scams isolate you (“don’t tell anyone”) then escalate to money requests.',
    dont: [
      'Do not send money to someone you haven’t met and verified.',
      'Do not keep money requests secret.',
      'If it feels rushed, it’s a signal — pause.'
    ]
  },
  recovery: {
    why: 'Paid “recovery” services are almost always follow-up scams.',
    dont: [
      'Do not pay “recovery fees” or deposits.',
      'Do not trust unsolicited “investigators” or “hackers”.',
      'Collect evidence and report via proper channels.'
    ]
  },
  extortion: {
    why: 'Extortion threats are designed to force panic payments.',
    dont: [
      'Do not pay blackmail demands.',
      'Do not continue the conversation — save evidence.',
      'Report via appropriate channels and secure your accounts.'
    ]
  }
};

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const s of arr || []) {
    const k = String(s || '').trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function buildExplanation(scored, intelVersion) {
  const hits = scored.hits || [];
  const cats = uniq(hits.map(h => h.category));

  // WHY: pick best 3 reasons (human readable)
  const why = [];
  for (const c of cats) {
    const g = CATEGORY_GUIDE[c];
    if (g && g.why) why.push(g.why);
  }

  // fallback: if we have no category guide hits
  if (why.length === 0) {
    if (scored.band === 'SAFE') why.push('No high-confidence scam indicators were detected in the pasted content.');
    else why.push('Some risk markers were detected, but they are not absolute proof on their own.');
  }

  // WHAT NOT TO DO: merge category guidance + universal rules
  const dont = [];
  for (const c of cats) {
    const g = CATEGORY_GUIDE[c];
    if (g && g.dont) dont.push(...g.dont);
  }

  // Universal non-negotiables
  dont.push(
    'Do not share OTP/PIN/CVV or banking passwords.',
    'Do not click links you did not expect.',
    'Do not pay into a private individual’s account.'
  );

  return {
    band: scored.band,
    score: scored.score,
    why: uniq(why).slice(0, 6),
    whatNotToDo: uniq(dont).slice(0, 8),
    reasons: scored.reasons || [],
    intelVersion: intelVersion || 'unknown',
    degraded: false
  };
}

module.exports = {
  buildExplanation
};
