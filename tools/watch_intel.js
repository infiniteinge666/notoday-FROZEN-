'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const UPDATES_DIR = path.join(ROOT, 'scam_updates');

let isRunning = false;
let pending = false;

function runBuild() {
  if (isRunning) {
    pending = true;
    return;
  }

  isRunning = true;
  pending = false;

  console.log('[watch_intel] running build_intel.js ...');

  const p = spawn(
    process.execPath, // node
    [path.join(ROOT, 'tools', 'build_intel.js')],
    { stdio: 'inherit' }
  );

  p.on('close', (code) => {
    isRunning = false;

    if (code === 0) {
      console.log('[watch_intel] build OK ✅');
    } else {
      console.log('[watch_intel] build FAILED ❌ (no changes should be applied)');
    }

    if (pending) runBuild();
  });
}

function safeWatch(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[watch_intel] missing dir: ${dir}`);
    process.exit(1);
  }

  console.log(`[watch_intel] watching: ${dir}`);
  runBuild();

  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    // Ignore obvious temp/editor files
    if (filename.endsWith('.tmp') || filename.endsWith('~')) return;

    console.log(`[watch_intel] change: ${eventType} ${filename}`);
    runBuild();
  });
}

safeWatch(UPDATES_DIR);
