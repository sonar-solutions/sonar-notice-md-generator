# Architecture
<!-- updated: 2026-04-21_15:25:00 -->

## Data flow
<!-- updated: 2026-04-21_15:25:00 -->

```
credentials.json  ->  src/cli.js  --(SonarQube /api/v2/sca/sbom-reports)-->  SPDX 2.3 JSON
                           |
                           |  normalize -> { name, version, purl, licenseExpression, copyrightText }
                           v
                  render NOTICE.md  <--  license name + full text lookup
                                                  ^
                                                  |
                                       src/licenses/index.json  (SPDX id -> human name)
                                       src/licenses/texts/*.txt (SPDX id -> canonical full text)
                                                  |
                                                  v at build time, packed into
                                       build/licenses-bundle.json
                                                  |
                                                  v embedded as SEA asset "licenses.json"
```

## Design principles
<!-- updated: 2026-04-21_21:30:00 -->

- **Zero runtime dependencies.** `src/cli.js` only imports Node built-ins (`node:fs`, `node:os`, `node:path`, `node:http`, `node:https`, `node:url`, `node:sea`).
- **Single file, by design.** Easier to reason about and easier to embed in SEA without a bundler.
- **Licenses are first-class build inputs**, fetched once by `scripts/fetch-licenses.js` and committed under `src/licenses/texts/` so they're diffable.

## Repository layout
<!-- updated: 2026-04-21_15:25:00 -->

```
notice-md-generator/
├── credentials.json            SonarQube URL + token (gitignored)
├── package.json                No runtime deps; just npm scripts
├── sea-config.json             Node SEA config (asset = build/licenses-bundle.json)
├── sea-config.cross.json       Cross-platform variant (useCodeCache: false)
├── build.js                    Native build (host platform only)
├── build-all.js                Cross-platform build (6 targets)
├── src/
│   ├── cli.js                  Single-file CLI (list / sbom / generate / verify)
│   └── licenses/
│       ├── index.json          658 entries: {spdxId, name, category}
│       ├── manifest.json       Fetch audit: generatedAt, aliased, missing
│       └── texts/*.txt         650 canonical SPDX license texts
├── scripts/
│   ├── fetch-licenses.js       Re-syncs src/licenses/ from SonarQube + SPDX
│   └── build-bundle.js         Packs src/licenses into build/licenses-bundle.json
├── fixtures/
│   └── sample-project/         Tiny npm project used to exercise SBOM export
├── docs/                       This directory
└── build/                      Generated; gitignored
    ├── licenses-bundle.json
    ├── sea-prep.blob
    └── sq-notice               The binary
```

## SEA asset loader
<!-- updated: 2026-04-21_15:25:00 -->

At runtime `src/cli.js::loadLicenseCorpus()` tries, in order:

1. `require('node:sea').getAsset('licenses.json', 'utf8')` — hits inside the SEA binary.
2. `build/licenses-bundle.json` on disk — used when running `node src/cli.js` after a build.
3. Reading `src/licenses/index.json` + `src/licenses/texts/*.txt` piece-wise — used during development before the first build.

This means development works without a build step, and the binary works without the source checkout.

## Design constraints honoured
<!-- updated: 2026-04-21_15:25:00 -->

- **No runtime third-party dependencies.** `package.json` has no `dependencies` section. `postject` is build-time only (invoked via `npx`, never installed into `node_modules`).
- **No bundler.** `src/cli.js` is a single file. Node's SEA takes it verbatim.
- **No secrets in source.** Token lives in gitignored `credentials.json` / env vars only.
- **Self-contained binary.** The only thing the user needs post-build is `build/sq-notice` + a way to configure URL + token.
