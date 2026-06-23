import { app, BrowserWindow, ipcMain, shell } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { startLoopbackServer, type LoopbackServer } from "./loopbackServer";
import { initSteam, getPlayerName, activateAchievement, isSteamReady } from "./steam";
import { APP_USER_DATA_NAME, STEAM_CLOUD_SAVE_FILE } from "./paths";

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

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
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
    mainWindow?.webContents.send(
      "window:fullscreen-changed",
      mainWindow.isFullScreen(),
    );
  };

  mainWindow.on("enter-full-screen", notifyLayoutChange);
  mainWindow.on("leave-full-screen", notifyLayoutChange);
  mainWindow.on("maximize", notifyLayoutChange);
  mainWindow.on("unmaximize", notifyLayoutChange);

  mainWindow.on("closed", () => {
    mainWindow = null;
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

  ipcMain.handle("window:is-fullscreen", () => mainWindow?.isFullScreen() ?? false);

  ipcMain.handle("window:toggle-fullscreen", () => {
    if (!mainWindow) return false;
    const next = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(next);
    return mainWindow.isFullScreen();
  });
}

// Single instance: launching again focuses the existing window (Steam may relaunch).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    initSteam(resolveAppId());
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
