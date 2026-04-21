# Build
<!-- updated: 2026-04-21_21:30:00 -->

Two build entry points:

| Command | Output | Use when |
| --- | --- | --- |
| `node build.js [--clean]` | `build/sq-notice` (host platform only) | Local dev, fastest |
| `node build-all.js [--clean] [--no-cache]` | `build/sq-notice-{platform}-{arch}[.exe]` × 6 | Release / distribution |

`--clean` behaves differently between the two scripts:
- **`build.js --clean`** wipes the entire `build/` directory (including `.node-cache/`).
- **`build-all.js --clean`** wipes `build/` outputs but preserves `build/.node-cache/` so re-runs don't re-download Node runtimes.
- **`build-all.js --no-cache`** additionally wipes the `.node-cache/` download cache.

## Native build (`build.js`)
<!-- updated: 2026-04-21_15:25:00 -->

What it does:

1. `scripts/build-bundle.js` → packs `src/licenses/index.json` + `src/licenses/texts/*.txt` into `build/licenses-bundle.json` (~4 MB).
2. `node --experimental-sea-config sea-config.json` → produces `build/sea-prep.blob`. Uses `useCodeCache: true`, so the blob is arch-specific.
3. Copies the running `node` binary to `build/sq-notice`.
4. On macOS: `codesign --remove-signature` so postject can rewrite segments.
5. `npx -y postject build/sq-notice NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA` — injects the SEA blob. The npx cache is pinned to `build/.npm-cache` to avoid root-owned `~/.npm` breakage.
6. On macOS: `codesign --sign -` re-signs with an ad-hoc signature so Gatekeeper allows exec.

Final binary: **~89 MB** on macOS arm64 (Node runtime ~85 MB + 4 MB license corpus). `postject` is a build-time-only dependency pulled via `npx`; the shipped binary itself has no dependencies.

## Cross-platform build (`build-all.js`)
<!-- updated: 2026-04-21_15:25:00 -->

Produces six binaries in one shot — macOS, Linux, Windows × x64, arm64:

| Target | Output file |
| --- | --- |
| darwin-x64 | `build/sq-notice-darwin-x64` |
| darwin-arm64 | `build/sq-notice-darwin-arm64` |
| linux-x64 | `build/sq-notice-linux-x64` |
| linux-arm64 | `build/sq-notice-linux-arm64` |
| win-x64 | `build/sq-notice-win-x64.exe` |
| win-arm64 | `build/sq-notice-win-arm64.exe` |

How it works:

1. Uses a second config, `sea-config.cross.json`, that sets `useCodeCache: false`. V8's code cache is architecture-specific, so turning it off makes the emitted `build/sea-prep.cross.blob` deterministic and portable across archs. The trade-off is a tiny one-time startup cost (V8 re-parses `cli.js` on first run).
2. Downloads the matching Node runtime (`process.version`) for each target from `nodejs.org/dist/` in parallel (`Promise.all` over all six). Archives land in `build/.node-cache/` and are reused across runs. macOS/Linux use `.tar.xz`, Windows uses `.zip`.
3. Warms the npx cache with `postject --help` once up-front so later invocations don't race to install it.
4. For each target: copies the extracted `node`/`node.exe` to `build/sq-notice-<platform>-<arch>[.exe]`, runs `postject` with `--macho-segment-name NODE_SEA` for darwin targets, and (on darwin host only) does `codesign --remove-signature` before and `codesign --sign -` after. postject is format-aware — it handles Mach-O, ELF, and PE automatically based on the target binary.

## Host requirements
<!-- updated: 2026-04-21_15:25:00 -->

- macOS host: builds all six targets fully (signs the two darwin binaries).
- Linux/Windows host: darwin binaries will postject-inject but won't be codesigned, so macOS Gatekeeper will reject them. Use a macOS host (or CI runner) for darwin releases.
- `tar` (BSD or GNU, xz support) and `unzip` must be on PATH.

## Binary size
<!-- updated: 2026-04-21_15:25:00 -->

Binary sizes are Node-runtime-dominated (~85–95 MB depending on platform) plus ~4 MB license corpus.

## CI / Release (`.github/workflows/release.yml`)
<!-- updated: 2026-04-21_17:30:00 -->

The release workflow at `.github/workflows/release.yml` automates cross-platform builds and publishes them to GitHub Releases.

**Triggers:**
- `push` of any tag matching `v*` → builds **and** publishes a release.
- `workflow_dispatch` (manual) → always builds; publishes only if `inputs.tag` is non-empty (blank = build-only smoke test).

**Job 1 — `build` (runs on `macos-14`)**

1. `actions/checkout@v4`.
2. `actions/setup-node@v4` pins Node.js `20.20.1`. This must match what local development uses because `build-all.js` downloads `nodejs.org/dist/v${process.version}/...` archives for each target.
3. `node build-all.js` produces all 6 binaries in `build/`.
4. `shasum -a 256` produces `build/SHA256SUMS.txt` covering all six files.
5. `actions/upload-artifact@v4` uploads the 6 binaries + `SHA256SUMS.txt` as a single artifact named `sq-notice-binaries` (14-day retention).

A macOS runner is used for the entire build because it's the only host where `codesign` can ad-hoc-sign the two darwin Mach-O binaries. The other four targets (Linux ELF, Windows PE) are cross-injected via `postject` from the same macOS host — postject is format-aware and handles all three binary formats.

**Job 2 — `release` (runs on `ubuntu-latest`, `needs: build`)**

Gated by `if: startsWith(github.ref, 'refs/tags/v') || (github.event_name == 'workflow_dispatch' && inputs.tag != '')`.

1. `actions/download-artifact@v4` pulls the artifact from Job 1.
2. A small shell step derives the tag from either `GITHUB_REF` (push) or `inputs.tag` (dispatch).
3. `softprops/action-gh-release@v2` publishes the release with auto-generated notes and attaches all 7 files.

Permissions: only `contents: write`. Uses the default `GITHUB_TOKEN` — no secrets to configure.

**Release process for maintainers:**

```sh
# bump src/cli.js VERSION + package.json version, commit, then:
git tag v0.2.0
git push --tags
```

Or from the Actions UI: **Run workflow** → enter a tag (e.g. `v0.2.0`) to publish, or leave blank for a build-only smoke test. The artifact is always uploaded so you can download pre-release binaries from the workflow run page even without tagging.

**Why a single macOS runner and not a matrix of native runners?**

An ARM64 Linux / ARM64 Windows runner matrix is possible (GitHub offers both on the free tier now), but the macOS-only approach has two wins: (a) darwin binaries get their codesign step on the same machine that built them, no cross-host artifact shuffling; (b) one workflow, one Node version, one place to debug. The trade-off is that the cross-compat SEA blob uses `useCodeCache: false`, costing a tiny one-time startup parse. For an ad-hoc CLI this is invisible.
