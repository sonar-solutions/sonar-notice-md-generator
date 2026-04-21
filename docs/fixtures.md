# Fixtures
<!-- updated: 2026-04-21_15:25:00 -->

## `fixtures/sample-project/`
<!-- updated: 2026-04-21_15:25:00 -->

A six-dependency npm project (`express`, `lodash`, `chalk`, `axios`, `commander`, `dotenv`) used to exercise the full SBOM pipeline locally. After `npm install` it pulls in ~86 transitive packages with MIT / BSD-2-Clause / BSD-3-Clause / ISC licenses — enough to cover the common SPDX expressions and the de-duplication in the Licenses section.

### Re-scanning
<!-- updated: 2026-04-21_15:25:00 -->

```sh
cd fixtures/sample-project
npm install --cache /tmp/npm-cache     # workaround for root-owned ~/.npm
SONAR_TOKEN="$(jq -r .token ../../credentials.json)" sonar-scanner
```

The scanner config lives in `sonar-project.properties`:

```properties
sonar.projectKey=sample-notice-project
sonar.projectName=Sample Notice Project
sonar.sources=.
sonar.exclusions=node_modules/**,**/*.test.js
sonar.host.url=http://localhost:9000
sonar.sca.enabled=true
```

After the scan finishes, the project is available at
`http://localhost:9000/dashboard?id=sample-notice-project` and the SBOM endpoint
returns ~87 packages (86 real deps + the synthetic root).

### Why it's committed
<!-- updated: 2026-04-21_15:25:00 -->

`node_modules/`, `package-lock.json`, and `.scannerwork/` are gitignored. Only
`package.json` and `sonar-project.properties` are committed. This keeps the repo
small while letting anyone re-produce the same SBOM output with `npm install` +
`sonar-scanner`.
