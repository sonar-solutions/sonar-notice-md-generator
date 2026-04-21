# The `verify` Command
<!-- updated: 2026-04-21_15:25:00 -->

## What it does
<!-- updated: 2026-04-21_15:25:00 -->

Given a NOTICE.md and a SonarQube SBOM (live via projectKey, or JSON on disk via `--sbom`), `verify` reports three classes of drift:

- **Missing** — package present in the SBOM, absent from the NOTICE.
- **Extra** — package listed in the NOTICE, absent from the SBOM.
- **Mismatched** — package present in both, but the NOTICE lists a different license.

Exit code: 0 if all three categories are empty; 1 otherwise.

## How it parses the NOTICE
<!-- updated: 2026-04-21_15:25:00 -->

`verify` only reads the `## Components` section. Each entry must match the regex:

```
^-\s+`?(name)`?\s+`?(version)`?\s+:\s+(license name)\s*$
```

Which accepts either the canonical format emitted by `generate`:

```
- `express` `4.19.2` : MIT License
```

…or the looser variant without backticks:

```
- express 4.19.2 : MIT License
```

Anything that doesn't match is silently dropped. That means hand-edits which break the bullet pattern (indentation, a leading blockquote `>`, a collapsed separator, a table format, etc.) will appear as "Missing" in the verify report — see [limitations.md](limitations.md).

## License name comparison
<!-- updated: 2026-04-21_15:25:00 -->

The NOTICE stores a **human-readable** license name (e.g. `MIT License`). The SBOM carries an **SPDX expression** (e.g. `MIT`, `(Apache-2.0 OR MIT)`). `verify` humanizes the SBOM side with the same `humanizeLicenseExpression` used by `generate`, then does a string compare. That means:

- `MIT` vs `MIT License` matches (both become `MIT License`).
- `(Apache-2.0 OR MIT)` vs `(Apache License 2.0 OR MIT License)` matches.
- `MIT License` vs `Apache License 2.0` is flagged as mismatched.

## `--strict`
<!-- updated: 2026-04-21_21:30:00 -->

`verify` always exits 1 on any discrepancy, regardless of whether `--strict` is passed. Today `--strict` only changes the failure summary message — `"NOTICE.md does not match the SBOM (strict mode)."` instead of `"NOTICE.md has discrepancies with the SBOM."`. The flag is documented and accepted today so that CI pipelines can opt into strict semantics unconditionally without a migration when future tiers (e.g. warning vs failure) are added.

## CI integration example
<!-- updated: 2026-04-21_15:25:00 -->

```yaml
# .github/workflows/notice.yml
name: NOTICE guard
on:
  pull_request:
    paths: ['NOTICE.md', 'package.json', 'package-lock.json']

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download sq-notice
        run: |
          curl -L -o sq-notice https://.../sq-notice-linux-x64
          chmod +x sq-notice
      - run: ./sq-notice verify NOTICE.md ${{ vars.PROJECT_KEY }} --strict
        env:
          SONAR_URL: ${{ vars.SONAR_URL }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Offline verification
<!-- updated: 2026-04-21_15:25:00 -->

For airgapped runners, snapshot the SBOM as a file and point `verify` at it:

```sh
sq-notice sbom mykey -o sbom.spdx.json                # once, online
sq-notice verify NOTICE.md --sbom sbom.spdx.json      # anywhere, offline
```

## Example output — clean
<!-- updated: 2026-04-21_15:25:00 -->

```
Verifying NOTICE.md against sample-notice-project
  SBOM packages:   86
  NOTICE packages: 86

  [OK]   packages listed in NOTICE are all in SBOM (86/86)
  [OK]   packages in SBOM are all listed in NOTICE (86/86)
  [OK]   license names match for every package (86/86)

NOTICE.md is consistent with the SBOM.
```

## Example output — drift
<!-- updated: 2026-04-21_15:25:00 -->

```
Verifying NOTICE.md against sample-notice-project
  SBOM packages:   86
  NOTICE packages: 86

  [FAIL] packages listed in NOTICE are all in SBOM (85/86)
  [FAIL] packages in SBOM are all listed in NOTICE (85/86)
  [FAIL] license names match for every package (85/86)

Missing from NOTICE (1):
  - axios 1.6.7  (MIT License)

Extra in NOTICE, not in SBOM (1):
  - phantom-pkg 9.9.9  (MIT License)

License mismatches (1):
  - lodash@4.17.21
      NOTICE: Apache License 2.0
      SBOM:   MIT License

NOTICE.md has discrepancies with the SBOM.
```
