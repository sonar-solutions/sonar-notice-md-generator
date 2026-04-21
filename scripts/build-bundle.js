#!/usr/bin/env node
// Pack src/licenses/index.json + src/licenses/texts/*.txt into a single JSON
// file (build/licenses-bundle.json) that gets embedded as a SEA asset.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(ROOT, 'src/licenses/index.json');
const TEXTS_DIR = path.join(ROOT, 'src/licenses/texts');
const OUT_PATH = path.join(ROOT, 'build/licenses-bundle.json');

if (!fs.existsSync(INDEX_PATH)) {
  console.error(`Missing ${INDEX_PATH}. Run scripts/fetch-licenses.js first.`);
  process.exit(1);
}
if (!fs.existsSync(TEXTS_DIR)) {
  console.error(`Missing ${TEXTS_DIR}. Run scripts/fetch-licenses.js first.`);
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
const texts = {};
for (const f of fs.readdirSync(TEXTS_DIR).sort()) {
  if (!f.endsWith('.txt')) continue;
  const id = f.slice(0, -4);
  texts[id] = fs.readFileSync(path.join(TEXTS_DIR, f), 'utf8');
}

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
const bundle = { index, texts };
const json = JSON.stringify(bundle);
fs.writeFileSync(OUT_PATH, json);

const kb = (json.length / 1024).toFixed(1);
console.error(`[bundle] ${index.length} index entries, ${Object.keys(texts).length} texts, ${kb} KB -> ${OUT_PATH}`);
