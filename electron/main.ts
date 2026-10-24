import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  LOOPBACK_PORT_FILE,
  parseStoredLoopbackPort,
  startLoopbackServer,
  type LoopbackServer,
} from "./loopbackServer";
import {
  enableSteamOverlay,
  initSteam,
  getPlayerName,
  activateAchievement,
  activateOverlayToStore,
  activateOverlayToReview,
  isSteamReady,
} from "./steam";
import {
  APP_USER_DATA_NAME,
  APP_WINDOW_TITLE,
  isSteamDemoBuild,
  isSteamPlaytestBuild,
  resolveLegacyDemoSavePath,
  resolveSteamCloudSavePath,
  resolveSteamDemoCloudSavePath,
} from "./paths";
import { textScaleZoomFactor } from "../shared/textScaleZoom";
import {
  WINDOW_STATE_FILE,
  parseWindowFullscreenPreference,
  serializeWindowFullscreenPreference,
} from "./windowState";

/**
 * Electron main process for the A Dark Cave Steam build.
 *
 * Responsibilities:
 *  - Initialize Steamworks (achievements, overlay, overlay-to-store).
 *  - Serve the built SPA over a loopback HTTP server (absolute-path routing).
 *  - Persist saves to edition-specific Steam Cloud files (demo cannot overwrite
 *    the full-game file; Auto-Cloud configured in the Steamworks partner backend).
 */

// Must run before `app.whenReady()` so Electron userData (IndexedDB) is per-variant.
app.setName(APP_USER_DATA_NAME);
// Desktop launch may play title ambience before the first click.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

const DEV_SERVER_URL = process.env.ADC_DEV_SERVER_URL; // set by electron:dev to use Vite dev server

/** Locked 1920x1080 frameless window for OBS (high-DPI / non-16:9 displays). */
const TRAILER_WIDTH = 1920;
const TRAILER_HEIGHT = 1080;

function isTrailerCaptureMode(): boolean {
  return (
    process.env.ADC_TRAILER === "1" || process.argv.includes("--trailer")
  );
}

let mainWindow: BrowserWindow | null = null;
let loopback: LoopbackServer | null = null;
/** After the renderer acks an exit save (or the timeout fires), window close may proceed. */
let readyToQuit = false;
let quitSaveInFlight = false;
const QUIT_SAVE_TIMEOUT_MS = 8000;
/**
 * Intended fullscreen state while Electron/Windows catches up.
 * On Windows (esp. with Steam overlay), `maximize` fires during fullscreen
 * transitions and `isFullScreen()` can lag — never trust a raw read mid-toggle.
 */
let fullscreenIntent: boolean | null = null;

function windowStatePath(): string {
  return join(app.getPath("userData"), WINDOW_STATE_FILE);
}

/** First launch (no file) is fullscreen. A bad file stays on that default. */
function readFullscreenPreference(): boolean {
  try {
    if (!existsSync(windowStatePath())) return true;
    return parseWindowFullscreenPreference(readFileSync(windowStatePath(), "utf-8"));
  } catch {
    return true;
  }
}

/** Serializes fullscreen writes so a newer choice cannot be overwritten by an older one. */
let fullscreenWriteChain: Promise<void> = Promise.resolve();
/** Close/quit must not start another write. The in-flight one is flushed before exit. */
let acceptFullscreenWrites = true;

function writeFullscreenPreference(fullscreen: boolean): void {
  if (!acceptFullscreenWrites || isTrailerCaptureMode()) return;
  const payload = serializeWindowFullscreenPreference(fullscreen);
  fullscreenWriteChain = fullscreenWriteChain.then(async () => {
    try {
      const file = windowStatePath();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, payload, "utf-8");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[STEAM] window state write failed:", error);
    }
  });
}

/** Wait until every queued fullscreen write has finished, including ones queued mid-flush. */
function flushFullscreenPreference(): Promise<void> {
  const wait = async (): Promise<void> => {
    const pending = fullscreenWriteChain;
    await pending;
    if (fullscreenWriteChain !== pending) await wait();
  };
  return wait();
}

function setFullscreenIntent(next: boolean): void {
  fullscreenIntent = next;
  writeFullscreenPreference(next);
}

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

