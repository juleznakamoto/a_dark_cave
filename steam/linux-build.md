# Native Linux build (Steam)

The game code is already portable, so a native Linux build is mostly a packaging and Steamworks setup task:

- `electron/` has no Windows-only paths or APIs.
- Imports and asset paths match the files' exact case.
- `steamworks.js` ships `libsteam_api.so` for Linux, and it is unpacked from the asar like the Windows DLL.

Nothing here changes the Windows build or the upload scripts. A Linux depot only ships once you set one up in
Steamworks.

## Build

```sh
npm run electron:package:linux        # full game -> release/linux-unpacked/a-dark-cave
npm run electron:package:demo:linux   # demo      -> release/linux-unpacked/a-dark-cave
```

- `node scripts/package-steam-full.mjs --win --linux` builds both platforms from one Vite/Electron build.
- The target is a plain folder (`dir`). AppImage is the wrong format for Steam: it needs FUSE and doesn't fit the
  Steam Linux Runtime container.
- The full game and the demo use the same executable name, `a-dark-cave`, so one launch option fits both.
- **Executable bits:** NTFS has no Unix executable bit. If you build or upload from Windows, check on a Linux
  install that `a-dark-cave` and `chrome_crashpad_handler` are executable. Building and uploading from Linux or WSL
  avoids the problem.

## Steamworks setup (for each app: full game and demo)

1. **Depots** (SteamPipe → Depots):
   - Add a depot with Operating System = **Linux + SteamOS**.
   - Set the existing Windows depot to **Windows**, so Linux clients don't download both.
2. **Launch option** (Installation → General):
   - Executable: `a-dark-cave`
   - Arguments: `--no-sandbox --ozone-platform=x11`
   - OS: Linux + SteamOS
3. **Linux runtime** (Installation → Linux Runtime): Steam Linux Runtime 3.0 (sniper).
4. **Steam Cloud** (Auto-Cloud → Root Overrides): the save lives in `WinAppDataRoaming/A Dark Cave/`; on Linux,
   Electron's `appData` is `~/.config`, so the Linux save is `~/.config/A Dark Cave/`. Add an override:
   - Original root: `WinAppDataRoaming`
   - OS: Linux
   - New root: `LinuxHome`
   - Add/Replace path: `.config/`
   The subdirectory name must stay exactly `A Dark Cave`, because Linux paths are case-sensitive (`electron/paths.ts`).
5. **Upload:** `scripts/steam-upload*.ps1` only upload `release/win-unpacked`. For the Linux depot, add a second
   `DepotBuildConfig` whose `ContentRoot` is `release/linux-unpacked`, or extend the scripts with an optional
   Linux depot ID.
6. **Store page:** add Linux system requirements only once the Linux depot is live.

### Why those launch arguments

- `--no-sandbox`: Steam can't ship Chromium's `chrome-sandbox` helper as a root-owned SUID binary. The Steam Linux
  Runtime container and recent Ubuntu (AppArmor) also block unprivileged user namespaces. Without the flag,
  Electron aborts at startup ("SUID sandbox helper binary ... not configured correctly").
  `app.commandLine.appendSwitch` runs too late for this, because Chromium starts its zygote process before
  `main.ts` executes.
- `--ozone-platform=x11`: Electron 38+ runs as a native Wayland app on Wayland desktops, and the Steam overlay
  can't hook a native Wayland window. Without the flag, Shift+Tab and the store/review overlay calls do nothing.
  With it, the game runs through XWayland.

## Known limits

- **glibc ≥ 2.34** (Ubuntu 22.04 / Debian 12 class, or SteamOS 3): the `steamworks.js` native module needs it. On
  older systems the game still runs, because `electron/steam.ts` catches the load error. Achievements and overlay
  calls are then off. Steam Cloud keeps working, because the Steam client syncs Auto-Cloud files.
- **Japanese / Chinese fonts:** no CJK font is bundled. Windows falls back to Yu Gothic / Microsoft YaHei; Linux
  uses whatever the system has, and a minimal system can show empty boxes. Test those locales, or bundle Noto Sans
  JP/SC subsets.
- **Steam Deck:** once a Linux depot exists, the Deck installs it instead of running the Windows build through
  Proton. Test both before switching.

## Test checklist

- The game starts from Steam on an X11 desktop and on a Wayland desktop (KDE or GNOME).
- The Steam Deck works in Game Mode and Desktop Mode.
- Achievements unlock, and Shift+Tab opens the overlay.
- A save from Windows shows up through Steam Cloud, and a Linux save goes back to Windows.
- Fullscreen toggle, Quit (which saves), and the window icon all work.
- The `ja` and `zh-CN` languages render correctly.
