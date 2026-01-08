#!/usr/bin/env node
/**
 * Intel Builder (ops-only)
 * - Reads backend/data/scamIntel.json (base)
 * - Reads all scam_updates/*.json (deltas)
 * - Validates strict entry shape: {value, category, weight}
 * - Dedupes by normalized value per list
 * - Writes backend/data/scamIntel.json only if valid + changed
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const UPDATES_DIR = path.join(REPO_ROOT, "scam_updates");
const INTEL_PATH = path.join(REPO_ROOT, "backend", "data", "scamIntel.json");

const LISTS = ["knownBadDomains", "scamDomainKeywords", "saOfficialDomains", "scamPatterns"];

function readJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function writeJson(p, obj) {
  const out = JSON.stringify(obj, null, 2) + "\n";
  fs.writeFileSync(p, out, "utf8");
}

function normalizeValue(v) {
  return String(v || "").trim().toLowerCase();
}

function isPlainObject(x) {
  return x && typeof x === "object" && !Array.isArray(x);
}

function assertDeltaShape(delta, filename) {
  if (!isPlainObject(delta)) throw new Error(`${filename}: root must be an object`);

  // Must contain only the four lists (no extra keys)
  const keys = Object.keys(delta);
  for (const k of keys) {
    if (!LISTS.includes(k)) throw new Error(`${filename}: unexpected key "${k}" (only ${LISTS.join(", ")})`);
  }
  for (const list of LISTS) {
    if (!(list in delta)) throw new Error(`${filename}: missing key "${list}"`);
    if (!Array.isArray(delta[list])) throw new Error(`${filename}: "${list}" must be an array`);
  }

  // Validate each entry object strictly
  for (const list of LISTS) {
    delta[list].forEach((item, idx) => {
      if (!isPlainObject(item)) throw new Error(`${filename}: ${list}[${idx}] must be an object`);

      const itemKeys = Object.keys(item).sort().join(",");
      const requiredKeys = ["category", "value", "weight"].sort().join(",");
      if (itemKeys !== requiredKeys) {
        throw new Error(
          `${filename}: ${list}[${idx}] must have EXACT keys { "value","category","weight" } (got {${itemKeys}})`
        );
      }

      const valueNorm = normalizeValue(item.value);
      if (!valueNorm) throw new Error(`${filename}: ${list}[${idx}].value cannot be empty`);

      if (typeof item.category !== "string") throw new Error(`${filename}: ${list}[${idx}].category must be a string`);

      if (typeof item.weight !== "number" || Number.isNaN(item.weight)) {
        throw new Error(`${filename}: ${list}[${idx}].weight must be a number`);
      }
    });
  }
}

function bumpVersion(v) {
  // expects "v14"
  const m = /^v(\d+)$/.exec(String(v || ""));
  if (!m) return "v1";
  const n = parseInt(m[1], 10);
  return `v${n + 1}`;
}

function main() {
  if (!fs.existsSync(INTEL_PATH)) {
    console.error(`ERROR: Missing ${INTEL_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(UPDATES_DIR)) {
    console.error(`ERROR: Missing ${UPDATES_DIR}`);
    process.exit(1);
  }

  const base = readJson(INTEL_PATH);

  // Ensure base has lists
  for (const list of LISTS) {
    if (!Array.isArray(base[list])) base[list] = [];
  }
  const baseVersion = base.version;

  // Load delta files (ignore template)
  const deltaFiles = fs
    .readdirSync(UPDATES_DIR)
    .filter(f => f.toLowerCase().endsWith(".json"))
    .filter(f => !f.toLowerCase().includes("template"))
    .sort();

  const deltas = [];
  for (const f of deltaFiles) {
    const p = path.join(UPDATES_DIR, f);
    const delta = readJson(p);
    assertDeltaShape(delta, f);
    deltas.push({ file: f, data: delta });
  }

  // Build working sets with dedupe maps per list
  const seen = Object.fromEntries(LISTS.map(l => [l, new Set()]));
  const out = { ...base };

  // seed seen with existing base values
  for (const list of LISTS) {
    const uniq = [];
    for (const item of out[list]) {
      const key = normalizeValue(item?.value);
      if (!key) continue;
      if (seen[list].has(key)) continue;
      seen[list].add(key);
      uniq.push(item);
    }
    out[list] = uniq;
  }

  const report = {
    added: Object.fromEntries(LISTS.map(l => [l, 0])),
    skippedDupes: Object.fromEntries(LISTS.map(l => [l, 0])),
    files: deltaFiles.length
  };

  // apply deltas in filename order
  for (const { file, data } of deltas) {
    for (const list of LISTS) {
      for (const item of data[list]) {
        const key = normalizeValue(item.value);
        if (seen[list].has(key)) {
          report.skippedDupes[list] += 1;
          continue;
        }
        seen[list].add(key);
        out[list].push(item);
        report.added[list] += 1;
      }
    }
  }

  // Deterministic sort by value
  for (const list of LISTS) {
    out[list].sort((a, b) => normalizeValue(a.value).localeCompare(normalizeValue(b.value)));
  }

  // If nothing added, do not bump version or write
  const anyAdded = LISTS.some(l => report.added[l] > 0);
  if (!anyAdded) {
    console.log("No changes detected (no new unique entries). No write performed.");
    process.exit(0);
  }

  out.version = bumpVersion(baseVersion);

  // Write new intel
  writeJson(INTEL_PATH, out);

  console.log("Intel build complete ✅");
  console.log(`- Base version: ${baseVersion} → New version: ${out.version}`);
  console.log(`- Delta files processed: ${report.files}`);
  console.log("- Added:", report.added);
  console.log("- Skipped duplicates:", report.skippedDupes);
}

try {
  main();
} catch (err) {
  console.error("BUILD FAILED ❌");
  console.error(err.message || err);
  process.exit(1);
}
