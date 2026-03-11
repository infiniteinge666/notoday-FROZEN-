"use strict";

const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "..", "logs", "scan.log");

try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
} catch (_) {}

function logScan(req) {
    try {
        const ts = Date.now();

        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket?.remoteAddress ||
            "unknown";

        const ua =
            (req.headers["user-agent"] || "unknown")
            .replace(/\s+/g, " ")
            .substring(0, 80);

        fs.appendFile(LOG_FILE, `${ts}|${ip}|${ua}\n`, () => {});
    } catch (_) {}
}

module.exports = { logScan };