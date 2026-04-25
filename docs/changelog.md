# Changelog
<!-- updated: 2026-04-21_21:30:00 -->

## Unreleased
<!-- updated: 2026-04-21_21:30:00 -->

### Added
<!-- updated: 2026-04-21_21:30:00 -->

- MIT `LICENSE` file at repo root. `package.json` now declares `"license": "MIT"` and `"author": "Joshua Quek"`.
- Additional license texts added to the embedded corpus for broader component coverage.
- License corpus documentation updated with coverage details and audit information.
- `docs/troubleshooting.md` — dedicated troubleshooting and FAQ page extracted from the root README.
- Root `README.md` rewritten as a short, beginner-friendly landing page (~100 lines). Detailed content now lives in `docs/`.

### Fixed
<!-- updated: 2026-04-23_12:00:00 -->

- Resolved all 67 SonarCloud static analysis issues across 4 files:
  - **2 vulnerabilities** (S2612): Tightened file permissions from `0o755` to `0o750` in `build.js` and `build-all.js`.
  - **5 critical code smells**: Reduced cognitive complexity in `renderNotice` (24→15), `parseArgs` (21→15), and `main` in `build-all.js` (17→15) by extracting helper functions. Fixed nested function depth (>4 levels) in `build-all.js` and `scripts/fetch-licenses.js`.
  - **9 major code smells**: Replaced logical-AND chains with optional chaining (`?.`), replaced regex `.test()` with `String#startsWith()`.
  - **51 minor code smells**: Replaced multiple `Array#push()` calls with array spread/init, flipped negated conditions, used `String#replaceAll()` over `String#replace()`.

### Known Issues
<!-- updated: 2026-04-21_21:30:00 -->

- **Version mismatch**: `package.json` still declares `"version": "0.1.0"` while `src/cli.js` defines `VERSION = '0.2.0'`. The `package.json` version should be bumped to `0.2.0` to match.

## 0.2.0 — 2026-04-21
<!-- updated: 2026-04-21_15:25:00 -->

### Added
<!-- updated: 2026-04-21_15:25:00 -->

- `verify` subcommand: cross-checks a NOTICE.md against a live SonarQube SBOM (or a SBOM JSON on disk via `--sbom`). Parses the `## Components` section with a lenient regex, normalizes the SBOM the same way `generate` does, and reports Missing / Extra / Mismatched packages. Exits 1 on any discrepancy. `--strict` currently only changes the failure summary message; the flag is accepted today so CI pipelines can opt in before future tiers are added.

### Changed
<!-- updated: 2026-04-21_15:25:00 -->

- `NOTICE.md` output is now structured Markdown. Previous releases emitted a single flat text file. The new format uses:
  - `# NOTICE — <project>` document title
  - `##` headings for Components / Copyright Text / Licenses
  - `# **License Name**` (H1 + bold) for each distinct license, with an SPDX-id HTML comment beside it for machine parsing
  - Triple-backtick code fences around every license body
  - `---` horizontal rules between every major block
  - Round-trippable `` - `name` `version` : license `` component rows (consumed by `verify`)

## 0.1.0 — 2026-04-21
<!-- updated: 2026-04-21_15:25:00 -->

### Added
<!-- updated: 2026-04-21_15:25:00 -->

- Initial implementation. Pivoted twice during design (license-profile-driven → SBOM-driven).
- `list` command: enumerate projects on a SonarQube Enterprise server.
- `sbom` command: fetch the raw SBOM report in SPDX 2.3 / SPDX 3.0 / CycloneDX format.
- `generate` command: fetch the SPDX 2.3 SBOM and render a plain-text NOTICE.md in the aiverify format.
- Full SPDX license-text corpus (650 / 658 ids, ~4 MB) embedded as a SEA asset.
- Node SEA build pipeline (`build.js`) for macOS arm64.
- Cross-platform build pipeline (`build-all.js`) for 6 targets.
- `fixtures/sample-project/` (6 npm deps → 86 transitive packages) to exercise the full pipeline against a real SonarQube scan.
