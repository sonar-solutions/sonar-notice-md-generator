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
<!-- updated: 2026-04-21_21:30:00 -->

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

**What the output looks like** (abridged -- real output is a full Markdown document):

````markdown
# NOTICE — My Project

**Copyright:** 2026  
**Version:** v2.1.0  
**Phase:** PRODUCTION  
**Distribution:** COMMERCIAL

---

## Components

86 third-party components.

- `axios` `1.6.0` : Apache License 2.0
- `chalk` `5.3.0` : MIT License
- `express` `4.18.2` : MIT License
- `lodash` `4.17.21` : MIT License
- …

---

## Licenses

18 distinct licenses in use.

---

# **Apache License 2.0**
<!-- SPDX-License-Identifier: Apache-2.0 -->

**Used by (3):** axios 1.6.0, ...

```
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

... (full Apache-2.0 text) ...
```

---

# **MIT License**
<!-- SPDX-License-Identifier: MIT -->

**Used by (42):** chalk 5.3.0, express 4.18.2, lodash 4.17.21, ...

```
MIT License

Copyright (c) ...
... (full MIT text) ...
```

---
````

Key things to note:
- Each license gets its own `# **Heading**` so you can skim quickly.
- A hidden HTML comment carries the SPDX identifier -- useful for automation.
- License texts are fenced code blocks so Markdown renderers don't mangle punctuation.
- A `## Copyright Text` section is included **only** when SonarQube supplied real copyright text for at least one package (usually it doesn't).

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
