⚠️ Disclaimer: This is a purely experimental project, not affiliated with SonarSource or SonarQube in any way. Use at your own risk. Please fork and modify for your own needs, but do not use this in production or share it without clearly stating that it's not an official SonarQube product. I am not responsible for any issues that arise from using this tool.

# SonarQube NOTICE.MD Generator

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=sonar-solutions_sonar-notice-md-generator)](https://sonarcloud.io/summary/new_code?id=sonar-solutions_sonar-notice-md-generator) [![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=sonar-solutions_sonar-notice-md-generator)

Generate a `NOTICE.md` file for your project — the document that credits every open-source library you use and includes their license text.

Most open-source licenses require you to include their full text whenever you ship software that uses them. Doing this by hand means tracking down every dependency (and every dependency's dependency), finding each license, and pasting the text into a file. It's tedious and error-prone.

**sq-notice** talks to your SonarQube server, grabs the list of dependencies it already knows about, and writes a clean `NOTICE.md` for you. One binary, no installation, works completely offline once downloaded.

---

## Quick start

### Step 1 — Download

Go to the [latest release](../../releases/latest) and grab the file for your platform:

| You are using… | Download this file |
| --- | --- |
| Mac (Apple Silicon — M1, M2, M3, M4) | `sq-notice-darwin-arm64` |
| Mac (Intel) | `sq-notice-darwin-x64` |
| Linux (Intel / AMD) | `sq-notice-linux-x64` |
| Linux (ARM — Raspberry Pi, AWS Graviton) | `sq-notice-linux-arm64` |
| Windows (Intel / AMD) | `sq-notice-win-x64.exe` |
| Windows (ARM — Surface Pro X, Snapdragon) | `sq-notice-win-arm64.exe` |

On macOS or Linux, make the binary executable after downloading:

```sh
chmod +x sq-notice-darwin-arm64
```

For detailed setup instructions (moving to PATH, macOS Gatekeeper, Windows SmartScreen, verifying downloads), see the [installation guide](docs/installation.md).

### Step 2 — Credentials

The tool needs your SonarQube server URL and a user token. The simplest way is a config file.

Create `~/.sq-notice/credentials.json`:

```json
{
  "url": "http://localhost:9000",
  "token": "squ_YOUR_TOKEN_HERE"
}
```

Replace the URL with your SonarQube server address, and the token with your personal user token (it starts with `squ_`). If you don't have a token yet, you can create one from your SonarQube profile under **My Account > Security > Generate Tokens**.

You can also pass credentials as CLI flags (`--url`, `--token`) or environment variables (`SONAR_URL`, `SONAR_TOKEN`). See [quick start](docs/quick-start.md) for all the options.

### Step 3 — Run it

List all projects on your SonarQube server:

```sh
sq-notice list
```

Generate a NOTICE file for a project:

```sh
sq-notice generate my-project -o NOTICE.md
```

That's it. Open `NOTICE.md` — every dependency and its full license text will be there.

---

## Commands

| Command | What it does |
| --- | --- |
| `sq-notice list` | Show all projects on the server |
| `sq-notice sbom <key>` | Download the raw SBOM (Software Bill of Materials — the machine-readable list of all dependencies) |
| `sq-notice generate <key> -o NOTICE.md` | Generate the attribution file |
| `sq-notice verify NOTICE.md <key>` | Check that a NOTICE.md is still up to date with the server |

See [full command reference](docs/commands.md) for all flags and options.

---

## Need help?

- [Installation guide](docs/installation.md) — platform setup, creating a SonarQube token, verifying downloads
- [Full command reference](docs/commands.md) — every flag and option explained
- [Troubleshooting and FAQ](docs/troubleshooting.md) — common errors and questions
- [All documentation](docs/README.md) — architecture, build system, internals

---

## For developers

If you want to build from source or contribute:

```sh
node build.js              # build for your current platform
node build-all.js          # build all 6 platform/arch binaries
```

Requires Node.js 20.10+. No `npm install` needed — there are zero runtime dependencies. See [docs/](docs/README.md) for architecture, build details, and internals.

---

## License

MIT License. Copyright (c) 2026 Joshua Quek.