/** This edition's Steam Cloud save file. */
function saveFilePath(): string {
  return resolveSteamCloudSavePath(app.getPath("appData"), app.getPath("userData"));
}

/** Demo Cloud file in the shared Auto-Cloud folder (full game reads this for import). */
function sharedDemoSaveFilePath(): string {
  return resolveSteamDemoCloudSavePath(app.getPath("appData"));
}

/** Legacy demo cloud path from early demo builds. */
function legacyDemoSaveFilePath(): string {
  return resolveLegacyDemoSavePath(app.getPath("appData"));
}

async function readFirstExistingFile(paths: string[]): Promise<string | null> {
  for (const file of paths) {
    try {
      return await readFile(file, "utf-8");
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Read this edition's save only. Full game does not fall back to the demo file. */
async function readSavePayload(): Promise<string | null> {
  if (isSteamDemoBuild) {
    return readFirstExistingFile([saveFilePath(), legacyDemoSaveFilePath()]);
  }
  return readFirstExistingFile([saveFilePath()]);
}

/** Full game: peek the Demo save without touching the full-game file. */
async function readDemoSavePayload(): Promise<string | null> {
  if (isSteamPlaytestBuild) return null;
  return readFirstExistingFile([
    sharedDemoSaveFilePath(),
    legacyDemoSaveFilePath(),
  ]);
}

async function writeSavePayload(payload: string): Promise<boolean> {
  try {
    const file = saveFilePath();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, String(payload), "utf-8");

    // Demo: keep the legacy userdata file fresh for the pre-split Auto-Cloud row.
    if (isSteamDemoBuild) {
      try {
        const legacy = legacyDemoSaveFilePath();
        await mkdir(dirname(legacy), { recursive: true });
        await writeFile(legacy, String(payload), "utf-8");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn("[STEAM] legacy demo save:write failed:", error);
      }
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] save:write failed:", error);
    return false;
  }
}

/** Remove this edition's Cloud file (full game discarding a leftover Demo blob). */
async function clearSavePayload(): Promise<boolean> {
  try {
    await unlink(saveFilePath());
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string }).code
        : undefined;
    if (code === "ENOENT") return true;
    // eslint-disable-next-line no-console
    console.warn("[STEAM] save:clear failed:", error);
    return false;
  }
}

function resolveClientDir(): string {
  // Packaged: dist/public is included alongside the compiled main in the app dir.
  return join(app.getAppPath(), "dist", "public");
}

/** Last loopback port. Reusing it keeps the page origin, so the saved language sticks. */
async function readStoredLoopbackPort(): Promise<number | null> {
  try {
    const raw = await readFile(
      join(app.getPath("userData"), LOOPBACK_PORT_FILE),
      "utf-8",
    );
    return parseStoredLoopbackPort(raw);
  } catch {
    return null;
  }
}

