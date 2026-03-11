"use strict";

const { runCheck } = require("../../core/engine");
const { loadIntelOrDie } = require("../../intel/loadIntel");
const { logScan } = require("../../core/scanLogger");

const INTEL_PATH = require("path").join(
    __dirname,
    "../../data/scamIntel.json"
);

/*
   HTTP /check handler
   deterministic
   logging added
*/

async function httpCheckHandler(req, res) {
    try {

        const body = req.body || {};
        const text = body.text || "";
        const ingressType = body.ingressType || "TEXT";

        /* --- minimal scan logging --- */
        logScan({
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
            ingress: ingressType,
            len: text.length
        });

        /* --- load intel --- */
        const intel = loadIntelOrDie(INTEL_PATH);

        /* --- run engine --- */
        const result = await runCheck({
            text,
            ingressType,
            intel
        });

        res.json({
            success: true,
            data: result,
            message: "OK"
        });

    } catch (err) {

        console.error("[checkHandler]", err);

        res.status(500).json({
            success: false,
            message: "Scan failure"
        });
    }
}

module.exports = httpCheckHandler;