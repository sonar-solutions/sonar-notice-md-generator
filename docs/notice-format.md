# NOTICE.md Output Format
<!-- updated: 2026-04-21_15:25:00 -->

As of v0.2.0 the generator emits structured Markdown (previous releases emitted plain text). The structure mirrors the information in the [aiverify NOTICE.md](https://github.com/aiverify-foundation/aiverify/blob/main/NOTICE.md) but is rendered Markdown rather than legacy flat text.

## Overall structure
<!-- updated: 2026-04-21_21:30:00 -->

````markdown
# NOTICE — <Project Name>

**Copyright:** <year>··
**Version:** <version>··        <!-- omitted entirely when version is falsy -->
**Phase:** <phase>··
**Distribution:** <distribution>

---

## Components

N third-party component(s).        <!-- singular "component" when N == 1 -->

- `accepts` `1.3.8` : MIT License
- `axios` `1.6.7` : MIT License
- ...

---

## Copyright Text        <!-- section omitted entirely if no package has real copyrightText -->

### `name` `version`

_pkg:npm/name@version_

```
<copyright text>
```

---

## Licenses              <!-- section omitted entirely if no SPDX ids extracted -->

N distinct license(s) in use.     <!-- singular "license" when N == 1 -->

---

# **MIT License**
<!-- SPDX-License-Identifier: MIT -->

**Used by (N):** pkg1 v, pkg2 v, ...

```
<full canonical SPDX text>
```

---

# **BSD 3-Clause "New" or "Revised" License**
<!-- SPDX-License-Identifier: BSD-3-Clause -->
...
````

The `··` markers above represent literal trailing two-space sequences (Markdown line breaks) appended by the code to Copyright, Version, and Phase lines. The Distribution line has no trailing spaces.

## Formatting choices
<!-- updated: 2026-04-21_21:30:00 -->

- **Sort order — components**: all records are sorted alphabetically by name, then by version (`localeCompare`). This order is applied once at the top of `renderNotice` and governs the Components list, the Copyright Text entries, and the per-license "Used by" lists.
- **Sort order — licenses**: the Licenses section sorts license blocks by their human-readable name (via `licenseHumanName`), not by SPDX id.
- Each distinct license is introduced by `# **License Name**` (H1 + bold) so jumping between licenses in a long NOTICE is visually unambiguous when scrolling. This deliberately breaks the one-H1-per-document convention in exchange for maximum visual separation.
- The `<!-- SPDX-License-Identifier: ... -->` HTML comment beside each license heading is intentional metadata — it does not render, but downstream tools can parse it with a plain regex.
- License texts are wrapped in a triple-backtick code fence so they render verbatim (preserving line wrapping, indentation, ASCII art) in any Markdown viewer.
- Horizontal rules (`---`) separate every major block: header, Components, Copyright Text, Licenses summary, and each license body.
- Component rows wrap the package name and version in backticks: `` - `name` `version` : Human License Name ``. This is a deliberate round-trippable format — it is exactly what [verify.md](verify.md) parses from the `## Components` section.

## Rules applied by `renderNotice`
<!-- updated: 2026-04-21_21:30:00 -->

- Synthetic SBOM root packages (no `purl`) are skipped.
- `licenseDeclared` wins over `licenseConcluded`; each falls back to the other; `NOASSERTION` if both are absent.
- `NOASSERTION` / `NONE` are preserved verbatim in the Components line (never translated to a human name).
- The **Version** metadata line is only emitted when the `version` argument is truthy. Copyright, Phase, and Distribution are always present.
- The **Copyright Text** block is omitted entirely if no package has real copyright text. During SBOM normalization, `NOASSERTION` copyright values are mapped to empty string, so they are excluded. SonarQube's SCA currently returns `NOASSERTION` for most packages, so the section is commonly absent.
- The **Licenses** section is omitted entirely if no SPDX ids can be extracted from any record (e.g., every package is `NOASSERTION` or `NONE`).
- The Licenses section dedupes by SPDX identifier. Each unique id is listed with the packages that use it, followed by the canonical text from `src/licenses/texts/<id>.txt`. Trailing whitespace in the license text is stripped before rendering.
- When a license text file is not available, the fallback is a blockquote pair:
  ```
  > No canonical license text available for SPDX id `<id>`.
  > See <https://spdx.org/licenses/<id>.html>.
  ```
  This applies to the 8 deprecated SPDX ids (`bzip2-1.0.5`, `Net-SNMP`, etc.) that the upstream SPDX repo does not publish.
- The count lines use singular/plural: "1 third-party component" vs "N third-party components"; "1 distinct license" vs "N distinct licenses".
