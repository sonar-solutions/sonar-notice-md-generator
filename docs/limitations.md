# Limitations
<!-- updated: 2026-04-21_15:25:00 -->

## Data-source limitations (SonarQube SCA)
<!-- updated: 2026-04-21_15:25:00 -->

- SonarQube's SCA currently returns `NOASSERTION` for `copyrightText` on most packages. The Copyright Text section of generated NOTICEs will therefore frequently be empty — that's a SonarQube data-source limitation, not a tool bug.
- The SBOM's `licenseDeclared` is often `NOASSERTION` too, so `generate` falls back to `licenseConcluded`. When both are `NOASSERTION` the Components row will show `NOASSERTION` verbatim — those packages need a manual license lookup before publishing the NOTICE.

## Branch handling
<!-- updated: 2026-04-21_15:25:00 -->

Branch parameter defaults to the project's main branch. For monorepo workflows with multiple analyzed branches, pass `--branch` explicitly. The SonarQube SBOM endpoint rejects a non-existent branch with a 404; the CLI surfaces that error message verbatim.

## SPDX expression handling
<!-- updated: 2026-04-21_15:25:00 -->

SPDX license expressions are tokenised, not fully parsed; `(A OR B) AND C` is flattened to the set `{A, B, C}` for the Licenses section. For NOTICE purposes this over-includes rather than under-includes, which is the safe direction — the reader will see every license that could possibly apply, even if the expression semantically narrows the set.

## License-text misses
<!-- updated: 2026-04-21_15:25:00 -->

Eight SPDX ids in SonarQube's catalog have no canonical text in the upstream SPDX repo and fall back to an HTML pointer. See [licenses-corpus.md](licenses-corpus.md#missing-ids) for the full list.

## Build platform coverage
<!-- updated: 2026-04-21_15:25:00 -->

Only darwin builds have been smoke-tested end-to-end. `build-all.js` is written to handle macOS, Linux, and Windows targets (postject is format-aware), but the Linux and Windows branches have not been run yet. Cross-compiled darwin binaries built from a non-macOS host will not be codesigned and will be rejected by Gatekeeper.

## `verify` parser tightness
<!-- updated: 2026-04-21_15:25:00 -->

The `verify` command parses the `## Components` section with a regex that expects the exact bullet format:

```
- `name` `version` : license
```

Hand-edits that break this pattern (dropping a backtick, collapsing the separator, reformatting to a markdown table, adding a leading blockquote `>`, indenting, etc.) will cause those rows to be silently dropped from the comparison set. They will then surface as false "Missing" entries against the SBOM.

To keep `verify` authoritative, re-generate NOTICE.md with `generate` after manual edits rather than editing in place. Or keep hand-edited content in a separate appendix file and concatenate.
