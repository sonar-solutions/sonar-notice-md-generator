# notice-md-generator Documentation

<!-- updated: 2026-04-21_15:25:00 -->

CLI that generates a `NOTICE.md` for a project by translating its SonarQube SBOM into structured Markdown. Distributed as a self-contained Node Single Executable Application (SEA) binary with no runtime dependencies — the full SPDX license-text corpus is baked into the binary as a SEA asset.

## At a glance

<!-- updated: 2026-04-21_15:25:00 -->

- **Source**: SonarQube Enterprise `/api/v2/sca/sbom-reports` (SPDX 2.3 by default).
- **Output**: Markdown `NOTICE.md` mirroring the [aiverify format](https://github.com/aiverify-foundation/aiverify/blob/main/NOTICE.md).
- **Distribution**: Single-executable binary (~89 MB on macOS arm64). No runtime dependencies.
- **Four subcommands**: `list`, `sbom`, `generate`, `verify`.

## Documentation index

<!-- updated: 2026-04-21_15:25:00 -->

### Getting started

- [quick-start.md](quick-start.md) — prerequisites, credentials, first NOTICE in 30 seconds.
- [commands.md](commands.md) — reference for every subcommand and global flag.

### Features

- [notice-format.md](notice-format.md) — what the generated NOTICE.md looks like and why.
- [verify.md](verify.md) — how `verify` works, parser rules, and CI integration examples.

### Internals

- [architecture.md](architecture.md) — data flow, repo layout, SEA asset loader, design constraints.
- [build.md](build.md) — native (`build.js`) and cross-platform (`build-all.js`) build pipelines.
- [sonarqube-api.md](sonarqube-api.md) — endpoints used, auth, organization quirks, normalization.
- [licenses-corpus.md](licenses-corpus.md) — SPDX catalog management, refresh, aliased and missing ids.

### Reference

- [fixtures.md](fixtures.md) — the `sample-project/` scanner fixture.
- [limitations.md](limitations.md) — known caveats (SonarQube SCA data quality, verify parser tightness, etc.).
- [changelog.md](changelog.md) — per-version notes.

## Version

<!-- updated: 2026-04-21_15:25:00 -->

Current: **0.2.0** (see [changelog.md](changelog.md)).
