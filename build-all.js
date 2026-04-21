#!/usr/bin/env node
// Cross-compile the sq-notice SEA binary for all 6 target platforms:
//   darwin-x64, darwin-arm64, linux-x64, linux-arm64, win-x64, win-arm64
//
// Strategy:
//   1. Build one arch-independent SEA blob via sea-config.cross.json
//      (useCodeCache: false so V8 bytecode isn't baked in).
//   2. Download the matching-version Node runtime for each target from
//      nodejs.org (parallelized), extract, then postject the blob in.
//   3. macOS targets get codesigned (host must be darwin; it is here).
//
// Usage:
//   node build-all.js            # build all 6 targets
//   node build-all.js --clean    # wipe build/ first (keeps .node-cache)
//   node build-all.js --no-cache # also wipe the downloaded-Node cache

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { spawnSync, spawn } = require('node:child_process');

const ROOT = __dirname;
const BUILD_DIR = path.join(ROOT, 'build');
const CACHE_DIR = path.join(BUILD_DIR, '.node-cache');
const NPX_CACHE = path.join(BUILD_DIR, '.npm-cache');
const BIN_NAME = 'sq-notice';
const SENTINEL_FUSE = 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2';
const NODE_VERSION = process.version; // e.g. 'v20.20.1'
const CROSS_CONFIG = path.join(ROOT, 'sea-config.cross.json');
const CROSS_BLOB = path.join(BUILD_DIR, 'sea-prep.cross.blob');

const TARGETS = [
  { platform: 'darwin', arch: 'x64',   ext: '',     ar: 'tar.xz' },
  { platform: 'darwin', arch: 'arm64', ext: '',     ar: 'tar.xz' },
  { platform: 'linux',  arch: 'x64',   ext: '',     ar: 'tar.xz' },
  { platform: 'linux',  arch: 'arm64', ext: '',     ar: 'tar.xz' },
  { platform: 'win',    arch: 'x64',   ext: '.exe', ar: 'zip'    },
  { platform: 'win',    arch: 'arm64', ext: '.exe', ar: 'zip'    },
];

function runSync(cmd, args, opts = {}) {
  process.stderr.write(`$ ${cmd} ${args.join(' ')}\n`);
  const env = { ...process.env, ...(opts.env || {}) };
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts, env });
  if (r.status !== 0) {
    throw new Error(`Command failed (exit ${r.status}): ${cmd} ${args.join(' ')}`);
  }
}

function runCapture(cmd, args, opts = {}) {
  const env = { ...process.env, ...(opts.env || {}) };
  const r = spawnSync(cmd, args, { cwd: ROOT, ...opts, env });
  if (r.status !== 0) {
    throw new Error(`Command failed (exit ${r.status}): ${cmd} ${args.join(' ')}\n${r.stderr?.toString() || ''}`);
  }
  return r.stdout?.toString() || '';
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = dest + '.part';
    const file = fs.createWriteStream(tmp);
    const doReq = (u, depth = 0) => {
      if (depth > 5) return reject(new Error(`Too many redirects: ${u}`));
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doReq(new URL(res.headers.location, u).toString(), depth + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed: ${u} -> HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => {
          fs.renameSync(tmp, dest);
          resolve();
        }));
      }).on('error', (err) => {
        try { file.close(); fs.unlinkSync(tmp); } catch {}
        reject(err);
      });
    };
    doReq(url);
  });
}

async function fetchAndExtract(target) {
  const base = `node-${NODE_VERSION}-${target.platform}-${target.arch}`;
  const archive = `${base}.${target.ar}`;
  const archivePath = path.join(CACHE_DIR, archive);
  const extractedDir = path.join(CACHE_DIR, base);

  if (!fs.existsSync(archivePath)) {
    const url = `https://nodejs.org/dist/${NODE_VERSION}/${archive}`;
    process.stderr.write(`[fetch] ${url}\n`);
    await download(url, archivePath);
  } else {
    process.stderr.write(`[cache] ${archive}\n`);
  }

  if (!fs.existsSync(extractedDir)) {
    if (target.ar === 'zip') {
      runSync('unzip', ['-o', '-q', archivePath, '-d', CACHE_DIR]);
    } else {
      runSync('tar', ['-xf', archivePath, '-C', CACHE_DIR]);
    }
  }

  const nodeBin = target.platform === 'win'
    ? path.join(extractedDir, 'node.exe')
    : path.join(extractedDir, 'bin', 'node');

  if (!fs.existsSync(nodeBin)) {
    throw new Error(`Node binary not found at ${nodeBin}`);
  }
  return nodeBin;
}

