#!/usr/bin/env node
// Build the sq-notice SEA binary.
//
// Steps:
//   1. node scripts/build-bundle.js                 (pack licenses)
//   2. node --experimental-sea-config sea-config.json (produce sea blob)
//   3. copy the currently-running node binary to build/sq-notice
//   4. strip the mach-O signature (macOS only)
//   5. npx -y postject build/sq-notice NODE_SEA_BLOB ...
//   6. re-sign (macOS only)
//
// Usage:
//   node build.js            # build for the current platform
//   node build.js --clean    # remove build/ first

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, 'build');
const BIN_NAME = 'sq-notice';
const BIN_PATH = path.join(BUILD_DIR, BIN_NAME);
const SEA_BLOB = path.join(BUILD_DIR, 'sea-prep.blob');
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';

function run(cmd, args, opts = {}) {
  process.stderr.write(`$ ${cmd} ${args.join(' ')}\n`);
  const env = { ...process.env, ...(opts.env || {}) };
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts, env });
  if (r.status !== 0) {
    process.stderr.write(`Command failed (exit ${r.status}): ${cmd} ${args.join(' ')}\n`);
    process.exit(r.status || 1);
  }
}

function main() {
  if (process.argv.includes('--clean')) {
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  // 1. Build the licenses bundle
  run(process.execPath, ['scripts/build-bundle.js']);

  // 2. Produce the SEA blob
  run(process.execPath, ['--experimental-sea-config', 'sea-config.json']);
  if (!fs.existsSync(SEA_BLOB)) {
    throw new Error(`Expected ${SEA_BLOB} to exist after sea-config step`);
  }

  // 3. Copy node binary
  fs.copyFileSync(process.execPath, BIN_PATH);
  fs.chmodSync(BIN_PATH, 0o755);

  // 4. macOS: remove existing signature so postject can modify the binary
  const isMac = process.platform === 'darwin';
  if (isMac) {
    run('codesign', ['--remove-signature', BIN_PATH]);
  }

  // 5. Inject the SEA blob using postject (dev-only dependency fetched via npx)
  const postjectArgs = [
    '-y',
    'postject',
    BIN_PATH,
    'NODE_SEA_BLOB',
    SEA_BLOB,
    '--sentinel-fuse',
    SENTINEL_FUSE,
  ];
  if (isMac) postjectArgs.push('--macho-segment-name', 'NODE_SEA');
  // Route npx through a writable cache directory inside the build folder so we
  // don't collide with root-owned files in ~/.npm (a known legacy-npm issue).
  const npxCache = path.join(BUILD_DIR, '.npm-cache');
  fs.mkdirSync(npxCache, { recursive: true });
  run('npx', postjectArgs, { env: { NPM_CONFIG_CACHE: npxCache } });

  // 6. macOS: re-sign so the binary will run
  if (isMac) {
    run('codesign', ['--sign', '-', BIN_PATH]);
  }

  const stat = fs.statSync(BIN_PATH);
  const mb = (stat.size / 1024 / 1024).toFixed(1);
  process.stderr.write(`\nBuilt ${BIN_PATH} (${mb} MB)\n`);
  process.stderr.write(`Try: ${BIN_PATH} --help\n`);
}

try {
  main();
} catch (err) {
  process.stderr.write(`build failed: ${err.message}\n`);
  process.exit(1);
}
