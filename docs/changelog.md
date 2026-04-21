# Changelog
<!-- updated: 2026-04-21_15:25:00 -->

## 0.2.0 — 2026-04-21
<!-- updated: 2026-04-21_15:25:00 -->

### Added
<!-- updated: 2026-04-21_15:25:00 -->

- `verify` subcommand: cross-checks a NOTICE.md against a live SonarQube SBOM (or a SBOM JSON on disk via `--sbom`). Parses the `## Components` section with a lenient regex, normalizes the SBOM the same way `generate` does, and reports Missing / Extra / Mismatched packages. Exits 1 on any discrepancy. `--strict` is reserved for future hard-fail semantics.

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
