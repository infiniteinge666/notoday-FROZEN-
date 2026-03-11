"use strict";

const fs = require("fs");
const path = require("path");

/*
   Minimal deterministic scan request logger
   - no database
   - no blocking IO
   - append only
   - survives crashes
*/

const LOG_DIR = path.join(__dirname, "../data");
const LOG_FILE = path.join(LOG_DIR, "scanRequests.log");

/* ensure data folder exists */
try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
} catch (_) {}

/* main logger */
function logScan(meta = {}) {
    try {

        const record = {
            t: Date.now(),
            ip: meta.ip || null,
            ingress: meta.ingress || "TEXT",
            len: meta.len || 0
        };

        const line = JSON.stringify(record) + "\n";

        fs.appendFile(LOG_FILE, line, () => {});

    } catch (_) {
        /* silent by design */
    }
}

module.exports = {
    logScan
};