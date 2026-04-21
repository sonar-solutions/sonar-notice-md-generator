# Commands Reference
<!-- updated: 2026-04-21_15:25:00 -->

## `sq-notice list`
<!-- updated: 2026-04-21_15:25:00 -->

List all projects on the SonarQube server.

```
sq-notice list [--url URL] [--token TOKEN]
```

Outputs a three-column table: KEY, NAME, VISIBILITY.

## `sq-notice sbom`
<!-- updated: 2026-04-21_15:25:00 -->

Download the raw SBOM report for a project.

```
sq-notice sbom <projectKey> [--branch BRANCH]
                            [--type spdx_23 | spdx_30 | cyclonedx]
                            [-o FILE]
```

Defaults: `--type spdx_23`. The default branch is used if `--branch` is omitted.
When `-o` is set, writes to disk and prints a one-line summary to stderr; otherwise
prints the SBOM JSON to stdout.

## `sq-notice generate`
<!-- updated: 2026-04-21_15:25:00 -->

Fetch the SBOM (SPDX 2.3) and render it as a Markdown `NOTICE.md`.

```
sq-notice generate <projectKey> [--branch BRANCH] [-o FILE]
                                [--phase PHASE]
                                [--distribution DISTRIBUTION]
                                [--project-version VERSION]
                                [--copyright-year YEAR]
                                [--sbom FILE]
```

Flags:

- `--phase DEVELOPMENT` (default) — rendered as the `**Phase:**` line in the header.
- `--distribution OPENSOURCE` (default) — rendered as the `**Distribution:**` line.
- `--project-version v1.0.0` — rendered as the `**Version:**` line.
- `--copyright-year 2026` — overrides `new Date().getUTCFullYear()`.
- `--sbom path/to/sbom.json` — skip the API call and translate a local SBOM instead.

Output structure is documented in [notice-format.md](notice-format.md).

## `sq-notice verify`
<!-- updated: 2026-04-21_15:25:00 -->

Compare an existing `NOTICE.md` against a SonarQube SBOM.

```
sq-notice verify <notice.md> <projectKey> [--branch BRANCH] [--strict]
sq-notice verify <notice.md> --sbom <sbom.json>           [--strict]
```

Parses the `## Components` section of the NOTICE, fetches (or loads) the SBOM, and
reports Missing / Extra / Mismatched packages. Exits 1 on any discrepancy. Details
in [verify.md](verify.md).

## Global flags
<!-- updated: 2026-04-21_15:25:00 -->

- `--version` / `-V` — print version, exit.
- `--help` / `-h` / `help` — print help, exit.
- `--url URL` — override SonarQube URL (otherwise from env / credentials.json).
- `--token TOKEN` — override SonarQube token.
