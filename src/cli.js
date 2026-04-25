#!/usr/bin/env node
// sq-notice — generate NOTICE.md from a SonarQube SBOM.
//
// Single-file CLI: uses only Node built-ins, intended to be compiled into a
// standalone binary via Node's Single Executable Application (SEA) feature.
//
// Subcommands:
//   sq-notice list                         List projects on the SonarQube server
//   sq-notice sbom <projectKey> [--branch B] [--type spdx_23|spdx_30|cyclonedx] [-o FILE]
//                                          Download the raw SBOM for a project
//   sq-notice generate <projectKey> [--branch B] [-o FILE] [--phase P] [--distribution D]
//                                          Fetch the SBOM and render it as NOTICE.md
//   sq-notice verify <notice.md> <projectKey|--sbom FILE> [--branch B] [--strict]
//                                          Cross-check a NOTICE.md against an SBOM
//
// Config resolution (first match wins):
//   1. --url/--token CLI flags
//   2. SONAR_URL / SONAR_TOKEN environment variables
//   3. credentials.json in CWD (e.g. {"url":"http://localhost:9000","token":"squ_..."})
//   4. ~/.sq-notice/credentials.json

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const VERSION = '0.2.0';

// ---------------------------------------------------------------------------
// Embedded license corpus
// ---------------------------------------------------------------------------
// In the SEA binary, the corpus is embedded as an asset named 'licenses.json'.
// Running from source (`node src/cli.js`), we fall back to disk.

let LICENSE_INDEX = null; // [{spdxId, name, category}]
let LICENSE_TEXTS = null; // { spdxId: fullText } — loaded lazily

function readSeaAsset(name) {
  try {
    // eslint-disable-next-line global-require
    const sea = require('node:sea');
    if (!sea.isSea?.()) return null;
    try {
      return sea.getAsset(name, 'utf8');
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function loadLicenseCorpus() {
  if (LICENSE_INDEX && LICENSE_TEXTS) return;
  const asset = readSeaAsset('licenses.json');
  if (asset) {
    const bundle = JSON.parse(asset);
    LICENSE_INDEX = bundle.index;
    LICENSE_TEXTS = bundle.texts;
    return;
  }
  // Filesystem fallback (running from source)
  const tryPaths = [
    path.join(__dirname, '../build/licenses-bundle.json'),
    path.join(process.cwd(), 'build/licenses-bundle.json'),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) {
      const bundle = JSON.parse(fs.readFileSync(p, 'utf8'));
      LICENSE_INDEX = bundle.index;
      LICENSE_TEXTS = bundle.texts;
      return;
    }
  }
  // Last-resort: load from src/licenses/ piece-wise (useful during development
  // before running `scripts/build-bundle.js`).
  const srcRoot = path.join(__dirname, 'licenses');
  const indexPath = path.join(srcRoot, 'index.json');
  const textsDir = path.join(srcRoot, 'texts');
  if (fs.existsSync(indexPath) && fs.existsSync(textsDir)) {
    LICENSE_INDEX = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    LICENSE_TEXTS = {};
    for (const f of fs.readdirSync(textsDir)) {
      if (f.endsWith('.txt')) {
        const id = f.slice(0, -4);
        LICENSE_TEXTS[id] = fs.readFileSync(path.join(textsDir, f), 'utf8');
      }
    }
    return;
  }
  LICENSE_INDEX = [];
  LICENSE_TEXTS = {};
}

function licenseHumanName(spdxId) {
  loadLicenseCorpus();
  const hit = LICENSE_INDEX.find((l) => l.spdxId === spdxId);
  return hit ? hit.name : spdxId;
}

function licenseText(spdxId) {
  loadLicenseCorpus();
  return LICENSE_TEXTS[spdxId] || null;
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------

function loadCredentials(flagOverrides) {
  const candidates = [
    path.join(process.cwd(), 'credentials.json'),
    path.join(os.homedir(), '.sq-notice', 'credentials.json'),
  ];
  let fileCreds = {};
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        fileCreds = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      } catch (err) {
        throw new Error(`Could not parse ${p}: ${err.message}`);
      }
    }
  }
  const url = flagOverrides.url || process.env.SONAR_URL || fileCreds.url;
  const token = flagOverrides.token || process.env.SONAR_TOKEN || fileCreds.token;
  if (!url) throw new Error('SonarQube URL not configured. Pass --url, set SONAR_URL, or add "url" to credentials.json.');
  if (!token) throw new Error('SonarQube token not configured. Pass --token, set SONAR_TOKEN, or add "token" to credentials.json.');
  return { url: url.replace(/\/$/, ''), token };
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

function request(fullUrl, { method = 'GET', token, accept = 'application/json', timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(fullUrl);
    const lib = u.protocol === 'https:' ? https : http;
    const opts = {
      method,
      headers: {
        accept,
        'user-agent': `sq-notice/${VERSION}`,
      },
    };
    if (token) opts.headers.authorization = `Bearer ${token}`;
    const req = lib.request(u, opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => req.destroy(new Error(`Request timed out after ${timeout}ms: ${method} ${fullUrl}`)));
    req.end();
  });
}