function buildSeaBlob() {
  runSync(process.execPath, ['scripts/build-bundle.js']);
  runSync(process.execPath, ['--experimental-sea-config', CROSS_CONFIG]);
  if (!fs.existsSync(CROSS_BLOB)) {
    throw new Error(`Expected ${CROSS_BLOB} to exist after sea-config step`);
  }
}

// Warm npx cache with postject once so parallel runs don't all race to install it.
function warmPostject() {
  fs.mkdirSync(NPX_CACHE, { recursive: true });
  process.stderr.write('[npx] warming postject cache\n');
  // Touch: --help to pre-install without doing anything
  const r = spawnSync('npx', ['-y', 'postject', '--help'], {
    cwd: ROOT,
    env: { ...process.env, NPM_CONFIG_CACHE: NPX_CACHE },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  // postject --help exits 0
  if (r.status !== 0) {
    throw new Error(`Failed to warm npx postject cache (exit ${r.status})`);
  }
}

function injectAndSign(target, nodeBin) {
  const suffix = `${target.platform}-${target.arch}`;
  const outName = `${BIN_NAME}-${suffix}${target.ext}`;
  const outPath = path.join(BUILD_DIR, outName);

  fs.copyFileSync(nodeBin, outPath);
  fs.chmodSync(outPath, 0o755);

  const isMac = target.platform === 'darwin';
  const hostIsMac = process.platform === 'darwin';

  if (isMac) {
    if (hostIsMac) {
      runSync('codesign', ['--remove-signature', outPath]);
    } else {
      process.stderr.write(`[warn] host is ${process.platform}, can't strip codesign from ${outName}; postject may fail\n`);
    }
  }

  const postjectArgs = ['-y', 'postject', outPath, 'NODE_SEA_BLOB', CROSS_BLOB, '--sentinel-fuse', SENTINEL_FUSE];
  if (isMac) postjectArgs.push('--macho-segment-name', 'NODE_SEA');
  runSync('npx', postjectArgs, { env: { NPM_CONFIG_CACHE: NPX_CACHE } });

  if (isMac && hostIsMac) {
    runSync('codesign', ['--sign', '-', outPath]);
  }

  const stat = fs.statSync(outPath);
  return { outPath, bytes: stat.size };
}

async function main() {
  const argv = new Set(process.argv.slice(2));
  if (argv.has('--clean')) {
    // Keep the node cache; just wipe build outputs
    for (const entry of fs.readdirSync(BUILD_DIR, { withFileTypes: true })) {
      if (entry.name === '.node-cache') continue;
      fs.rmSync(path.join(BUILD_DIR, entry.name), { recursive: true, force: true });
    }
  }
  if (argv.has('--no-cache')) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  // 1. Cross-compat SEA blob (once, arch-independent)
  process.stderr.write('\n=== Building cross-compat SEA blob ===\n');
  buildSeaBlob();

  // 2. Warm postject cache so parallel invocations don't race
  warmPostject();

  // 3. Fetch + extract Node runtimes in parallel
  process.stderr.write('\n=== Fetching Node runtimes (parallel) ===\n');
  const fetched = await Promise.all(
    TARGETS.map(async (t) => {
      try {
        const bin = await fetchAndExtract(t);
        return { target: t, bin, ok: true };
      } catch (err) {
        return { target: t, ok: false, err: err.message };
      }
    })
  );

  // 4. Inject + sign (sequential — fast, and keeps codesign/postject output readable)
  process.stderr.write('\n=== Injecting SEA blob into each runtime ===\n');
  const results = [];
  for (const f of fetched) {
    const t = f.target;
    const label = `${t.platform}-${t.arch}`;
    if (!f.ok) {
      process.stderr.write(`\n--- SKIP ${label}: fetch failed: ${f.err} ---\n`);
      results.push({ target: t, ok: false, err: `fetch: ${f.err}` });
      continue;
    }
    process.stderr.write(`\n--- ${label} ---\n`);
    try {
      const { outPath, bytes } = injectAndSign(t, f.bin);
      results.push({ target: t, ok: true, outPath, bytes });
    } catch (err) {
      results.push({ target: t, ok: false, err: err.message });
    }
  }

  // 5. Summary
  process.stderr.write('\n=== Build Summary ===\n');
  let anyFail = false;
  for (const r of results) {
    const label = `${r.target.platform}-${r.target.arch}`;
    if (r.ok) {
      const mb = (r.bytes / 1024 / 1024).toFixed(1);
      process.stderr.write(`  OK   ${label}  ${path.basename(r.outPath)}  (${mb} MB)\n`);
    } else {
      anyFail = true;
      process.stderr.write(`  FAIL ${label}  ${r.err}\n`);
    }
  }
  if (anyFail) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`build-all failed: ${err.stack || err.message}\n`);
  process.exit(1);
});
