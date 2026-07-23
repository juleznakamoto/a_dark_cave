import { app, BrowserWindow, ipcMain, shell } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { startLoopbackServer, type LoopbackServer } from "./loopbackServer";
import {
  enableSteamOverlay,
  initSteam,
  getPlayerName,
  activateAchievement,
  isSteamReady,
} from "./steam";
import {
  APP_USER_DATA_NAME,
  APP_WINDOW_TITLE,
  STEAM_CLOUD_SAVE_FILE,
} from "./paths";

/**
 * Electron main process for the A Dark Cave Steam build.
 *
 * Responsibilities:
 *  - Initialize Steamworks (achievements, overlay).
 *  - Serve the built SPA over a loopback HTTP server (absolute-path routing).
 *  - Persist saves to a flat file in userData (synced to the cloud via Steam
 *    Auto-Cloud, configured in the Steamworks partner backend).
 */

// Must run before `app.whenReady()` so userData matches Steam Auto-Cloud Unterverzeichnis.
app.setName(APP_USER_DATA_NAME);

const DEV_SERVER_URL = process.env.ADC_DEV_SERVER_URL; // set by electron:dev to use Vite dev server

let mainWindow: BrowserWindow | null = null;
let loopback: LoopbackServer | null = null;
/**
 * Intended fullscreen state while Electron/Windows catches up.
 * On Windows (esp. with Steam overlay), `maximize` fires during fullscreen
 * transitions and `isFullScreen()` can lag — never trust a raw read mid-toggle.
 */
let fullscreenIntent: boolean | null = null;

/** Resolve the Steam App ID from steam_appid.txt (defaults to Valve's test id 480). */
function resolveAppId(): number {
  const candidates = [
    join(app.getAppPath(), "steam_appid.txt"),
    join(process.resourcesPath ?? "", "steam_appid.txt"),
    join(dirname(app.getPath("exe")), "steam_appid.txt"),
  ];
  for (const file of candidates) {
    try {
      if (existsSync(file)) {
        const raw = readFileSync(file, "utf-8").trim();
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch {
      /* try next */
    }
  }
  return 480;
}

/** Full path of the Steam Cloud save file (`%APPDATA%\\A Dark Cave\\adc-steam-save.dat` on Windows). */
function saveFilePath(): string {
  return join(app.getPath("userData"), STEAM_CLOUD_SAVE_FILE);
}

function resolveClientDir(): string {
  // Packaged: dist/public is included alongside the compiled main in the app dir.
  return join(app.getAppPath(), "dist", "public");
}

/** Windows taskbar / window icon (dev: repo `build-resources/`; packaged: `resources/icon.ico`). */
function resolveWindowIcon(): string | undefined {
  const candidates = [
    join(process.resourcesPath ?? "", "icon.ico"),
    join(app.getAppPath(), "build-resources", "icon.ico"),
  ];
  for (const file of candidates) {
    if (existsSync(file)) return file;
  }
  return undefined;
}

async function createWindow(): Promise<void> {
  const iconPath = resolveWindowIcon();
  mainWindow = new BrowserWindow({
    title: APP_WINDOW_TITLE,
    ...(iconPath ? { icon: iconPath } : {}),
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#000000",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload uses ipcRenderer; keep isolation on for safety
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Open external links (e.g. Reddit/Instagram) in the Steam overlay browser / OS browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  if (DEV_SERVER_URL) {
    await mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    loopback = await startLoopbackServer(resolveClientDir());
    await mainWindow.loadURL(loopback.url + "/");
  }

  const notifyLayoutChange = (): void => {
    mainWindow?.webContents.send("window:layout-changed");
  };

  const notifyFullscreenChange = (isFullscreen: boolean): void => {
    fullscreenIntent = isFullscreen;
    mainWindow?.webContents.send("window:fullscreen-changed", isFullscreen);
    notifyLayoutChange();
  };

  // Only enter/leave-full-screen own the icon state. maximize/unmaximize also
  // fire on Windows during fullscreen transitions and must not broadcast a
  // stale isFullScreen() false that snaps the UI icon back.
  mainWindow.on("enter-full-screen", () => notifyFullscreenChange(true));
  mainWindow.on("leave-full-screen", () => notifyFullscreenChange(false));
  mainWindow.on("maximize", notifyLayoutChange);
  mainWindow.on("unmaximize", notifyLayoutChange);

  mainWindow.on("closed", () => {
    mainWindow = null;
    fullscreenIntent = null;
  });
}

function registerIpc(): void {
  ipcMain.handle("steam:is-running", () => isSteamReady());
  ipcMain.handle("steam:player-name", () => getPlayerName());
  ipcMain.handle("steam:unlock-achievement", (_event, apiName: string) =>
    activateAchievement(String(apiName)),
  );

  ipcMain.handle("save:read", async (): Promise<string | null> => {
    try {
      return await readFile(saveFilePath(), "utf-8");
    } catch {
      return null;
    }
  });

  ipcMain.handle("save:write", async (_event, payload: string): Promise<boolean> => {
    try {
      const file = saveFilePath();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, String(payload), "utf-8");
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[STEAM] save:write failed:", error);
      return false;
    }
  });

  ipcMain.handle("app:quit", () => {
    app.quit();
  });

  ipcMain.handle("window:is-fullscreen", () => {
    if (fullscreenIntent !== null) return fullscreenIntent;
    return mainWindow?.isFullScreen() ?? false;
  });

  ipcMain.handle("window:toggle-fullscreen", () => {
    if (!mainWindow) return false;
    const currently =
      fullscreenIntent !== null ? fullscreenIntent : mainWindow.isFullScreen();
    const next = !currently;
    // setFullScreen is async; isFullScreen() often still reflects the old
    // state if read immediately, so keep and broadcast the intended value.
    fullscreenIntent = next;
    mainWindow.setFullScreen(next);
    // Windows may leave the window maximized after leaving fullscreen.
    if (!next && mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.webContents.send("window:fullscreen-changed", next);
    mainWindow.webContents.send("window:layout-changed");
    return next;
  });
}

// Single instance: launching again focuses the existing window (Steam may relaunch).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Steam overlay + API must run before `app.whenReady()` / BrowserWindow creation.
  // `enableSteamOverlay` appends Chromium switches that are ignored once ready.
  enableSteamOverlay();
  initSteam(resolveAppId());

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerIpc();
    await createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });

  app.on("window-all-closed", () => {
    void loopback?.close();
    if (process.platform !== "darwin") app.quit();
  });
}
