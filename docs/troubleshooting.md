# Troubleshooting and FAQ

<!-- updated: 2026-04-21_21:30:00 -->

Quick fixes for the most common stumbling blocks, plus answers to questions that come up a lot.

---

## Common issues

<!-- updated: 2026-04-21_21:30:00 -->

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
- Regenerate from the SonarQube UI (see [How do I create a SonarQube token?](../README.md#how-do-i-create-a-sonarqube-token)).
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

## Frequently asked questions

<!-- updated: 2026-04-21_21:30:00 -->

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

## Questions / bugs

<!-- updated: 2026-04-21_21:30:00 -->

Open an issue on the repository. Include:
- Which binary you downloaded (`sq-notice-linux-x64` etc.)
- Your OS + version
- The exact command you ran
- The exact output (redact your token!)