async function getJson(baseUrl, token, pathAndQuery, { accept = 'application/json' } = {}) {
  const res = await request(baseUrl + pathAndQuery, { token, accept });
  const text = res.body.toString('utf8');
  if (res.statusCode < 200 || res.statusCode >= 300) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j.message || j.errors?.map((e) => e.msg).join('; ') || text;
    } catch { /* keep raw */ }
    throw new Error(`HTTP ${res.statusCode} ${pathAndQuery}: ${msg}`);
  }
  if (!accept.includes('json')) return text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Could not parse JSON response from ${pathAndQuery}: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// SonarQube operations
// ---------------------------------------------------------------------------

async function listProjects({ url, token }) {
  // SonarQube Enterprise; projects live under organizations. We paginate.
  const out = [];
  let page = 1;
  const pageSize = 100;
  /* eslint-disable no-await-in-loop */
  while (true) {
    const q = `/api/components/search?qualifiers=TRK&ps=${pageSize}&p=${page}`;
    const resp = await getJson(url, token, q);
    const batch = resp.components || [];
    out.push(...batch);
    const total = resp.paging ? resp.paging.total : batch.length;
    if (out.length >= total || batch.length === 0) break;
    page += 1;
  }
  /* eslint-enable no-await-in-loop */
  return out;
}

const SBOM_TYPES = {
  spdx_23: { accept: 'application/spdx+json', ext: 'spdx.json' },
  spdx_30: { accept: 'application/spdx+json', ext: 'spdx.json' },
  cyclonedx: { accept: 'application/vnd.cyclonedx+json', ext: 'cdx.json' },
};

async function fetchSbom({ url, token }, projectKey, { branch, type = 'spdx_23' } = {}) {
  const cfg = SBOM_TYPES[type];
  if (!cfg) throw new Error(`Unsupported SBOM type '${type}'. Use one of: ${Object.keys(SBOM_TYPES).join(', ')}`);
  const q = new URLSearchParams({ component: projectKey, type });
  if (branch) q.set('branch', branch);
  return getJson(url, token, `/api/v2/sca/sbom-reports?${q.toString()}`, { accept: cfg.accept });
}

// ---------------------------------------------------------------------------
// SPDX expression helpers
// ---------------------------------------------------------------------------

const SPDX_OPERATORS = new Set(['AND', 'OR', 'WITH']);