async function rememberLoopbackPort(port: number): Promise<void> {
  try {
    const file = join(app.getPath("userData"), LOOPBACK_PORT_FILE);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${port}\n`, "utf-8");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[STEAM] loopback port remember failed:", error);
  }
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

/**
 * Windows shows Electron's default File/Edit/View bar when Alt is pressed
 * (`autoHideMenuBar` only hides it until then). Players Alt+Tab constantly,
 * so the bar has to be gone before the window is created. macOS keeps its
 * app menu; this strip is Windows/Linux only.
 */
function hideAltMenuBar(): void {
  if (process.platform === "darwin") return;
  Menu.setApplicationMenu(null);
}

async function createWindow(): Promise<void> {
  const iconPath = resolveWindowIcon();
  const trailer = isTrailerCaptureMode();
  if (trailer) {
    // eslint-disable-next-line no-console
    console.log("[TRAILER] 1920x1080 frameless capture window (1x scale)");
  }
  hideAltMenuBar();
  mainWindow = new BrowserWindow({
    title: APP_WINDOW_TITLE,
    ...(iconPath ? { icon: iconPath } : {}),
    ...(trailer
      ? {
        width: TRAILER_WIDTH,
        height: TRAILER_HEIGHT,
        minWidth: TRAILER_WIDTH,
        minHeight: TRAILER_HEIGHT,
        frame: false,
        resizable: false,
        fullscreenable: false,
        useContentSize: true,
        center: true,
      }
      : {
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        // Restored size after leaving maximize / exclusive fullscreen.
        // Never create with fullscreen:true + show:false on Windows.
      }),
    backgroundColor: "#000000",
    show: false,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // preload uses ipcRenderer; keep isolation on for safety
    },
  });

  if (process.platform !== "darwin") {
    mainWindow.removeMenu();
    mainWindow.setMenuBarVisibility(false);
  }

  // Show on ready-to-show and again on did-finish-load. Either event can be
  // missing on Windows, so this stays idempotent. A timer covers neither firing.
  // Restore the mode from the last close. First launch is fullscreen.
  // Show first, then enter fullscreen: creating the window already fullscreen
  // can leave Steam with a black window on Windows.
  const startFullscreen = !trailer && readFullscreenPreference();
  if (!trailer) fullscreenIntent = startFullscreen;
  let revealFallback: ReturnType<typeof setTimeout> | undefined;
  const clearRevealFallback = (): void => {
    if (revealFallback === undefined) return;
    clearTimeout(revealFallback);
    revealFallback = undefined;
  };
  const revealMainWindow = (): void => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearRevealFallback();
      return;
    }
    if (mainWindow.isVisible()) {
      // show() is not called, so the show event will not fire again.
      clearRevealFallback();
    } else {
      // show() is async. Do not trust isVisible() in this same turn;
      // the show listener below drops the timer once the window is up.
      mainWindow.show();
    }
    if (startFullscreen && !mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(true);
    }
  };
  mainWindow.once("show", clearRevealFallback);
  mainWindow.once("ready-to-show", revealMainWindow);
  mainWindow.webContents.once("did-finish-load", revealMainWindow);
  revealFallback = setTimeout(revealMainWindow, 2000);
  mainWindow.once("closed", clearRevealFallback);

  // Open external links (e.g. Reddit/Instagram) in the Steam overlay browser / OS browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Preload stores the factor before this event. Chromium clears webFrame
  // zoom when navigation finishes, so put the same factor back here.
  mainWindow.webContents.on("did-finish-load", () => {
    if (steamTextZoomFactor == null || !mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.setZoomFactor(steamTextZoomFactor);
  });

  if (DEV_SERVER_URL) {
    await mainWindow.loadURL(DEV_SERVER_URL);
  } else {
    const storedPort = await readStoredLoopbackPort();
    loopback = await startLoopbackServer(resolveClientDir(), storedPort);
    if (storedPort !== null && loopback.port !== storedPort) {
      // eslint-disable-next-line no-console
      console.warn(
        `[STEAM] loopback port ${storedPort} was busy; using ${loopback.port}. Language and text size saved on the previous port will not carry over.`,
      );
    }
    await rememberLoopbackPort(loopback.port);
    await mainWindow.loadURL(loopback.url + "/");
  }

  const notifyLayoutChange = (): void => {
    mainWindow?.webContents.send("window:layout-changed");
  };

  const notifyFullscreenChange = (isFullscreen: boolean): void => {
    setFullscreenIntent(isFullscreen);
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

  mainWindow.on("close", (event) => {
    if (readyToQuit) return;
    event.preventDefault();
    beginQuitSave();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    fullscreenIntent = null;
  });
}

function beginQuitSave(): void {
  if (readyToQuit || quitSaveInFlight) return;
  quitSaveInFlight = true;
  // The button already queued the mode. Do not write again here, and do not
  // let a fullscreen event during teardown replace that mode.
  acceptFullscreenWrites = false;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let quitFinishStarted = false;
  const onRendererSaved = (): void => {
    finishQuit();
  };

  const finishQuit = (): void => {
    if (readyToQuit || quitFinishStarted) return;
    quitFinishStarted = true;
    if (timeout !== undefined) clearTimeout(timeout);
    ipcMain.removeListener("app:save-complete", onRendererSaved);
    // The renderer save can finish while the mode file is still writing.
    // Wait for that write without blocking this turn, then quit.
    void flushFullscreenPreference().finally(() => {
      if (readyToQuit) return;
      readyToQuit = true;
      quitSaveInFlight = false;
      app.quit();
    });
  };

  timeout = setTimeout(finishQuit, QUIT_SAVE_TIMEOUT_MS);
  ipcMain.once("app:save-complete", onRendererSaved);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app:will-quit");
    return;
  }
  finishQuit();
}

/** Last Chromium zoom requested by preload or the page. Re-applied after load. */
let steamTextZoomFactor: number | null = null;

/** Store only. Safe from preload sendSync — must not touch WebContents. */
function rememberSteamTextZoom(scale: unknown): void {
  if (typeof scale !== "string") return;
  const factor = textScaleZoomFactor(scale);
  if (factor != null) steamTextZoomFactor = factor;
}

/** Small / Medium / Large → Chromium zoom 100% / 110% / 125%. Async IPC only. */
function applySteamTextZoom(
  contents: Electron.WebContents,
  scale: unknown,
  notifyLayout: boolean,
): void {
  if (typeof scale !== "string" || contents.isDestroyed()) return;
  const factor = textScaleZoomFactor(scale);
  if (factor == null) return;
  steamTextZoomFactor = factor;
  contents.setZoomFactor(factor);
  if (notifyLayout) contents.send("window:layout-changed");
}

function registerIpc(): void {
  ipcMain.handle("steam:is-running", () => isSteamReady());
  ipcMain.handle("steam:player-name", () => getPlayerName());
  ipcMain.handle("steam:unlock-achievement", (_event, apiName: string) =>
    activateAchievement(String(apiName)),
  );
  ipcMain.handle("steam:overlay-to-store", () => activateOverlayToStore());
  ipcMain.handle("steam:overlay-to-review", (_event, appId: unknown) =>
    activateOverlayToReview(Number(appId)),
  );

  ipcMain.handle("save:read", async (): Promise<string | null> => readSavePayload());
  ipcMain.handle("save:readDemo", async (): Promise<string | null> =>
    readDemoSavePayload(),
  );
  ipcMain.handle("save:clear", async (): Promise<boolean> => clearSavePayload());
  ipcMain.handle("save:write", async (_event, payload: string): Promise<boolean> =>
    writeSavePayload(payload),
  );

  ipcMain.handle("app:quit", () => {
    app.quit();
  });

  ipcMain.handle("window:is-fullscreen", () => {
    if (fullscreenIntent !== null) return fullscreenIntent;
    return mainWindow?.isFullScreen() ?? false;
  });

  ipcMain.handle("window:toggle-fullscreen", () => {
    if (!mainWindow) return false;
    // Trailer capture must stay 16:9 windowed; fullscreen on a 3:2 panel ruins the frame.
    if (isTrailerCaptureMode()) return false;
    const currently =
      fullscreenIntent !== null ? fullscreenIntent : mainWindow.isFullScreen();
    const next = !currently;
    // setFullScreen is async; isFullScreen() often still reflects the old
    // state if read immediately, so keep and broadcast the intended value.
    setFullscreenIntent(next);
    mainWindow.setFullScreen(next);
    // Windows may leave the window maximized after leaving fullscreen.
    if (!next && mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.webContents.send("window:fullscreen-changed", next);
    mainWindow.webContents.send("window:layout-changed");
    return next;
  });

  // Store only. setZoomFactor here deadlocks the renderer blocked on sendSync.
  ipcMain.on("window:remember-text-zoom-sync", (event, scale: unknown) => {
    rememberSteamTextZoom(scale);
    event.returnValue = true;
  });

  ipcMain.handle("window:set-text-zoom", (event, scale: unknown) => {
    applySteamTextZoom(event.sender, scale, true);
  });
}

// Single instance: launching again focuses the existing window (Steam may relaunch).
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Steam overlay + API must run before `app.whenReady()` / BrowserWindow creation.
  // `enableSteamOverlay` appends Chromium switches that are ignored once ready.
  // Trailer DPI lock must also be set before ready, or Windows 200% scale
  // turns 1920x1080 into a window larger than the panel.
  if (isTrailerCaptureMode()) {
    app.commandLine.appendSwitch("high-dpi-support", "1");
    app.commandLine.appendSwitch("force-device-scale-factor", "1");
  }
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

  app.on("before-quit", (event) => {
    if (readyToQuit) return;
    event.preventDefault();
    beginQuitSave();
  });

  app.on("window-all-closed", () => {
    void loopback?.close();
    if (process.platform !== "darwin") app.quit();
  });
}
