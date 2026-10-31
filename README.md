# Cert Practice

<img src="build/icon.png" alt="" width="96" align="right">

A local desktop app that makes practice exams for CompTIA A+ Core 1 (220-1201), A+ Core 2 (220-1202), Network+ (N10-009), and Security+ (SY0-801), plus Acronym and Definition exercises. It works offline: no accounts and no network calls.

This is the `release` branch. It holds the source needed to build the installers; the installers themselves are on the [GitHub Releases page](https://github.com/GravityGravity/compTIA-test-gen/releases). Development (tests, content tools, UI drafts) is on `main`.

## Install

Download the installers from the [GitHub Releases page](https://github.com/GravityGravity/compTIA-test-gen/releases). `SHA256SUMS` on each release has their checksums.

| System | File | How |
|---|---|---|
| Windows 10/11 (x64) | `Cert Practice Setup 0.1.0.exe` | Run it and follow the steps. It is not code-signed, so SmartScreen may show "Windows protected your PC": select **More info**, then **Run anyway**. |
| Linux (Debian, Ubuntu, x64) | `cert-practice_0.1.0_amd64.deb` | `sudo apt install ./cert-practice_0.1.0_amd64.deb`, then open **Cert Practice** from the app menu. On Ubuntu 24.04 and later the package adds the AppArmor profile that Electron's sandbox needs. |

Your exam attempts are saved in `cert-practice.db` in the app's user data folder (`%APPDATA%\Cert Practice` on Windows, `~/.config/Cert Practice` on Linux).

## Build the installers

Node 24 and npm 11.

```bash
npm install
npm run dist:linux   # release/cert-practice_<version>_amd64.deb
npm run dist:win     # release/Cert Practice Setup <version>.exe
```

`dist:win` runs on Linux without Wine: `scripts/dist-win.mjs` has electron-builder read the NSIS uninstaller straight out of the installer. `better-sqlite3` ships a prebuilt binary for each platform, so there is no native rebuild. To publish a new version, raise `version` in `package.json`, build both installers, and attach them and a new `SHA256SUMS` to a GitHub Release tagged `v<version>` on this branch. Installers are not committed: they are over GitHub's 100 MB file limit.

The logo source is `build/icon.svg`; `build/icon.png`, `build/icons/`, `build/icon.ico`, and `resources/icon.png` (the Linux window icon) are made from it.