function extractSpdxIds(expr) {
  if (!expr) return [];
  const s = String(expr).trim();
  if (!s || s === 'NOASSERTION' || s === 'NONE') return [];
  const tokens = s.replaceAll(/[()]/g, ' ').split(/\s+/).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const t of tokens) {
    if (SPDX_OPERATORS.has(t.toUpperCase())) continue;
    if (t === 'NOASSERTION' || t === 'NONE') continue;
    // Strip a trailing '+' (deprecated shorthand for -or-later)
    const id = t.endsWith('+') ? t.slice(0, -1) + '-or-later' : t;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function humanizeLicenseExpression(expr) {
  // "(Apache-2.0 OR MIT)" -> "(Apache License 2.0 OR MIT License)"
  if (!expr) return '';
  if (expr === 'NOASSERTION' || expr === 'NONE') return expr;
  return expr.replaceAll(/[A-Za-z0-9.\-+]+/g, (tok) => {
    if (SPDX_OPERATORS.has(tok.toUpperCase())) return tok.toUpperCase();
    if (tok === 'NOASSERTION' || tok === 'NONE') return tok;
    const id = tok.endsWith('+') ? tok.slice(0, -1) + '-or-later' : tok;
    return licenseHumanName(id);
  });
}

// ---------------------------------------------------------------------------
// SBOM normalization (SPDX 2.3 JSON + CycloneDX JSON -> internal record set)
// ---------------------------------------------------------------------------

// Internal record: { name, version, purl, licenseExpression, copyrightText }

function normalizeSpdx23(sbom) {
  const out = [];
  for (const p of sbom.packages || []) {
    const name = p.name;
    const version = p.versionInfo || '';
    // Skip the synthetic document/root package(s). They usually have no purl.
    const purlRef = (p.externalRefs || []).find(
      (r) => r.referenceType === 'purl' || r.referenceType === 'package-url'
    );
    const purl = purlRef ? purlRef.referenceLocator : null;
    if (!purl) continue;
    const declared = p.licenseDeclared && p.licenseDeclared !== 'NOASSERTION' ? p.licenseDeclared : null;
    const concluded = p.licenseConcluded && p.licenseConcluded !== 'NOASSERTION' ? p.licenseConcluded : null;
    const licenseExpression = declared || concluded || 'NOASSERTION';
    const copyrightText = p.copyrightText && p.copyrightText !== 'NOASSERTION' ? p.copyrightText : '';
    out.push({ name, version, purl, licenseExpression, copyrightText });
  }
  return out;
}

function normalizeCycloneDx(sbom) {
  const out = [];
  for (const c of sbom.components || []) {
    const name = c.group ? `${c.group}/${c.name}` : c.name;
    const version = c.version || '';
    const purl = c.purl || null;
    if (!purl) continue;
    let licenseExpression = 'NOASSERTION';
    if (Array.isArray(c.licenses) && c.licenses.length) {
      const ids = c.licenses
        .map((l) => (l.license && (l.license.id || l.license.name)) || l.expression)
        .filter(Boolean);
      if (ids.length === 1) licenseExpression = ids[0];
      else if (ids.length > 1) licenseExpression = `(${ids.join(' AND ')})`;
    }
    const copyrightText = c.copyright && c.copyright !== 'NOASSERTION' ? c.copyright : '';
    out.push({ name, version, purl, licenseExpression, copyrightText });
  }
  return out;
}

function normalizeSbom(sbom) {
  if (sbom?.spdxVersion) return { records: normalizeSpdx23(sbom), projectName: sbom.name };
  if (sbom?.bomFormat === 'CycloneDX' || sbom?.specVersion) {
    const projectName = sbom.metadata?.component?.name;
    return { records: normalizeCycloneDx(sbom), projectName };
  }
  throw new Error('Unrecognized SBOM format (expected SPDX 2.3 JSON or CycloneDX JSON)');
}

// ---------------------------------------------------------------------------
// NOTICE.md rendering (markdown, with clear section / subsection headings)
// ---------------------------------------------------------------------------
//
// Structure:
//   # NOTICE — <Project Name>        (H1 doc title)
//     metadata block
//     ---
//   ## Components                    (H2)
//     - `name` `version` : License Name   (one bullet per package, parseable)
//     ---
//   ## Copyright Text                (H2, omitted if no data)
//     ### `name` `version` …
//     ---
//   ## Licenses                      (H2)
//   # **License Name**               (H1 bold, one per unique SPDX id)
//     <!-- SPDX-License-Identifier: XXX -->
//     **Used by (N):** pkg1 v, pkg2 v …
//     ```
//     <full canonical text>
//     ```
//     ---
//
// The H1-bold-per-license deliberately breaks the one-H1-per-doc convention —
// requested by the user for maximum visual separation between licenses when
// scrolling through the file.

function renderHeader({ projectKey, projectName, version, phase, distribution, copyrightYear }) {
  const title = projectName || projectKey;
  const lines = [
    `# NOTICE — ${title}`,
    '',
    `**Copyright:** ${copyrightYear}  `,
  ];
  if (version) lines.push(`**Version:** ${version}  `);
  lines.push(`**Phase:** ${phase}  `, `**Distribution:** ${distribution}`, '', '---', '');
  return lines;
}

function renderComponents(sortedRecords) {
  const lines = [
    '## Components',
    '',
    `${sortedRecords.length} third-party component${sortedRecords.length === 1 ? '' : 's'}.`,
    '',
    ...sortedRecords.map((r) => `- \`${r.name}\` \`${r.version}\` : ${humanizeLicenseExpression(r.licenseExpression)}`),
    '',
    '---',
    '',
  ];
  return lines;
}

function renderCopyrightText(sortedRecords) {
  const withCopyright = sortedRecords.filter((r) => r.copyrightText);
  if (withCopyright.length === 0) return [];
  const lines = ['## Copyright Text', ''];
  for (const r of withCopyright) {
    lines.push(
      `### \`${r.name}\` \`${r.version}\``,
      '',
      `_${r.purl}_`,
      '',
      '```',
      ...r.copyrightText.split(/\r?\n/),
      '```',
      '',
    );
  }
  lines.push('---', '');
  return lines;
}

function buildLicenseMap(sortedRecords) {
  const licenseUsers = new Map();
  for (const r of sortedRecords) {
    for (const id of extractSpdxIds(r.licenseExpression)) {
      if (!licenseUsers.has(id)) licenseUsers.set(id, []);
      licenseUsers.get(id).push({ name: r.name, version: r.version });
    }
  }
  return licenseUsers;
}

function renderLicenseBlock(id, users) {
  const userList = users.map((u) => `${u.name} ${u.version}`).join(', ');
  const text = licenseText(id);
  const textLines = text
    ? ['```', text.replace(/\s+$/, ''), '```']
    : [`> No canonical license text available for SPDX id \`${id}\`.`, `> See <https://spdx.org/licenses/${id}.html>.`];
  return [
    `# **${licenseHumanName(id)}**`,
    `<!-- SPDX-License-Identifier: ${id} -->`,
    '',
    `**Used by (${users.length}):** ${userList}`,
    '',
    ...textLines,
    '',
    '---',
    '',
  ];
}

function renderLicenses(sortedRecords) {
  const licenseUsers = buildLicenseMap(sortedRecords);
  if (!licenseUsers.size) return [];
  const lines = [
    '## Licenses',
    '',
    `${licenseUsers.size} distinct license${licenseUsers.size === 1 ? '' : 's'} in use.`,
    '',
    '---',
    '',
  ];
  const sortedIds = [...licenseUsers.keys()].sort((a, b) =>
    licenseHumanName(a).localeCompare(licenseHumanName(b))
  );
  for (const id of sortedIds) {
    lines.push(...renderLicenseBlock(id, licenseUsers.get(id)));
  }
  return lines;
}

function renderNotice({ projectKey, projectName, version, records, phase, distribution, copyrightYear }) {
  const sortedRecords = [...records].sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    return n !== 0 ? n : a.version.localeCompare(b.version);
  });

  const lines = [
    ...renderHeader({ projectKey, projectName, version, phase, distribution, copyrightYear }),
    ...renderComponents(sortedRecords),
    ...renderCopyrightText(sortedRecords),
    ...renderLicenses(sortedRecords),
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// NOTICE.md parsing (inverse of renderNotice, used by the verify command)
// ---------------------------------------------------------------------------
//
// We only need to parse the Components section for `verify`, since that's the
// ground-truth package list. License texts are not re-verified against the
// SBOM (they're static SPDX data).

function parseNotice(markdown) {
  const lines = markdown.split(/\r?\n/);
  const components = [];
  let inComponents = false;
  // Accept either a curly em-dash or an ASCII colon between version and license.
  // Matches:  - `name` `version` : License Name
  //           -  name version : License Name    (backticks optional for leniency)
  const bulletRe = /^-\s+`?([^`]+?)`?\s+`?([^\s`]+)`?\s+:\s+(.+?)\s*$/;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const title = heading[2].toLowerCase().replaceAll(/\*+/g, '').trim();
      if (title === 'components' || title.startsWith('components')) {
        inComponents = true;
        continue;
      }
      // Any later heading ends the section.
      if (inComponents) inComponents = false;
      continue;
    }
    if (!inComponents) continue;
    if (!line.trim() || line.trim() === '---') continue;
    const m = line.match(bulletRe);
    if (m) {
      components.push({ name: m[1].trim(), version: m[2].trim(), licenseName: m[3].trim() });
    }
  }
  return { components };
}

