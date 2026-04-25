#!/usr/bin/env node
// Fetch canonical SPDX license texts for every license in src/licenses/index.json.
// Writes each text to src/licenses/texts/{SPDX}.txt.
// Source: https://github.com/spdx/license-list-data (raw .txt files).
//
// Re-run this whenever SonarQube's license catalog changes (or when a new
// SonarQube release adds SPDX ids). Idempotent: skips files already on disk
// unless --force is passed.
//
// Usage:
//   node scripts/fetch-licenses.js              # skip already-downloaded
//   node scripts/fetch-licenses.js --force      # re-download everything
//   node scripts/fetch-licenses.js --refresh-index http://host:9000 TOKEN
//                                               # re-query SonarQube for the
//                                               # SPDX list before fetching

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'src/licenses/index.json');
const TEXTS_DIR = path.join(ROOT, 'src/licenses/texts');
const MANIFEST_PATH = path.join(ROOT, 'src/licenses/manifest.json');

const BASE_URL = 'https://raw.githubusercontent.com/spdx/license-list-data/main/text/';
const CONCURRENCY = 20;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'notice-md-generator' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        return fetchText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(Object.assign(new Error(`HTTP ${res.statusCode} ${url}`), { statusCode: res.statusCode }));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error(`timeout ${url}`)));
  });
}

// Some SPDX ids used by SonarQube don't have a direct text file in the
// license-list-data repo (the bare "-only" or "-or-later" variants share one
// canonical text). Resolve such ids to the file that does exist.
function candidateIds(id) {
  const out = [id];
  // Bare GPL/LGPL/AGPL => try -only variant
  if (/^(A?G|L)PL-\d/.test(id) && !/-only$|-or-later$/.test(id)) {
    out.push(`${id}-only`);
  }
  // Drop a trailing "+" if present (deprecated alias for -or-later)
  if (id.endsWith('+')) out.push(`${id.slice(0, -1)}-or-later`);
  return out;
}

async function fetchOne(entry, { force }) {
  const outPath = path.join(TEXTS_DIR, `${entry.spdxId}.txt`);
  if (!force && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    return { id: entry.spdxId, status: 'cached' };
  }
  const ids = candidateIds(entry.spdxId);
  let lastErr;
  for (const id of ids) {
    try {
      const text = await fetchText(BASE_URL + encodeURIComponent(id) + '.txt');
      fs.writeFileSync(outPath, text, 'utf8');
      return { id: entry.spdxId, status: ids[0] === id ? 'ok' : `ok (aliased to ${id})` };
    } catch (err) {
      lastErr = err;
    }
  }
  return { id: entry.spdxId, status: 'missing', error: lastErr?.message };
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

function apiRequest(baseUrl, token, method, p, body) {
  const u = new URL(baseUrl + p);
  const opts = {
    method,
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
  };
  return new Promise((resolve, reject) => {
    const h = u.protocol === 'https:' ? require('node:https') : require('node:http');
    const req = h.request(u, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(text ? JSON.parse(text) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode} ${method} ${p}: ${text}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function refreshIndex(url, token) {
  const api = (method, p, body) => apiRequest(url, token, method, p, body);
  console.error('[refresh] creating temp license profile...');
  const created = await api('POST', '/api/v2/sca/license-profiles', {
    name: '__notice_md_probe__',
    organization: 'default-organization',
  });
  try {
    console.error('[refresh] fetching policy...');
    const policy = await api('GET', `/api/v2/sca/license-profiles/${encodeURIComponent(created.id)}`);
    const meta = policy.licenses
      .map((l) => ({ spdxId: l.spdxLicenseId, name: l.name, category: l.category }))
      .sort((a, b) => a.spdxId.toLowerCase().localeCompare(b.spdxId.toLowerCase()));
    fs.writeFileSync(INDEX_PATH, JSON.stringify(meta, null, 2), 'utf8');
    console.error(`[refresh] wrote ${meta.length} entries to ${INDEX_PATH}`);
  } finally {
    await api('DELETE', `/api/v2/sca/license-profiles/${encodeURIComponent(created.id)}`).catch((e) => {
      console.error('[refresh] warning: could not delete temp profile:', e.message);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const refreshIdx = args.indexOf('--refresh-index');
  if (refreshIdx !== -1) {
    const url = args[refreshIdx + 1];
    const token = args[refreshIdx + 2];
    if (!url || !token) {
      console.error('Usage: fetch-licenses.js --refresh-index <url> <token>');
      process.exit(2);
    }
    await refreshIndex(url, token);
  }
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`[fetch] missing ${INDEX_PATH}. Run with --refresh-index <url> <token> first.`);
    process.exit(2);
  }
  fs.mkdirSync(TEXTS_DIR, { recursive: true });
  const entries = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));

  const started = Date.now();
  let done = 0;
  const results = await runPool(
    entries,
    async (e) => {
      const r = await fetchOne(e, { force });
      done++;
      if (done % 50 === 0 || done === entries.length) {
        const pct = ((done / entries.length) * 100).toFixed(1);
        console.error(`[fetch] ${done}/${entries.length} (${pct}%)`);
      }
      return r;
    },
    CONCURRENCY
  );

  const ok = results.filter((r) => r.status === 'ok' || r.status === 'cached' || r.status.startsWith('ok ('));
  const aliased = results.filter((r) => r.status.startsWith('ok (aliased'));
  const missing = results.filter((r) => r.status === 'missing');
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.error(`\n[fetch] done in ${elapsed}s: ${ok.length} ok, ${aliased.length} aliased, ${missing.length} missing`);
  if (missing.length) {
    console.error('[fetch] missing ids (no canonical text in SPDX repo):');
    for (const m of missing) console.error(`   - ${m.id}  (${m.error || ''})`);
  }

  // Write manifest recording which ids resolved via aliasing, which are missing.
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    totalRequested: entries.length,
    present: ok.length,
    missing: missing.map((m) => m.id),
    aliased: aliased.map((a) => ({ spdxId: a.id, via: a.status.replaceAll(/^ok \(aliased to |\)$/g, '') })),
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.error(`[fetch] manifest -> ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
