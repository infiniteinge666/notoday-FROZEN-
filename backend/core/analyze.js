"use strict";

const normalize = require("./normalize");
const match = require("./match");
const score = require("./score");
const explain = require("./explain");

function analyze(input, intel) {

  const normalized = normalize(input);

  const evidence = match(normalized, intel);

  const scoring = score(evidence);

  const explanation = explain(scoring, evidence);

  return {
    band: scoring.band,
    score: scoring.score,
    reasons: explanation.reasons,
    why: explanation.why,
    whatNotToDo: explanation.whatNotToDo
  };

}

module.exports = analyze;