// ---------------------------------------------------------------------------
// Verify — compare a NOTICE.md against an SBOM
// ---------------------------------------------------------------------------

function verifyNoticeAgainstSbom(notice, records) {
  const keyOf = (r) => `${r.name}@${r.version}`;

  const sbomByKey = new Map(records.map((r) => [keyOf(r), r]));
  const noticeByKey = new Map(notice.components.map((c) => [keyOf(c), c]));

  const missing = [];  // in SBOM, not in NOTICE
  const extra = [];    // in NOTICE, not in SBOM
  const mismatched = []; // same pkg, different license

  for (const [k, r] of sbomByKey) {
    if (!noticeByKey.has(k)) missing.push(r);
  }
  for (const [k, c] of noticeByKey) {
    if (!sbomByKey.has(k)) {
      extra.push(c);
      continue;
    }
    const r = sbomByKey.get(k);
    const expected = humanizeLicenseExpression(r.licenseExpression);
    if (expected !== c.licenseName) {
      mismatched.push({ key: k, notice: c.licenseName, sbom: expected });
    }
  }

  return { missing, extra, mismatched, sbomCount: records.length, noticeCount: notice.components.length };
}

function formatVerifyReport(res, { projectKey, strict }) {
  const check = (label, ok) => `  ${ok ? '[OK]  ' : '[FAIL]'} ${label}`;

  const out = [
    `Verifying NOTICE.md against ${projectKey}`,
    `  SBOM packages:   ${res.sbomCount}`,
    `  NOTICE packages: ${res.noticeCount}`,
    '',
    check(`packages listed in NOTICE are all in SBOM (${res.noticeCount - res.extra.length}/${res.noticeCount})`, res.extra.length === 0),
    check(`packages in SBOM are all listed in NOTICE (${res.sbomCount - res.missing.length}/${res.sbomCount})`, res.missing.length === 0),
    check(`license names match for every package (${res.sbomCount - res.mismatched.length}/${res.sbomCount})`, res.mismatched.length === 0),
    '',
  ];

  if (res.missing.length) {
    out.push(
      `Missing from NOTICE (${res.missing.length}):`,
      ...res.missing.map((r) => `  - ${r.name} ${r.version}  (${humanizeLicenseExpression(r.licenseExpression)})`),
      '',
    );
  }
  if (res.extra.length) {
    out.push(
      `Extra in NOTICE, not in SBOM (${res.extra.length}):`,
      ...res.extra.map((c) => `  - ${c.name} ${c.version}  (${c.licenseName})`),
      '',
    );
  }
  if (res.mismatched.length) {
    out.push(
      `License mismatches (${res.mismatched.length}):`,
      ...res.mismatched.flatMap((m) => [`  - ${m.key}`, `      NOTICE: ${m.notice}`, `      SBOM:   ${m.sbom}`]),
      '',
    );
  }

  const clean = res.missing.length === 0 && res.extra.length === 0 && res.mismatched.length === 0;
  if (clean) {
    out.push('NOTICE.md is consistent with the SBOM.');
  } else {
    out.push(strict
      ? 'NOTICE.md does not match the SBOM (strict mode).'
      : 'NOTICE.md has discrepancies with the SBOM.');
  }
  return { text: out.join('\n') + '\n', clean };
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function isFlag(value) {
  return value === undefined || value.startsWith('-');
}

function parseLongFlag(argv, i, args) {
  const a = argv[i];
  const eq = a.indexOf('=');
  if (eq !== -1) {
    args.flags[a.slice(2, eq)] = a.slice(eq + 1);
    return i + 1;
  }
  const key = a.slice(2);
  const next = argv[i + 1];
  if (isFlag(next)) {
    args.flags[key] = true;
    return i + 1;
  }
  args.flags[key] = next;
  return i + 2;
}

function parseShortFlag(argv, i, args) {
  const key = argv[i].slice(1);
  const next = argv[i + 1];
  if (isFlag(next)) {
    args.flags[key] = true;
    return i + 1;
  }
  args.flags[key] = next;
  return i + 2;
}

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--') {
      args._.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith('--')) {
      i = parseLongFlag(argv, i, args);
    } else if (a.startsWith('-') && a.length > 1) {
      i = parseShortFlag(argv, i, args);
    } else {
      args._.push(a);
      i += 1;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const HELP = `sq-notice ${VERSION} — generate NOTICE.md from a SonarQube SBOM

Usage:
  sq-notice list [--url URL] [--token TOKEN]
  sq-notice sbom     <projectKey> [--branch B] [--type spdx_23|spdx_30|cyclonedx] [-o FILE]
  sq-notice generate <projectKey> [--branch B] [-o FILE]
                                  [--phase PHASE] [--distribution D]
                                  [--project-version V] [--copyright-year Y]
  sq-notice verify   <notice.md>  <projectKey> [--branch B] [--strict]
  sq-notice verify   <notice.md>  --sbom <sbom.json>         [--strict]

Config (in precedence order):
  CLI flags      --url, --token
  Environment    SONAR_URL, SONAR_TOKEN
  File           ./credentials.json       (keys: url, token)
                 ~/.sq-notice/credentials.json

Examples:
  sq-notice list
  sq-notice sbom sample-notice-project -o sample.spdx.json
  sq-notice generate sample-notice-project -o NOTICE.md
  sq-notice verify NOTICE.md sample-notice-project
  sq-notice verify NOTICE.md --sbom sample.spdx.json
`;

async function cmdList(args) {
  const creds = loadCredentials({ url: args.flags.url, token: args.flags.token });
  const projects = await listProjects(creds);
  if (!projects.length) {
    process.stderr.write('No projects found on this SonarQube server.\n');
    return;
  }
  // Plain column output, tab-separated
  const rows = projects.map((p) => ({ key: p.key, name: p.name, qualifier: p.qualifier, visibility: p.visibility || '' }));
  const maxKey = Math.max(3, ...rows.map((r) => r.key.length));
  const maxName = Math.max(4, ...rows.map((r) => r.name.length));
  process.stdout.write(`${'KEY'.padEnd(maxKey)}  ${'NAME'.padEnd(maxName)}  VISIBILITY\n`);
  for (const r of rows) {
    process.stdout.write(`${r.key.padEnd(maxKey)}  ${r.name.padEnd(maxName)}  ${r.visibility}\n`);
  }
}

async function cmdSbom(args) {
  const creds = loadCredentials({ url: args.flags.url, token: args.flags.token });
  const projectKey = args._[1];
  if (!projectKey) throw new Error('Usage: sq-notice sbom <projectKey>');
  const type = args.flags.type || 'spdx_23';
  const branch = args.flags.branch;
  const sbom = await fetchSbom(creds, projectKey, { type, branch });
  const out = args.flags.o || args.flags.output;
  const json = JSON.stringify(sbom, null, 2);
  if (out) {
    fs.writeFileSync(out, json);
    process.stderr.write(`Wrote ${json.length} bytes to ${out}\n`);
  } else {
    process.stdout.write(json);
  }
}

async function cmdGenerate(args) {
  const creds = loadCredentials({ url: args.flags.url, token: args.flags.token });
  const projectKey = args._[1];
  if (!projectKey) throw new Error('Usage: sq-notice generate <projectKey>');
  const branch = args.flags.branch;

  let sbom;
  if (args.flags.sbom) {
    sbom = JSON.parse(fs.readFileSync(args.flags.sbom, 'utf8'));
  } else {
    sbom = await fetchSbom(creds, projectKey, { type: 'spdx_23', branch });
  }
  const { records, projectName } = normalizeSbom(sbom);
  if (!records.length) {
    process.stderr.write(
      `Warning: SBOM for ${projectKey} contains no packages with a PURL. The project may not have been scanned with SCA enabled, or dependency detection produced no results.\n`
    );
  }

  const notice = renderNotice({
    projectKey,
    projectName: projectName || projectKey,
    version: args.flags['project-version'] || '',
    records,
    phase: args.flags.phase || 'DEVELOPMENT',
    distribution: args.flags.distribution || 'OPENSOURCE',
    copyrightYear: args.flags['copyright-year'] || String(new Date().getUTCFullYear()),
  });
  const out = args.flags.o || args.flags.output;
  if (out) {
    fs.writeFileSync(out, notice);
    process.stderr.write(`Wrote ${notice.length} bytes (${records.length} packages) to ${out}\n`);
  } else {
    process.stdout.write(notice);
  }
}

async function cmdVerify(args) {
  const noticePath = args._[1];
  if (!noticePath) throw new Error('Usage: sq-notice verify <notice.md> <projectKey|--sbom FILE>');
  if (!fs.existsSync(noticePath)) throw new Error(`NOTICE file not found: ${noticePath}`);
  const notice = parseNotice(fs.readFileSync(noticePath, 'utf8'));

  let sbom;
  let sourceLabel;
  if (args.flags.sbom) {
    sbom = JSON.parse(fs.readFileSync(args.flags.sbom, 'utf8'));
    sourceLabel = args.flags.sbom;
  } else {
    const projectKey = args._[2];
    if (!projectKey) throw new Error('Either a <projectKey> positional or --sbom FILE is required.');
    const creds = loadCredentials({ url: args.flags.url, token: args.flags.token });
    sbom = await fetchSbom(creds, projectKey, { type: 'spdx_23', branch: args.flags.branch });
    sourceLabel = projectKey;
  }

  const { records } = normalizeSbom(sbom);
  const res = verifyNoticeAgainstSbom(notice, records);
  const { text, clean } = formatVerifyReport(res, { projectKey: sourceLabel, strict: !!args.flags.strict });
  process.stdout.write(text);
  if (!clean) process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.version || args.flags.V) {
    process.stdout.write(`sq-notice ${VERSION}\n`);
    return;
  }
  if (!args._.length || args.flags.help || args.flags.h || args._[0] === 'help') {
    process.stdout.write(HELP);
    return;
  }
  const cmd = args._[0];
  switch (cmd) {
    case 'list':
      await cmdList(args);
      break;
    case 'sbom':
      await cmdSbom(args);
      break;
    case 'generate':
      await cmdGenerate(args);
      break;
    case 'verify':
      await cmdVerify(args);
      break;
    default:
      process.stderr.write(`Unknown command: ${cmd}\n\n${HELP}`);
      process.exit(2);
  }
}

main().catch((err) => {
  process.stderr.write(`Error: ${err?.message ?? err}\n`);
  process.exit(1);
});
