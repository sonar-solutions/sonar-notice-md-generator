# Commands Reference
<!-- updated: 2026-04-21_22:10:00 -->

Complete reference for every `sq-notice` command, flag, and option — with exhaustive examples.

---

## Table of Contents

- [Global Flags](#global-flags)
- [Credential Resolution](#credential-resolution)
- [`sq-notice list`](#sq-notice-list)
- [`sq-notice sbom`](#sq-notice-sbom)
- [`sq-notice generate`](#sq-notice-generate)
- [`sq-notice verify`](#sq-notice-verify)
- [Output Behavior](#output-behavior)
- [Exit Codes](#exit-codes)
- [Flag Syntax Rules](#flag-syntax-rules)

---

## Global Flags
<!-- updated: 2026-04-21_22:10:00 -->

These flags work with **every** command.

| Flag | Short | Description |
| --- | --- | --- |
| `--help` | `-h` | Print help text and exit. The bare word `help` also works. |
| `--version` | `-V` | Print version number and exit. |
| `--url URL` | — | Override the SonarQube server URL. |
| `--token TOKEN` | — | Override the SonarQube authentication token. |

### Examples

```bash
# Print help
sq-notice --help
sq-notice -h
sq-notice help

# Print version
sq-notice --version
sq-notice -V

# Override credentials for any command
sq-notice list --url https://sonar.company.com --token squ_abc123
sq-notice sbom my-project --url http://localhost:9000 --token squ_local
sq-notice generate my-project --url https://sonar.company.com --token squ_abc123 -o NOTICE.md
```

---

## Credential Resolution
<!-- updated: 2026-04-21_22:10:00 -->

`sq-notice` resolves SonarQube credentials in this order (first match wins):

| Priority | Source | Example |
| --- | --- | --- |
| 1 | CLI flags `--url` / `--token` | `sq-notice list --url http://localhost:9000 --token squ_abc` |
| 2 | Environment variables `SONAR_URL` / `SONAR_TOKEN` | `SONAR_URL=http://localhost:9000 SONAR_TOKEN=squ_abc sq-notice list` |
| 3 | `./credentials.json` (current directory) | File in your working directory |
| 4 | `~/.sq-notice/credentials.json` (home directory) | Global fallback |

**Credentials file format:**

```json
{
  "url": "https://sonar.company.com",
  "token": "squ_abc123def456..."
}
```

### Examples

```bash
# Use CLI flags (highest priority — overrides everything else)
sq-notice list --url https://sonar.company.com --token squ_abc123

# Use environment variables
export SONAR_URL=https://sonar.company.com
export SONAR_TOKEN=squ_abc123
sq-notice list

# Inline env vars for a single command
SONAR_URL=http://localhost:9000 SONAR_TOKEN=squ_local sq-notice list

# Use a credentials.json in the current directory (no flags needed)
echo '{"url":"http://localhost:9000","token":"squ_local"}' > credentials.json
sq-notice list

# Use global credentials in home directory
mkdir -p ~/.sq-notice
echo '{"url":"https://sonar.company.com","token":"squ_abc123"}' > ~/.sq-notice/credentials.json
sq-notice list
```

---

## `sq-notice list`
<!-- updated: 2026-04-21_22:10:00 -->

List all projects on the SonarQube server.

```
sq-notice list [--url URL] [--token TOKEN]
```

**Positional arguments:** None.

**Output:** A three-column table — `KEY`, `NAME`, `VISIBILITY`. If no projects exist, prints a message to stderr.

### Examples

```bash
# List all projects (credentials from env or credentials.json)
sq-notice list

# List projects on a specific server
sq-notice list --url https://sonar.company.com --token squ_abc123

# List projects using only a URL override (token from env/file)
sq-notice list --url http://localhost:9000

# List projects using only a token override (URL from env/file)
sq-notice list --token squ_abc123

# Pipe output to grep to find a specific project
sq-notice list | grep my-service

# Count how many projects exist
sq-notice list | tail -n +2 | wc -l
```

**Sample output:**

```
KEY                          NAME                         VISIBILITY
my-backend-api               My Backend API               private
frontend-app                 Frontend App                 public
shared-libs                  Shared Libraries             private
```

---

## `sq-notice sbom`
<!-- updated: 2026-04-21_22:10:00 -->

Download the raw SBOM (Software Bill of Materials) for a project.

```
sq-notice sbom <projectKey> [--branch BRANCH]
                            [--type spdx_23 | spdx_30 | cyclonedx]
                            [-o FILE]
                            [--url URL] [--token TOKEN]
```

### Arguments and Flags

| Argument / Flag | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `<projectKey>` | positional | **yes** | — | The SonarQube project key (case-sensitive). |
| `--branch BRANCH` | string | no | server default branch | Which branch to pull the SBOM from. |
| `--type TYPE` | string | no | `spdx_23` | SBOM format: `spdx_23`, `spdx_30`, or `cyclonedx`. |
| `-o FILE` / `--output FILE` | string | no | stdout | Write output to a file instead of stdout. |

### Supported SBOM Formats

| Value | Format | Typical extension |
| --- | --- | --- |
| `spdx_23` | SPDX 2.3 JSON (default) | `.spdx.json` |
| `spdx_30` | SPDX 3.0 JSON | `.spdx.json` |
| `cyclonedx` | CycloneDX JSON | `.cdx.json` |

### Examples

```bash
# Download SPDX 2.3 SBOM to stdout (default format)
sq-notice sbom my-project

# Download SPDX 2.3 SBOM and save to a file
sq-notice sbom my-project -o sbom.json
sq-notice sbom my-project --output sbom.json

# Download SPDX 3.0 SBOM
sq-notice sbom my-project --type spdx_30
sq-notice sbom my-project --type spdx_30 -o sbom-spdx30.json

# Download CycloneDX SBOM
sq-notice sbom my-project --type cyclonedx
sq-notice sbom my-project --type cyclonedx -o sbom.cdx.json

# Download SBOM from a specific branch
sq-notice sbom my-project --branch develop
sq-notice sbom my-project --branch feature/auth -o sbom.json
sq-notice sbom my-project --branch release/2.0 --type cyclonedx -o sbom.cdx.json

# Combine all flags
sq-notice sbom my-project \
  --branch develop \
  --type spdx_30 \
  -o sbom-develop.json \
  --url https://sonar.company.com \
  --token squ_abc123

# Pipe to jq for pretty-printing or filtering
sq-notice sbom my-project | jq '.packages | length'
sq-notice sbom my-project | jq '.packages[].name'

# Redirect stdout to a file (equivalent to -o)
sq-notice sbom my-project > sbom.json

# Download SBOMs for multiple projects in a loop
for key in backend-api frontend-app shared-libs; do
  sq-notice sbom "$key" -o "sbom-${key}.json"
done
```

---

## `sq-notice generate`
<!-- updated: 2026-04-21_22:10:00 -->

Fetch the SBOM (SPDX 2.3) from SonarQube and render it as a Markdown `NOTICE.md` with full license texts.

```
sq-notice generate <projectKey> [--branch BRANCH]
                                [-o FILE]
                                [--phase PHASE]
                                [--distribution DISTRIBUTION]
                                [--project-version VERSION]
                                [--copyright-year YEAR]
                                [--sbom FILE]
                                [--url URL] [--token TOKEN]
```

### Arguments and Flags

| Argument / Flag | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `<projectKey>` | positional | **yes** | — | The SonarQube project key. |
| `--branch BRANCH` | string | no | server default branch | Branch to fetch the SBOM from. |
| `-o FILE` / `--output FILE` | string | no | stdout | Write Markdown output to a file. |
| `--phase PHASE` | string | no | `DEVELOPMENT` | Rendered as the **Phase:** line in the header. |
| `--distribution DIST` | string | no | `OPENSOURCE` | Rendered as the **Distribution:** line. |
| `--project-version VER` | string | no | _(empty)_ | Rendered as the **Version:** line. |
| `--copyright-year YEAR` | string | no | current UTC year | Rendered as the **Copyright:** line. |
| `--sbom FILE` | string | no | _(fetch from API)_ | Use a local SBOM file instead of calling SonarQube. |

### Metadata Flags in Detail

**`--phase`** — Any free-text string. Common values:

| Value | When to use |
| --- | --- |
| `DEVELOPMENT` (default) | Active development, internal use |
| `STAGING` | Pre-production testing |
| `PRODUCTION` | Live / released software |
| `ARCHIVED` | End-of-life project |

**`--distribution`** — Any free-text string. Common values:

| Value | When to use |
| --- | --- |
| `OPENSOURCE` (default) | Public open-source distribution |
| `COMMERCIAL` | Commercial / proprietary distribution |
| `INTERNAL` | Internal-only, not distributed externally |
| `SAAS` | Hosted service, no binary distribution |

**`--project-version`** — Any free-text string. Examples: `v1.0.0`, `2.1.0-beta`, `2026Q1`.

**`--copyright-year`** — Defaults to the current UTC year. Override when generating a NOTICE for a past or future release.

**`--sbom`** — Path to a local SPDX 2.3 or CycloneDX JSON file. When provided, the tool skips the SonarQube API entirely. You still pass `<projectKey>` (used for the document title). No `--url` or `--token` needed.

### Examples

**Basic usage — defaults only:**

```bash
# Generate to stdout with all defaults (DEVELOPMENT, OPENSOURCE, current year)
sq-notice generate my-project

# Generate and save to a file
sq-notice generate my-project -o NOTICE.md
sq-notice generate my-project --output NOTICE.md
```

**Customizing metadata:**

```bash
# Set phase only
sq-notice generate my-project -o NOTICE.md --phase PRODUCTION
sq-notice generate my-project -o NOTICE.md --phase STAGING

# Set distribution only
sq-notice generate my-project -o NOTICE.md --distribution COMMERCIAL
sq-notice generate my-project -o NOTICE.md --distribution INTERNAL

# Set version only
sq-notice generate my-project -o NOTICE.md --project-version v2.1.0
sq-notice generate my-project -o NOTICE.md --project-version 1.0.0-rc.1

# Set copyright year only
sq-notice generate my-project -o NOTICE.md --copyright-year 2025

# Combine all metadata flags
sq-notice generate my-project \
  -o NOTICE.md \
  --phase PRODUCTION \
  --distribution COMMERCIAL \
  --project-version v2.1.0 \
  --copyright-year 2026
```

**Using a specific branch:**

```bash
# Generate from the develop branch
sq-notice generate my-project --branch develop -o NOTICE.md

# Generate from a release branch with production metadata
sq-notice generate my-project \
  --branch release/2.0 \
  -o NOTICE.md \
  --phase PRODUCTION \
  --project-version v2.0.0

# Generate from a feature branch (useful for previewing)
sq-notice generate my-project --branch feature/new-deps -o NOTICE-preview.md
```

**Using a local SBOM file (offline mode):**

```bash
# Generate from a previously downloaded SPDX SBOM
sq-notice generate my-project --sbom sbom.spdx.json -o NOTICE.md

# Generate from a CycloneDX SBOM
sq-notice generate my-project --sbom sbom.cdx.json -o NOTICE.md

# Combine local SBOM with metadata overrides
sq-notice generate my-project \
  --sbom sbom.json \
  -o NOTICE.md \
  --phase PRODUCTION \
  --distribution COMMERCIAL \
  --project-version v3.0.0 \
  --copyright-year 2026

# No credentials needed with --sbom
sq-notice generate my-project --sbom sbom.json -o NOTICE.md
```

**Piping and redirection:**

```bash
# Redirect stdout to a file (equivalent to -o)
sq-notice generate my-project > NOTICE.md

# Pipe to less for paging
sq-notice generate my-project | less

# Pipe to wc to count lines
sq-notice generate my-project | wc -l

# Preview just the header
sq-notice generate my-project | head -20
```

**With explicit credentials:**

```bash
# Override both URL and token
sq-notice generate my-project \
  -o NOTICE.md \
  --url https://sonar.company.com \
  --token squ_abc123

# Inline environment variables
SONAR_URL=http://localhost:9000 SONAR_TOKEN=squ_local \
  sq-notice generate my-project -o NOTICE.md
```

**CI/CD pipeline example:**

```bash
# Typical CI step: generate a production NOTICE and commit it
sq-notice generate my-project \
  -o NOTICE.md \
  --phase PRODUCTION \
  --distribution COMMERCIAL \
  --project-version "$(git describe --tags)" \
  --copyright-year "$(date +%Y)" \
  --url "$SONAR_URL" \
  --token "$SONAR_TOKEN"
```

### What the Output Looks Like

The generated Markdown has this structure (abridged):

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
- ...

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

... (full license text) ...
```

---

# **MIT License**
<!-- SPDX-License-Identifier: MIT -->

**Used by (42):** chalk 5.3.0, express 4.18.2, lodash 4.17.21, ...

```
MIT License

Copyright (c) ...
... (full license text) ...
```

---
````

Key structural details:

- Each license gets its own `# **Heading**` for easy scanning.
- A hidden HTML comment carries the SPDX identifier (useful for automation).
- License texts are in fenced code blocks so Markdown renderers don't mangle punctuation.
- A `## Copyright Text` section appears **only** when SonarQube supplied real copyright text for at least one package (usually it doesn't).
- Components are sorted alphabetically by name, then by version.

Full output structure is documented in [notice-format.md](notice-format.md).

---

## `sq-notice verify`
<!-- updated: 2026-04-21_22:10:00 -->

Compare an existing `NOTICE.md` against a SonarQube SBOM and report any drift.

```
sq-notice verify <notice.md> <projectKey> [--branch BRANCH] [--strict]
                                          [--url URL] [--token TOKEN]

sq-notice verify <notice.md> --sbom <sbom.json> [--strict]
```

There are **two variants**: fetch the SBOM from SonarQube (provide `<projectKey>`), or use a local SBOM file (provide `--sbom`).

### Arguments and Flags

| Argument / Flag | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `<notice.md>` | positional | **yes** | — | Path to the NOTICE.md file to verify. |
| `<projectKey>` | positional | **yes** (variant 1) | — | SonarQube project key to fetch the SBOM from. |
| `--sbom FILE` | string | **yes** (variant 2) | — | Path to a local SBOM JSON file. Replaces `<projectKey>`. |
| `--branch BRANCH` | string | no | server default | Branch to fetch the SBOM from (only with `<projectKey>`). |
| `--strict` | boolean | no | `false` | Enables strict mode (changes failure message wording). |

### What It Checks

The verify command reports three categories of drift:

| Category | Meaning |
| --- | --- |
| **Missing** | Package exists in the SBOM but is not listed in the NOTICE. |
| **Extra** | Package is listed in the NOTICE but does not exist in the SBOM. |
| **Mismatched** | Same package (name + version) exists in both, but the license string differs. |

**Exit code 0** = NOTICE is consistent. **Exit code 1** = any discrepancy found.

### Examples

**Variant 1 — Verify against SonarQube (live fetch):**

```bash
# Basic verification against the default branch
sq-notice verify NOTICE.md my-project

# Verify with strict mode
sq-notice verify NOTICE.md my-project --strict

# Verify against a specific branch
sq-notice verify NOTICE.md my-project --branch develop
sq-notice verify NOTICE.md my-project --branch release/2.0

# Verify against a specific branch with strict mode
sq-notice verify NOTICE.md my-project --branch develop --strict

# Verify with explicit credentials
sq-notice verify NOTICE.md my-project \
  --url https://sonar.company.com \
  --token squ_abc123

# Verify with explicit credentials, branch, and strict mode
sq-notice verify NOTICE.md my-project \
  --branch main \
  --strict \
  --url https://sonar.company.com \
  --token squ_abc123
```

**Variant 2 — Verify against a local SBOM file (offline):**

```bash
# Basic offline verification
sq-notice verify NOTICE.md --sbom sbom.json

# Offline verification with strict mode
sq-notice verify NOTICE.md --sbom sbom.json --strict

# Verify against a CycloneDX SBOM
sq-notice verify NOTICE.md --sbom sbom.cdx.json

# Verify against a previously downloaded SPDX 3.0 SBOM
sq-notice verify NOTICE.md --sbom sbom-spdx30.json --strict
```

**CI/CD pipeline examples:**

```bash
# Fail the build if NOTICE is stale (CI gate)
sq-notice verify NOTICE.md my-project --strict \
  --url "$SONAR_URL" \
  --token "$SONAR_TOKEN"

# Download SBOM first, then verify offline (avoids double-fetch)
sq-notice sbom my-project -o /tmp/sbom.json
sq-notice verify NOTICE.md --sbom /tmp/sbom.json --strict

# Verify and capture exit code
if sq-notice verify NOTICE.md my-project --strict; then
  echo "NOTICE.md is up to date"
else
  echo "NOTICE.md has drifted — regenerate it"
  exit 1
fi
```

**Verifying a NOTICE at a non-default path:**

```bash
# NOTICE in a subdirectory
sq-notice verify docs/NOTICE.md my-project

# NOTICE with a custom name
sq-notice verify THIRD_PARTY_LICENSES.md my-project --strict

# Absolute path
sq-notice verify /home/ci/build/NOTICE.md my-project
```

### Sample Output — Clean

```
Verifying NOTICE.md against my-project (default branch)
  SBOM packages:   86
  NOTICE packages: 86

  [OK]   packages listed in NOTICE are all in SBOM (86/86)
  [OK]   packages in SBOM are all listed in NOTICE (86/86)
  [OK]   license names match for every package (86/86)

NOTICE.md is consistent with the SBOM.
```

### Sample Output — Drift Detected

```
Verifying NOTICE.md against my-project (default branch)
  SBOM packages:   87
  NOTICE packages: 86

  [FAIL] packages listed in NOTICE are all in SBOM (85/86)
  [FAIL] packages in SBOM are all listed in NOTICE (86/87)
  [FAIL] license names match for every package (84/85)

Missing from NOTICE (1):
  - new-dependency 2.0.0  (MIT License)

Extra in NOTICE, not in SBOM (1):
  - removed-package 1.3.0  (BSD 2-Clause "Simplified" License)

License mismatches (1):
  - lodash@4.17.21
      NOTICE: Apache License 2.0
      SBOM:   MIT License

NOTICE.md has discrepancies with the SBOM.
```

With `--strict`, the final line reads:

```
NOTICE.md does not match the SBOM (strict mode).
```

---

## Output Behavior
<!-- updated: 2026-04-21_22:10:00 -->

| Command | With `-o FILE` | Without `-o` |
| --- | --- | --- |
| `list` | _(not supported)_ | Table to stdout |
| `sbom` | Writes JSON to file; summary to stderr | JSON to stdout |
| `generate` | Writes Markdown to file; summary to stderr | Markdown to stdout |
| `verify` | _(not supported)_ | Report to stdout |

- **Status messages** (progress, warnings, byte counts) always go to **stderr**, never stdout.
- This makes piping safe: `sq-notice sbom key | jq .` and `sq-notice generate key | less` work as expected.

---

## Exit Codes
<!-- updated: 2026-04-21_22:10:00 -->

| Code | Meaning | When |
| --- | --- | --- |
| `0` | Success | Command completed without errors; `verify` found no drift. |
| `1` | Failure | `verify` detected drift; network error; missing file; bad JSON. |
| `2` | Unknown command | e.g. `sq-notice invalid-cmd`. |

---

## Flag Syntax Rules
<!-- updated: 2026-04-21_22:10:00 -->

The argument parser accepts multiple syntaxes:

```bash
# Long flags — space or equals
--flag value
--flag=value

# Short flags — space or equals
-o value
-o=value

# Boolean flags — no value needed
--strict
--help
-V

# Stop flag parsing with --
sq-notice verify NOTICE.md my-project -- extra-arg

# Positional arguments — anything not starting with -
sq-notice generate my-project
```

All of the following are equivalent:

```bash
sq-notice sbom my-project --type spdx_30 -o sbom.json
sq-notice sbom my-project --type=spdx_30 -o=sbom.json
sq-notice sbom my-project -o sbom.json --type spdx_30
```

---

## All Flags — Quick Reference
<!-- updated: 2026-04-21_22:10:00 -->

| Command | Flag | Type | Default | Valid Values |
| --- | --- | --- | --- | --- |
| _all_ | `--version` / `-V` | bool | — | — |
| _all_ | `--help` / `-h` | bool | — | — |
| _all_ | `--url` | string | credentials | any URL |
| _all_ | `--token` | string | credentials | `squ_...` |
| `sbom` | `<projectKey>` | positional | **required** | project key |
| `sbom` | `--branch` | string | default branch | branch name |
| `sbom` | `--type` | string | `spdx_23` | `spdx_23`, `spdx_30`, `cyclonedx` |
| `sbom` | `-o` / `--output` | string | stdout | file path |
| `generate` | `<projectKey>` | positional | **required** | project key |
| `generate` | `--branch` | string | default branch | branch name |
| `generate` | `-o` / `--output` | string | stdout | file path |
| `generate` | `--phase` | string | `DEVELOPMENT` | any string |
| `generate` | `--distribution` | string | `OPENSOURCE` | any string |
| `generate` | `--project-version` | string | _(empty)_ | any string |
| `generate` | `--copyright-year` | string | current year | any string |
| `generate` | `--sbom` | string | _(fetch from API)_ | file path |
| `verify` | `<notice.md>` | positional | **required** | file path |
| `verify` | `<projectKey>` | positional | **required**\* | project key |
| `verify` | `--sbom` | string | — | file path |
| `verify` | `--branch` | string | default branch | branch name |
| `verify` | `--strict` | bool | `false` | — |

\* Required if `--sbom` is not provided.
