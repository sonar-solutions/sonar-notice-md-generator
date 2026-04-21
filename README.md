# sq-notice

**Generate a `NOTICE.md` file from your SonarQube project — the attribution file that lists every open-source library your project uses, together with its license text.**

You download one file, run it, and get a NOTICE.md. No installing Node.js. No Python. No Docker. No package manager. Just one binary.

> **In a hurry?** Jump to [Step 1 — Download](#step-1--download-the-right-binary) · [Step 2 — Credentials](#step-2--tell-sq-notice-how-to-reach-sonarqube) · [Step 3 — Run](#step-3--run-it).

---

## Table of contents

- [What does this tool actually do?](#what-does-this-tool-actually-do)
- [What you need before you start](#what-you-need-before-you-start)
- [Step 1 — Download the right binary](#step-1--download-the-right-binary)
  - [macOS setup](#macos-setup)
  - [Linux setup](#linux-setup)
  - [Windows setup](#windows-setup)
- [Step 2 — Tell sq-notice how to reach SonarQube](#step-2--tell-sq-notice-how-to-reach-sonarqube)
- [Step 3 — Run it](#step-3--run-it)
- [Every command, with examples](#every-command-with-examples)
  - [`sq-notice list`](#sq-notice-list)
  - [`sq-notice sbom`](#sq-notice-sbom)
  - [`sq-notice generate`](#sq-notice-generate)
  - [`sq-notice verify`](#sq-notice-verify)
- [Complete end-to-end example](#complete-end-to-end-example)
- [How do I create a SonarQube token?](#how-do-i-create-a-sonarqube-token)
- [Verify your download (optional, recommended)](#verify-your-download-optional-recommended)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [For developers](#for-developers)

---

## What does this tool actually do?

When you ship software — especially commercial software — you usually need a file called `NOTICE.md` (or `NOTICE.txt`, or `THIRD-PARTY-NOTICES`) that credits every open-source library you depend on and includes the full text of each library's license. Companies do this because most open-source licenses require it.

Writing this file by hand is miserable. You'd have to find every direct and transitive dependency, look up each license, and paste the full license text.

**sq-notice does it for you.** It:

1. Talks to your SonarQube server.
2. Asks SonarQube for the Software Bill of Materials (SBOM) for your project — SonarQube already knows every dependency because it scans your code.
3. For each unique license it finds, pulls the canonical license text from an embedded corpus of 650+ SPDX licenses.
4. Writes out a tidy `NOTICE.md` file in the same format used by projects like [aiverify](https://github.com/aiverify-foundation/aiverify/blob/main/NOTICE.md).

That's it. One command in, one file out.

---

## What you need before you start

Three things:

1. **A SonarQube server you can reach** — running locally (e.g. `http://localhost:9000`), hosted by your company, or in the cloud.
2. **A SonarQube user token** — a secret string that starts with `squ_…`. It tells the server "this tool is allowed to act as me". See [How do I create a SonarQube token?](#how-do-i-create-a-sonarqube-token) below if you don't have one.
3. **A project key** — the unique name of the project you want attribution for, as shown in SonarQube's UI. Example: `my-backend`, `sample-notice-project`.

You do **not** need Node.js, Python, Docker, Homebrew, or anything else. Just the single binary.

---

## Step 1 — Download the right binary

Go to the **[latest release](../../releases/latest)** and download the file that matches your computer:

| You are using… | Download this file |
| --- | --- |
| A Mac from late 2020 onwards (Apple Silicon: M1, M2, M3, M4) | `sq-notice-darwin-arm64` |
| An older Intel Mac | `sq-notice-darwin-x64` |
| A regular Linux PC or server (Intel or AMD) | `sq-notice-linux-x64` |
| An ARM-based Linux box (e.g. Raspberry Pi 4/5, AWS Graviton, Oracle Ampere) | `sq-notice-linux-arm64` |
| A regular Windows PC | `sq-notice-win-x64.exe` |
| A Windows ARM laptop (e.g. Surface Pro X, Snapdragon X laptops) | `sq-notice-win-arm64.exe` |

> The binary is ~70–100 MB because it includes a full Node.js runtime plus every SPDX license text. Once downloaded it runs completely offline from there.

### Not sure which one you need?

<details>
<summary><strong>On macOS</strong></summary>

Click the Apple menu (top-left) → **About This Mac**.
- **"Chip: Apple M…"** → download `sq-notice-darwin-arm64`
- **"Processor: Intel…"** → download `sq-notice-darwin-x64`
</details>

<details>
<summary><strong>On Linux</strong></summary>

Open a terminal and run:
```sh
uname -m
```
- **`x86_64`** → download `sq-notice-linux-x64`
- **`aarch64`** or **`arm64`** → download `sq-notice-linux-arm64`
</details>

<details>
<summary><strong>On Windows</strong></summary>

Press **Windows key + Pause/Break**, or go to **Settings → System → About**.
Look at **System type**:
- **"x64-based PC"** → download `sq-notice-win-x64.exe`
- **"ARM-based PC"** → download `sq-notice-win-arm64.exe`
</details>

### macOS setup

After downloading:

1. Open **Terminal** (press ⌘+Space, type "Terminal", press Enter).
2. Go to the folder you downloaded to:
   ```sh
   cd ~/Downloads
   ```
3. Make the file executable:
   ```sh
   chmod +x sq-notice-darwin-arm64
   ```
   (Replace `sq-notice-darwin-arm64` with whichever file you downloaded.)
4. Remove the "downloaded from the internet" flag that would otherwise trigger a Gatekeeper warning:
   ```sh
   xattr -d com.apple.quarantine sq-notice-darwin-arm64
   ```
5. (Optional but recommended) Rename and move it somewhere on your PATH so you can just type `sq-notice`:
   ```sh
   sudo mv sq-notice-darwin-arm64 /usr/local/bin/sq-notice
   ```
6. Test it:
   ```sh
   sq-notice --help
   ```
   You should see a help message. Done.

> If you skip step 4 and get a dialog saying **"sq-notice cannot be opened because the developer cannot be verified"**: either right-click the file in Finder → **Open** → **Open anyway**, or run `xattr -d com.apple.quarantine /path/to/file` in Terminal.

### Linux setup

After downloading:

1. Open a terminal.
2. Go to the download folder:
   ```sh
   cd ~/Downloads
   ```
3. Make it executable:
   ```sh
   chmod +x sq-notice-linux-x64
   ```
4. (Optional but recommended) Move it to a folder on your PATH:
   ```sh
   sudo mv sq-notice-linux-x64 /usr/local/bin/sq-notice
   ```
5. Test it:
   ```sh
   sq-notice --help
   ```

### Windows setup

After downloading:

1. Right-click the downloaded `.exe` → **Properties**. At the bottom of the General tab, if there's an **Unblock** checkbox, tick it and click **OK**. (Without this, Windows will keep warning about it.)
2. (Optional) Rename `sq-notice-win-x64.exe` to `sq-notice.exe` and move it to a folder on your PATH — e.g. create `C:\tools\` and add it via **Settings → System → About → Advanced system settings → Environment Variables → Path → Edit → New → `C:\tools\`**.
3. Open **PowerShell** or **Command Prompt** and test:
   ```powershell
   sq-notice --help
   ```

> The first time you run it, **Windows SmartScreen** will probably show "Windows protected your PC". Click **More info → Run anyway**. This is because the binary is not signed with a paid Microsoft Authenticode certificate — it's not a virus, Windows just doesn't recognise the publisher. You only need to do this once per version.

---

## Step 2 — Tell sq-notice how to reach SonarQube

The tool needs two things: the server URL and a user token. You can provide them **three different ways** — pick whichever feels easiest.

The tool checks all three in order. First match wins.

### Option A — CLI flags (simplest for one-off runs)

```sh
sq-notice list --url http://localhost:9000 --token squ_YOUR_TOKEN_HERE
```

### Option B — environment variables (good for scripts, CI)

**macOS / Linux:**
```sh
export SONAR_URL=http://localhost:9000
export SONAR_TOKEN=squ_YOUR_TOKEN_HERE
sq-notice list
```

**Windows PowerShell:**
```powershell
$env:SONAR_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "squ_YOUR_TOKEN_HERE"
sq-notice list
```

**Windows Command Prompt:**
```cmd
set SONAR_URL=http://localhost:9000
set SONAR_TOKEN=squ_YOUR_TOKEN_HERE
sq-notice list
```

### Option C — a config file (best if you use sq-notice regularly)

Create a file called `credentials.json`. Two valid locations:
- In the folder you're running sq-notice from (per-project config), **or**
- At `~/.sq-notice/credentials.json` (per-user, works from anywhere).

Contents:
```json
{
  "url": "http://localhost:9000",
  "token": "squ_YOUR_TOKEN_HERE"
}
```

**macOS/Linux one-liner:**
```sh
mkdir -p ~/.sq-notice
cat > ~/.sq-notice/credentials.json <<'EOF'
{
  "url": "http://localhost:9000",
  "token": "squ_YOUR_TOKEN_HERE"
}
EOF
chmod 600 ~/.sq-notice/credentials.json
```

> **Security:** never commit `credentials.json` to git. If you store it in a project folder, add `credentials.json` to your `.gitignore`.

---

## Step 3 — Run it

Check that everything works by listing all projects on the SonarQube server:

```sh
sq-notice list
```

You should see something like:
```
KEY                    NAME                   VISIBILITY
my-backend             My Backend             public
frontend-web           Frontend Web           public
sample-notice-project  Sample Notice Project  public
```

The columns are: **project key** (copy this to pass to `generate`), **display name**, and **visibility** (public / private).

Then generate a NOTICE.md for one of those projects:

```sh
sq-notice generate sample-notice-project -o NOTICE.md
```

Open `NOTICE.md` in any editor — it should contain every dependency and its license text.

Done. That's the whole tool.

---

## Every command, with examples

### `sq-notice list`

Lists every project on the SonarQube server.

```sh
sq-notice list
```

Output columns are: project key, display name, visibility (public/private). The project key is what you pass to `generate` / `sbom` / `verify`.

### `sq-notice sbom`

Download the raw Software Bill of Materials without rendering it. Useful if you want to feed it into another tool or cache it locally.

```sh
# default (SPDX 2.3, to stdout)
sq-notice sbom my-project

# save to file
sq-notice sbom my-project -o sbom.json

# specific branch
sq-notice sbom my-project --branch develop -o sbom.json

# alternative formats
sq-notice sbom my-project --type spdx_30 -o sbom.json
sq-notice sbom my-project --type cyclonedx -o sbom.json
```

| Flag | Meaning |
| --- | --- |
| `-o FILE` | Write output to FILE (default: stdout) |
| `--branch B` | Pick a specific project branch |
| `--type TYPE` | One of `spdx_23` (default), `spdx_30`, `cyclonedx` |

### `sq-notice generate`

**The main command.** Downloads the SBOM and turns it into a human-readable `NOTICE.md`.

Simplest form:
```sh
sq-notice generate my-project -o NOTICE.md
```

With custom header fields:
```sh
sq-notice generate my-project \
  -o NOTICE.md \
  --project-version v2.1.0 \
  --phase PRODUCTION \
  --distribution COMMERCIAL \
  --copyright-year 2026
```

From a SBOM file you already have (no SonarQube call):
```sh
sq-notice generate my-project --sbom sbom.json -o NOTICE.md
```

All the flags:

| Flag | Meaning | Default |
| --- | --- | --- |
| `-o FILE` | Output file | stdout |
| `--branch B` | Project branch | main branch |
| `--project-version V` | Goes into the `[name : version]` header line | empty |
| `--phase PHASE` | Goes into the `Phase:` header line | `DEVELOPMENT` |
| `--distribution D` | Goes into the `Distribution:` header line | `OPENSOURCE` |
| `--copyright-year Y` | Year in the `Copyright` line | current year |
| `--sbom FILE` | Use a local SBOM JSON file (skip the SonarQube API call) | — |

**What the output looks like** (abridged — real output is a full Markdown document):

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
- A hidden HTML comment carries the SPDX identifier — useful for automation.
- License texts are fenced code blocks so Markdown renderers don't mangle punctuation.
- A `## Copyright Text` section is included **only** when SonarQube supplied real copyright text for at least one package (usually it doesn't — see the [FAQ](#faq)).

### `sq-notice verify`

Check that an existing `NOTICE.md` still matches the live project on SonarQube. Useful in **CI pipelines** — you can fail a build if someone adds a new dependency without updating NOTICE.md.

```sh
# warn about drift (exit code 0 unless the file is malformed)
sq-notice verify NOTICE.md my-project

# fail the build on ANY difference (missing OR extra components)
sq-notice verify NOTICE.md my-project --strict

# verify against a local SBOM file instead of calling the server
sq-notice verify NOTICE.md --sbom sbom.json --strict

# specific branch
sq-notice verify NOTICE.md my-project --branch develop --strict
```

**Example CI step (GitHub Actions):**
```yaml
- name: Verify NOTICE.md is up to date
  env:
    SONAR_URL: ${{ secrets.SONAR_URL }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  run: ./sq-notice verify NOTICE.md my-project --strict
```

---

## Complete end-to-end example

You have:
- SonarQube at `https://sonar.mycompany.com`
- A token `squ_abc123xyz…`
- A project with key `backend-api`

```sh
# --- one-time setup ---
mkdir -p ~/.sq-notice
cat > ~/.sq-notice/credentials.json <<'EOF'
{
  "url": "https://sonar.mycompany.com",
  "token": "squ_abc123xyz..."
}
EOF
chmod 600 ~/.sq-notice/credentials.json

# --- confirm it's working ---
sq-notice list

# --- generate the NOTICE for a release ---
sq-notice generate backend-api \
  -o NOTICE.md \
  --project-version v2.1.0 \
  --phase PRODUCTION \
  --distribution COMMERCIAL

# --- in CI, check it hasn't drifted ---
sq-notice verify NOTICE.md backend-api --strict

# --- download the raw SBOM for your compliance team ---
sq-notice sbom backend-api -o backend-api-sbom.json
```

---

## How do I create a SonarQube token?

1. Log in to your SonarQube server in a web browser.
2. Click your **avatar** in the top-right → **My Account**.
3. Go to the **Security** tab.
4. Under **Generate Tokens**:
   - Name: `sq-notice` (or anything — just a label for your records).
   - Type: **User Token** (or **Global Analysis Token** with Browse permission on your projects). Project Analysis Tokens won't work — they only grant "Execute Analysis" and can't list projects or fetch SBOMs.
   - Expiration: pick whatever your team's policy allows.
   - Click **Generate**.
5. **Copy the token immediately.** SonarQube only shows it once. It starts with `squ_…`.

Save it to your credentials file (see [Option C above](#option-c--a-config-file-best-if-you-use-sq-notice-regularly)) or pass it as an env var.

If you lose it, just regenerate. Tokens only need **Browse** permission on the project you're attributing.

---

## Verify your download (optional, recommended)

Every release ships a `SHA256SUMS.txt` file next to the binaries. To confirm your download hasn't been tampered with:

**macOS / Linux:**
```sh
# in the folder where you downloaded the binary + SHA256SUMS.txt
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
```
You should see `sq-notice-your-platform: OK`.

**Windows PowerShell:**
```powershell
Get-FileHash .\sq-notice-win-x64.exe -Algorithm SHA256
# then compare the printed hash against the matching line in SHA256SUMS.txt
```

---

## Troubleshooting

### `sq-notice: command not found`

You haven't put the binary on your `PATH`. Either:
- Move it: `sudo mv sq-notice-linux-x64 /usr/local/bin/sq-notice`, or
- Call it with an explicit path: `./sq-notice-linux-x64 list` (from the folder where it lives).

### `permission denied`

You didn't make the binary executable. Run:
```sh
chmod +x sq-notice-<your-platform>
```

### macOS — "cannot be opened because the developer cannot be verified"

Remove the download quarantine flag:
```sh
xattr -d com.apple.quarantine /path/to/sq-notice-darwin-arm64
```
Then try again. (Alternative: right-click the binary in Finder → **Open** → **Open anyway**.)

### Windows — SmartScreen blocks the file

Click **More info** → **Run anyway**. Or right-click the `.exe` → **Properties** → tick **Unblock** → **OK**. The binary is not malicious — it's just not signed with a paid Microsoft Authenticode certificate, which makes SmartScreen suspicious of any brand-new binary.

### `Component '…' not found`

Project keys are case-sensitive. Run `sq-notice list` to see every key on the server and copy-paste the exact one.

### `401 Unauthorized` or `403 Forbidden`

Your token is wrong, expired, or lacks `Browse` permission on the project.
- Double-check the token string — no leading/trailing whitespace, exact copy.
- Regenerate from the SonarQube UI (see [How do I create a SonarQube token?](#how-do-i-create-a-sonarqube-token)).
- Ask your SonarQube admin if your account has access to the target project.

### `ECONNREFUSED` or `getaddrinfo ENOTFOUND`

The URL is wrong or the server isn't reachable from where you're running the tool.
- Double-check `url` in credentials — include the scheme (`http://` or `https://`).
- If SonarQube is only reachable via VPN/private network, make sure you're connected.
- If the server uses a non-standard port, include it (`http://localhost:9000`).

### The `Copyright Text` section is empty / missing

That's normal. SonarQube's SCA currently returns `NOASSERTION` for copyright text on most packages, so the tool omits the section when there's nothing real to show. The `Licenses:` section will still be fully populated with license text.

### What does `NOASSERTION` mean?

SPDX terminology for "the scanner couldn't detect a license". If you see it in the Components list, that particular package's license couldn't be identified from its metadata — you'll need to check that package manually.

### The binary is huge (~90 MB)!

Yes. It bundles a full Node.js runtime plus the canonical text of 650+ open-source licenses (~4 MB). The trade-off is that you don't need to install anything else — and you can run the binary on a machine with no network access once you've saved an SBOM locally.

---

## FAQ

**Q: Does this upload my code or dependencies anywhere?**

No. It talks only to the SonarQube server you point it at. The license corpus is baked into the binary — no external fetches at runtime.

**Q: Does it work with SonarCloud / SonarQube Cloud?**

Yes, if the instance exposes the `/api/v2/sca/sbom-reports` endpoint (available on SonarQube Enterprise and Cloud tiers that include SCA).

**Q: What if a license isn't recognised?**

The tool supports every SPDX-standard license ID. For 8 deprecated SPDX IDs that have no canonical text in the current SPDX release, the NOTICE file includes a pointer to `https://spdx.org/licenses/<id>.html` instead of the full text.

**Q: Can I customise the output format?**

Not via flags — the format is fixed to match the [aiverify NOTICE.md](https://github.com/aiverify-foundation/aiverify/blob/main/NOTICE.md) template. If you need a different format, you can use `sq-notice sbom … -o sbom.json` to get the raw data and write your own renderer.

**Q: Why not just use `npm` / `yarn` / `pnpm` built-in license tools?**

Those only cover npm projects. `sq-notice` works for any language SonarQube supports — Java, Python, C#, Go, Rust, JavaScript, etc. — because it uses SonarQube's unified SBOM.

---

## For developers

If you want to build from source, read the source, or contribute:

- **Technical documentation:** [docs/README.md](docs/README.md)
- **Build from source:**
  ```sh
  node build-all.js          # all 6 platform/arch binaries
  node build.js              # just the current platform
  ```
  Requires Node.js 20.10+. No npm install needed — the project has zero runtime dependencies; `postject` (build-time only) is fetched via `npx`.
- **Release process:** push a `v*` git tag. GitHub Actions at [.github/workflows/release.yml](.github/workflows/release.yml) builds all 6 binaries on a macOS runner and publishes them to the Releases page along with `SHA256SUMS.txt`.

---

## Questions / bugs

Open an issue on the repository. Include:
- Which binary you downloaded (`sq-notice-linux-x64` etc.)
- Your OS + version
- The exact command you ran
- The exact output (redact your token!)
