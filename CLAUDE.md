# CLAUDE.md

## Project Overview

`sq-notice` generates NOTICE.md files from SonarQube SBOMs. Single-file CLI using only Node built-ins, compiled into a standalone binary via Node's Single Executable Application (SEA) feature.

## Build & Run

```sh
node src/cli.js --help                    # CLI help
node src/cli.js generate <key> -o NOTICE.md  # generate from SonarQube
node src/cli.js verify NOTICE.md --sbom <file>  # verify against SBOM
node build-all.js                         # cross-compile all 6 binaries
```

## Testing Directive

After every code fix, verify by running the tool against a fixture SBOM:

```sh
# Generate a NOTICE.md and verify it round-trips cleanly
node src/cli.js generate test-project --sbom <sbom.json> -o /tmp/test-NOTICE.md
node src/cli.js verify /tmp/test-NOTICE.md --sbom <sbom.json>
```

If verify fails, fix the issue and re-verify. Repeat until all checks pass. Never consider a fix complete without a successful verification cycle.

## Security

- Never commit credentials.json, tokens, or secrets (even for testing).
- GitHub Actions in `.github/workflows/` must pin dependencies to full commit SHAs (not version tags).
- Use absolute paths for spawned executables (no bare `npx`, `node`, etc. in PATH).
- Avoid regex patterns vulnerable to catastrophic backtracking (ReDoS). Prefer string methods like `.trimEnd()`, `.startsWith()` over equivalent regex.
