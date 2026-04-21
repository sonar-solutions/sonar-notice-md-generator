# SonarQube API Surface
<!-- updated: 2026-04-21_15:25:00 -->

`sq-notice` uses a small, stable subset of the SonarQube Web API v2.

## Endpoints
<!-- updated: 2026-04-21_15:25:00 -->

### `GET /api/v2/sca/sbom-reports`
<!-- updated: 2026-04-21_15:25:00 -->

Primary data source for `generate` and `verify`.

- Query: `component=<projectKey>`, `type=spdx_23|spdx_30|cyclonedx`, optional `branch=<key>`.
- `Accept: application/spdx+json` (SPDX 2.3 / 3.0) or `application/vnd.cyclonedx+json` (CycloneDX).
- Returns 404 with `{"message":"Component '<key>' not found."}` if the key is wrong.
- Returns 404 with `{"message":"Branch '<name>' not found..."}` if `--branch` points at a non-existent branch.

### `GET /api/components/search?qualifiers=TRK&ps=100&p=N`
<!-- updated: 2026-04-21_15:25:00 -->

Project listing for the `list` command. Paginated.

### `GET/POST/DELETE /api/v2/sca/license-profiles[/{id}]`
<!-- updated: 2026-04-21_15:25:00 -->

Not used at runtime. `scripts/fetch-licenses.js --refresh-index` creates a disposable license profile, reads `/{id}` to get the full SPDX catalog (`licenses[]` with `{spdxLicenseId, name, category}`), then deletes the profile.

## Authentication
<!-- updated: 2026-04-21_15:25:00 -->

`Authorization: Bearer <SonarQube user token>`. The token must have at least:

- `Browse` on the target project (for sbom / generate / verify).
- `scan` global permission (to create/delete the disposable license profile used by `fetch-licenses.js --refresh-index`).

Tokens look like `squ_…` and are issued under **Account → Security → Generate Tokens** in the SonarQube UI.

## Organization quirk
<!-- updated: 2026-04-21_15:25:00 -->

SonarQube Enterprise requires `organization: "default-organization"` when creating license profiles. Other organization keys (`default`, `sonarqube`, an empty string) return `{"message":"Non default organization is not supported"}`. `scripts/fetch-licenses.js` hardcodes `default-organization` in its `--refresh-index` flow. The SBOM, project-listing, and license-profile-read endpoints do **not** require the header — only create/delete.

## Normalization
<!-- updated: 2026-04-21_15:25:00 -->

`normalizeSbom` (dispatcher) + `normalizeSpdx23` + `normalizeCycloneDx` in `src/cli.js` reduce both formats to the same internal shape:

```js
{
  name: 'express',
  version: '4.19.2',
  purl: 'pkg:npm/express@4.19.2',
  licenseExpression: 'MIT',         // SPDX expression
  copyrightText: '',                // '' when the SBOM says NOASSERTION
}
```

This means `--sbom path/to/sbom.json` accepts either format for offline runs.
