# License Corpus Management
<!-- updated: 2026-04-21_15:25:00 -->

The SPDX license-text corpus (`src/licenses/`) is the generator's authoritative source for rendering the `Licenses` section of `NOTICE.md`. It is committed to the repo — not fetched at runtime — so that NOTICE generation is deterministic and works offline.

## Contents
<!-- updated: 2026-04-21_16:40:00 -->

- `src/licenses/index.json` — 658 entries of the form `{spdxId, name, category}`. Derived from SonarQube's internal catalog.
- `src/licenses/texts/<SPDX_ID>.txt` — 650 canonical license texts pulled from `https://raw.githubusercontent.com/spdx/license-list-data/main/text/<ID>.txt`.
- `src/licenses/manifest.json` — audit record: `generatedAt`, list of aliased ids, list of missing ids.

### Coverage vs. live SonarQube catalog (audited 2026-04-21)
<!-- updated: 2026-04-21_16:40:00 -->

A live `GET /api/v2/sca/license-profiles/<id>` currently returns **662** entries. The local corpus covers 650 of those directly plus 8 via blockquote fallback (see *Missing ids* below). The remaining 4 are non-SPDX entries that are **not** in `index.json` and have no local text:

- `NONE` — SPDX "no license" marker, not a real license.
- `LicenseRef-public-domain` — SPDX license-ref, no canonical text.
- `LicenseRef-sonar-highcharts` — SonarQube-internal ref.
- `LicenseRef-sonar-unboundid` — SonarQube-internal ref.

These surface only in live SBOMs that assign the marker; they do not have upstream SPDX texts and are not expected to be added to `texts/`.

## How the corpus is built
<!-- updated: 2026-04-21_15:25:00 -->

### The index
<!-- updated: 2026-04-21_15:25:00 -->

`scripts/fetch-licenses.js --refresh-index <url> <token>`:

1. `POST /api/v2/sca/license-profiles` with `{name:"__notice_md_probe__", organization:"default-organization"}` to create a throwaway profile.
2. `GET /api/v2/sca/license-profiles/<id>` to read the policy, which includes `licenses[]` with `{spdxLicenseId, name, category}` for every SPDX id SonarQube recognises (currently 658).
3. `DELETE /api/v2/sca/license-profiles/<id>` to clean up.
4. Write the result, sorted by `spdxId`, to `src/licenses/index.json`.

### The texts
<!-- updated: 2026-04-21_15:25:00 -->

`scripts/fetch-licenses.js` (with or without `--refresh-index`):

1. Reads `src/licenses/index.json`.
2. Fetches each SPDX id's raw text from the SPDX `license-list-data` repo, 20 concurrent workers.
3. Writes to `src/licenses/texts/<id>.txt`.
4. Skips files that already exist with non-zero size (idempotent). Pass `--force` to re-download everything.
5. Writes the audit record to `src/licenses/manifest.json`.

Runtime: ~13 seconds for all 650 licenses on a warm connection.

## Missing ids
<!-- updated: 2026-04-21_15:25:00 -->

Eight SPDX ids in SonarQube's catalog have no canonical text in the upstream SPDX repo (they are deprecated):

- `BSD-2-Clause-FreeBSD`
- `BSD-2-Clause-NetBSD`
- `bzip2-1.0.5`
- `eCos-2.0`
- `Net-SNMP`
- `Nunit`
- `StandardML-NJ`
- `wxWindows`

For these, the NOTICE renderer emits a blockquote pointing to `https://spdx.org/licenses/<id>.html` rather than a full text.

## Aliased ids
<!-- updated: 2026-04-21_15:25:00 -->

The SPDX repo publishes only the `-only` variants for GPL / LGPL / AGPL (`GPL-2.0-only`, not `GPL-2.0`). `fetch-licenses.js::candidateIds()` automatically retries with the `-only` suffix when the bare id 404s, and records the alias in `manifest.json` so a maintainer can see which texts were resolved via fallback.

## Refreshing
<!-- updated: 2026-04-21_15:25:00 -->

```sh
# Re-pull SPDX metadata from SonarQube + re-fetch all texts
node scripts/fetch-licenses.js --refresh-index http://localhost:9000 "$SONAR_TOKEN"

# Only re-download the texts (keeps the existing index.json)
node scripts/fetch-licenses.js

# Force re-download (ignores the on-disk cache)
node scripts/fetch-licenses.js --force
```

## Bundling for SEA
<!-- updated: 2026-04-21_15:25:00 -->

`scripts/build-bundle.js` packs `index.json` + every `texts/*.txt` into a single `build/licenses-bundle.json` (`{index: [...], texts: {spdxId: text}}`). That file is declared as an asset in `sea-config.json` and accessed at runtime via `require('node:sea').getAsset('licenses.json', 'utf8')`. Total bundle size: ~4 MB.
