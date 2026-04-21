# Installation
<!-- updated: 2026-04-21_21:30:00 -->

Detailed platform-specific setup instructions for `sq-notice`. If you just want a quick overview, see [quick-start.md](quick-start.md).

---

## Download the right binary
<!-- updated: 2026-04-21_21:30:00 -->

Go to the **[latest release](../../releases/latest)** and download the file that matches your computer:

| You are using... | Download this file |
| --- | --- |
| A Mac from late 2020 onwards (Apple Silicon: M1, M2, M3, M4) | `sq-notice-darwin-arm64` |
| An older Intel Mac | `sq-notice-darwin-x64` |
| A regular Linux PC or server (Intel or AMD) | `sq-notice-linux-x64` |
| An ARM-based Linux box (e.g. Raspberry Pi 4/5, AWS Graviton, Oracle Ampere) | `sq-notice-linux-arm64` |
| A regular Windows PC | `sq-notice-win-x64.exe` |
| A Windows ARM laptop (e.g. Surface Pro X, Snapdragon X laptops) | `sq-notice-win-arm64.exe` |

> The binary is ~70-100 MB because it includes a full Node.js runtime plus every SPDX license text. Once downloaded it runs completely offline from there.

### Not sure which one you need?
<!-- updated: 2026-04-21_21:30:00 -->

<details>
<summary><strong>On macOS</strong></summary>

Click the Apple menu (top-left) -> **About This Mac**.
- **"Chip: Apple M..."** -> download `sq-notice-darwin-arm64`
- **"Processor: Intel..."** -> download `sq-notice-darwin-x64`
</details>

<details>
<summary><strong>On Linux</strong></summary>

Open a terminal and run:
```sh
uname -m
```
- **`x86_64`** -> download `sq-notice-linux-x64`
- **`aarch64`** or **`arm64`** -> download `sq-notice-linux-arm64`
</details>

<details>
<summary><strong>On Windows</strong></summary>

Press **Windows key + Pause/Break**, or go to **Settings -> System -> About**.
Look at **System type**:
- **"x64-based PC"** -> download `sq-notice-win-x64.exe`
- **"ARM-based PC"** -> download `sq-notice-win-arm64.exe`
</details>

---

## macOS setup
<!-- updated: 2026-04-21_21:30:00 -->

After downloading:

1. Open **Terminal** (press Cmd+Space, type "Terminal", press Enter).
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

> If you skip step 4 and get a dialog saying **"sq-notice cannot be opened because the developer cannot be verified"**: either right-click the file in Finder -> **Open** -> **Open anyway**, or run `xattr -d com.apple.quarantine /path/to/file` in Terminal.

---

## Linux setup
<!-- updated: 2026-04-21_21:30:00 -->

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

---

## Windows setup
<!-- updated: 2026-04-21_21:30:00 -->

After downloading:

1. Right-click the downloaded `.exe` -> **Properties**. At the bottom of the General tab, if there's an **Unblock** checkbox, tick it and click **OK**. (Without this, Windows will keep warning about it.)
2. (Optional) Rename `sq-notice-win-x64.exe` to `sq-notice.exe` and move it to a folder on your PATH -- e.g. create `C:\tools\` and add it via **Settings -> System -> About -> Advanced system settings -> Environment Variables -> Path -> Edit -> New -> `C:\tools\`**.
3. Open **PowerShell** or **Command Prompt** and test:
   ```powershell
   sq-notice --help
   ```

> The first time you run it, **Windows SmartScreen** will probably show "Windows protected your PC". Click **More info -> Run anyway**. This is because the binary is not signed with a paid Microsoft Authenticode certificate -- it's not a virus, Windows just doesn't recognise the publisher. You only need to do this once per version.

---

## How do I create a SonarQube token?
<!-- updated: 2026-04-21_21:30:00 -->

1. Log in to your SonarQube server in a web browser.
2. Click your **avatar** in the top-right -> **My Account**.
3. Go to the **Security** tab.
4. Under **Generate Tokens**:
   - Name: `sq-notice` (or anything -- just a label for your records).
   - Type: **User Token** (or **Global Analysis Token** with Browse permission on your projects). Project Analysis Tokens won't work -- they only grant "Execute Analysis" and can't list projects or fetch SBOMs.
   - Expiration: pick whatever your team's policy allows.
   - Click **Generate**.
5. **Copy the token immediately.** SonarQube only shows it once. It starts with `squ_...`.

Save it to your credentials file (see [quick-start.md](quick-start.md) for configuration options) or pass it as an env var.

If you lose it, just regenerate. Tokens only need **Browse** permission on the project you're attributing.

---

## Verify your download (SHA256)
<!-- updated: 2026-04-21_21:30:00 -->

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
