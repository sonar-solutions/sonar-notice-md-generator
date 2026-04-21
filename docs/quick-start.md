# Quick Start
<!-- updated: 2026-04-21_15:25:00 -->

## Prerequisites
<!-- updated: 2026-04-21_15:25:00 -->

- SonarQube Enterprise (developer local or remote) with SCA enabled
- A user token (`squ_...`) with Browse on the target project
- For building: Node 20.10+ and `npx`

## Configure credentials
<!-- updated: 2026-04-21_15:25:00 -->

First match wins:

1. `--url` / `--token` CLI flags
2. `SONAR_URL` / `SONAR_TOKEN` environment variables
3. `./credentials.json`
4. `~/.sq-notice/credentials.json`

`credentials.json` schema:

```json
{ "url": "http://localhost:9000", "token": "squ_..." }
```

`credentials.json` is gitignored by default — do not commit it.

## Run from source
<!-- updated: 2026-04-21_15:25:00 -->

```sh
node src/cli.js list
node src/cli.js generate <projectKey> -o NOTICE.md
node src/cli.js verify NOTICE.md <projectKey>
```

## Build and run the binary
<!-- updated: 2026-04-21_15:25:00 -->

```sh
node build.js                  # build/sq-notice (host platform only)
./build/sq-notice list
./build/sq-notice generate <projectKey> -o NOTICE.md
./build/sq-notice verify NOTICE.md <projectKey> --strict
```

For cross-platform builds (macOS/Linux/Windows × x64/arm64) see [build.md](build.md).

## Next steps
<!-- updated: 2026-04-21_15:25:00 -->

- Reference for every subcommand: [commands.md](commands.md)
- What the generated NOTICE.md looks like: [notice-format.md](notice-format.md)
- How `verify` works and CI integration: [verify.md](verify.md)
