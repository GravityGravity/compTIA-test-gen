# Cert Practice

A local desktop app (Electron) that creates practice exams for CompTIA A+ Core 1, Core 2, Network+, and Security+ (planned), plus acronym and definition exercises. The commands are in `CLAUDE.md` under "Commands".

## Linux: Electron sandbox on Ubuntu 24.04 and later

Ubuntu 24.04 blocks unprivileged user namespaces through AppArmor, so the development Electron aborts with "The SUID sandbox helper binary was found, but is not configured correctly". Give the project's Electron binary an AppArmor profile once (needs sudo; it keeps working after `npm install`):

```bash
sudo tee /etc/apparmor.d/cert-practice-electron-dev > /dev/null <<'PROFILE'
abi <abi/4.0>,
include <tunables/global>

profile cert-practice-electron-dev /home/gravity/_repos/compTIA-test-gen/node_modules/electron/dist/electron flags=(unconfined) {
  userns,
  include if exists <local/cert-practice-electron-dev>
}
PROFILE
sudo apparmor_parser -r /etc/apparmor.d/cert-practice-electron-dev
```

Change the path if the project is in another folder. Do not use `--no-sandbox`. The `.deb` installer adds its own AppArmor profile, so the installed app needs no change.
