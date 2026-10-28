"use strict";

// electron/main.ts
var import_electron = require("electron");
var import_promises2 = require("node:fs/promises");
var import_node_path3 = require("node:path");
var import_node_fs = require("node:fs");

// electron/loopbackServer.ts
var import_node_http = require("node:http");
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8"
};
function contentTypeFor(filePath) {
  return MIME_TYPES[(0, import_node_path.extname)(filePath).toLowerCase()] ?? "application/octet-stream";
}
async function tryReadFile(filePath) {
  try {
    const info = await (0, import_promises.stat)(filePath);
    if (!info.isFile()) return null;
    return await (0, import_promises.readFile)(filePath);
  } catch {
    return null;
  }
}
var LOOPBACK_PORT_FILE = "loopback-port.txt";
var STEAM_LOOPBACK_PORT_BASE = 47331;
var STEAM_LOOPBACK_PORT_SPAN = 20;
var STEAM_LOOPBACK_PORTS = {
  base: STEAM_LOOPBACK_PORT_BASE,
  span: STEAM_LOOPBACK_PORT_SPAN
};
function parseStoredLoopbackPort(raw, range = STEAM_LOOPBACK_PORTS) {
  if (!raw) return null;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isInteger(parsed)) return null;
  if (parsed < range.base || parsed >= range.base + range.span) return null;
  return parsed;
}
function loopbackPortCandidates(storedPort, range = STEAM_LOOPBACK_PORTS) {
  const ports = [];
  const remembered = parseStoredLoopbackPort(
    storedPort === null ? null : String(storedPort),
    range
  );
  if (remembered !== null) ports.push(remembered);
  for (let offset = 0; offset < range.span; offset += 1) {
    const port = range.base + offset;
    if (!ports.includes(port)) ports.push(port);
  }
  return ports;
}
function isAddrInUse(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "EADDRINUSE";
}
function listenOn(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}
function createSpaServer(rootDir) {
  const indexPath = (0, import_node_path.join)(rootDir, "index.html");
  return (0, import_node_http.createServer)(async (req, res) => {
    try {
      const rawPath = decodeURIComponent((req.url ?? "/").split("?")[0].split("#")[0]);
      const safeRelative = (0, import_node_path.normalize)(rawPath).replace(/^(\.\.[/\\])+/, "");
      let candidate = (0, import_node_path.join)(rootDir, safeRelative);
      let body = rawPath === "/" ? null : await tryReadFile(candidate);
      if (!body) {
        const looksLikeAsset = (0, import_node_path.extname)(candidate) !== "";
        if (looksLikeAsset) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        candidate = indexPath;
        body = await tryReadFile(indexPath);
      }
      if (!body) {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", contentTypeFor(candidate));
      res.end(body);
    } catch {
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });
}
async function startLoopbackServer(rootDir, storedPort = null, range = STEAM_LOOPBACK_PORTS) {
  const candidates = loopbackPortCandidates(storedPort, range);
  let lastError;
  for (const port of candidates) {
    const server = createSpaServer(rootDir);
    try {
      await listenOn(server, port);
      return {
        url: `http://127.0.0.1:${port}`,
        port,
        close: () => new Promise((resolve) => {
          server.close(() => resolve());
        })
      };
    } catch (error) {
      lastError = error;
      if (!isAddrInUse(error)) throw error;
    }
  }
  const end = range.base + range.span - 1;
  const detail = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
  throw new Error(`Loopback ports ${range.base}-${end} are all in use (${detail})`);
}

// shared/steamReview.ts
var STEAM_FULL_APP_ID = 4882240;
var STEAM_DEMO_APP_ID = 4971800;
var REVIEW_APP_IDS = /* @__PURE__ */ new Set([
  STEAM_FULL_APP_ID,
  STEAM_DEMO_APP_ID
]);
function steamReviewPageUrl(appId) {
  if (!REVIEW_APP_IDS.has(appId)) return null;
  return `https://store.steampowered.com/recommended/recommendgame/${appId}`;
}

// electron/paths.ts
var import_node_path2 = require("node:path");
var isSteamDemoBuild = typeof process !== "undefined" && false;
var APP_USER_DATA_NAME = isSteamDemoBuild ? "A Dark Cave Demo" : "A Dark Cave";
var APP_WINDOW_TITLE = isSteamDemoBuild ? "A Dark Cave Demo" : "A Dark Cave";
var STEAM_CLOUD_DIR_NAME = "A Dark Cave";
var STEAM_FULL_CLOUD_SAVE_FILE = "adc-steam-save.dat";
var STEAM_DEMO_CLOUD_SAVE_FILE = "adc-steam-demo-save.dat";
var STEAM_CLOUD_SAVE_FILE = isSteamDemoBuild ? STEAM_DEMO_CLOUD_SAVE_FILE : STEAM_FULL_CLOUD_SAVE_FILE;
var LEGACY_STEAM_DEMO_DIR_NAME = "A Dark Cave Demo";
var LEGACY_STEAM_DEMO_SAVE_FILE = STEAM_DEMO_CLOUD_SAVE_FILE;
function resolveSteamCloudSavePath(appData) {
  return (0, import_node_path2.join)(appData, STEAM_CLOUD_DIR_NAME, STEAM_CLOUD_SAVE_FILE);
}
function resolveSteamDemoCloudSavePath(appData) {
  return (0, import_node_path2.join)(appData, STEAM_CLOUD_DIR_NAME, STEAM_DEMO_CLOUD_SAVE_FILE);
}
function resolveLegacyDemoSavePath(appData) {
  return (0, import_node_path2.join)(
    appData,
    LEGACY_STEAM_DEMO_DIR_NAME,
    LEGACY_STEAM_DEMO_SAVE_FILE
  );
}

// electron/steam.ts
var FULL_GAME_STEAM_APP_ID = 4882240;
var client = null;
var initialized = false;
var overlayEnabled = false;
function loadSteamworks() {
  try {
    return require("steamworks.js");
  } catch (error) {
    console.warn("[STEAM] steamworks.js not available:", error);
    return null;
  }
}
var STEAM_OVERLAY_CHROMIUM_SWITCHES = ["in-process-gpu"];
var STEAM_OVERLAY_REPAINT_MS = 1e3 / 60;
var overlayRepaintTimers = /* @__PURE__ */ new WeakMap();
function tickSteamOverlayRepaint(window) {
  if (window.isDestroyed()) return true;
  if (!window.webContents.isPainting()) {
    window.webContents.invalidate();
  }
  return false;
}
function attachSteamOverlayRepaint(browserWindow) {
  if (overlayRepaintTimers.has(browserWindow)) return;
  let warned = false;
  const timer = setInterval(() => {
    let stop = false;
    try {
      stop = tickSteamOverlayRepaint(browserWindow);
    } catch (error) {
      try {
        stop = browserWindow.isDestroyed();
      } catch {
        stop = true;
      }
      if (!stop && !warned) {
        warned = true;
        console.warn("[STEAM] overlay repaint failed:", error);
      }
    }
    if (!stop) return;
    clearInterval(timer);
    overlayRepaintTimers.delete(browserWindow);
  }, STEAM_OVERLAY_REPAINT_MS);
  overlayRepaintTimers.set(browserWindow, timer);
}
function applySteamOverlayHooks(electron) {
  for (const switchName of STEAM_OVERLAY_CHROMIUM_SWITCHES) {
    electron.app.commandLine.appendSwitch(switchName);
  }
  electron.BrowserWindow.getAllWindows().forEach(attachSteamOverlayRepaint);
  electron.app.on("browser-window-created", (_event, browserWindow) => {
    attachSteamOverlayRepaint(browserWindow);
  });
}
function enableSteamOverlay() {
  if (overlayEnabled) return;
  overlayEnabled = true;
  try {
    const steamworks = loadSteamworks();
    if (!steamworks) return;
    const electron = require("electron");
    applySteamOverlayHooks(electron);
  } catch (error) {
    console.warn("[STEAM] Steam overlay hooks failed:", error);
  }
}
function initSteam(appId) {
  if (initialized) return client !== null;
  initialized = true;
  try {
    const steamworks = loadSteamworks();
    if (!steamworks) {
      client = null;
      return false;
    }
    client = steamworks.init(appId);
    return true;
  } catch (error) {
    console.warn("[STEAM] Steamworks init failed (continuing without Steam):", error);
    client = null;
    return false;
  }
}
function isSteamReady() {
  return client !== null;
}
function getPlayerName() {
  try {
    return client?.localplayer.getName() ?? null;
  } catch {
    return null;
  }
}
function activateOverlayToStore(appId = FULL_GAME_STEAM_APP_ID) {
  try {
    if (!client?.overlay?.activateToStore) return false;
    client.overlay.activateToStore(appId, 0);
    return true;
  } catch (error) {
    console.warn("[STEAM] activateOverlayToStore failed:", error);
    return false;
  }
}
function activateOverlayToReview(appId) {
  const url = steamReviewPageUrl(appId);
  if (!url) return false;
  try {
    if (!client?.overlay?.activateToWebPage) return false;
    client.overlay.activateToWebPage(url);
    return true;
  } catch (error) {
    console.warn("[STEAM] activateOverlayToReview failed:", error);
    return false;
  }
}
var STEAM_DEMO_ACHIEVEMENT_PREFIX = "ACH_BASIC_";
function activateAchievement(apiName) {
  if (isSteamDemoBuild && !apiName.startsWith(STEAM_DEMO_ACHIEVEMENT_PREFIX)) {
    return false;
  }
  try {
    if (!client) return false;
    if (client.achievement.isActivated(apiName)) return true;
    return client.achievement.activate(apiName);
  } catch (error) {
    console.warn("[STEAM] activateAchievement failed:", apiName, error);
    return false;
  }
}

// shared/textScaleZoom.ts
var TEXT_SCALE_ZOOM_FACTOR = {
  small: 1,
  medium: 1.1,
  large: 1.25
};
function textScaleZoomFactor(scale) {
  if (scale === "small" || scale === "medium" || scale === "large") {
    return TEXT_SCALE_ZOOM_FACTOR[scale];
  }
  return null;
}

// electron/windowState.ts
var WINDOW_STATE_FILE = "window-state.json";
function parseWindowFullscreenPreference(raw) {
  if (!raw) return true;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "fullscreen" in parsed && typeof parsed.fullscreen === "boolean") {
      return parsed.fullscreen;
    }
  } catch {
  }
  return true;
}
function serializeWindowFullscreenPreference(fullscreen) {
  return `${JSON.stringify({ fullscreen })}
`;
}

// electron/main.ts
import_electron.app.setName(APP_USER_DATA_NAME);
import_electron.app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
var DEV_SERVER_URL = process.env.ADC_DEV_SERVER_URL;
var TRAILER_WIDTH = 1920;
var TRAILER_HEIGHT = 1080;
function isTrailerCaptureMode() {
  return process.env.ADC_TRAILER === "1" || process.argv.includes("--trailer");
}
var mainWindow = null;
var loopback = null;
var readyToQuit = false;
var quitSaveInFlight = false;
var QUIT_SAVE_TIMEOUT_MS = 8e3;
var fullscreenIntent = null;
function windowStatePath() {
  return (0, import_node_path3.join)(import_electron.app.getPath("userData"), WINDOW_STATE_FILE);
}
function readFullscreenPreference() {
  try {
    if (!(0, import_node_fs.existsSync)(windowStatePath())) return true;
    return parseWindowFullscreenPreference((0, import_node_fs.readFileSync)(windowStatePath(), "utf-8"));
  } catch {
    return true;
  }
}
var fullscreenWriteChain = Promise.resolve();
var acceptFullscreenWrites = true;
function writeFullscreenPreference(fullscreen) {
  if (!acceptFullscreenWrites || isTrailerCaptureMode()) return;
  const payload = serializeWindowFullscreenPreference(fullscreen);
  fullscreenWriteChain = fullscreenWriteChain.then(async () => {
    try {
      const file = windowStatePath();
      await (0, import_promises2.mkdir)((0, import_node_path3.dirname)(file), { recursive: true });
      await (0, import_promises2.writeFile)(file, payload, "utf-8");
    } catch (error) {
      console.warn("[STEAM] window state write failed:", error);
    }
  });
}
function flushFullscreenPreference() {
  const wait = async () => {
    const pending = fullscreenWriteChain;
    await pending;
    if (fullscreenWriteChain !== pending) await wait();
  };
  return wait();
}
function setFullscreenIntent(next) {
  fullscreenIntent = next;
  writeFullscreenPreference(next);
}
function resolveAppId() {
  const candidates = [
    (0, import_node_path3.join)(import_electron.app.getAppPath(), "steam_appid.txt"),
    (0, import_node_path3.join)(process.resourcesPath ?? "", "steam_appid.txt"),
    (0, import_node_path3.join)((0, import_node_path3.dirname)(import_electron.app.getPath("exe")), "steam_appid.txt")
  ];
  for (const file of candidates) {
    try {
      if ((0, import_node_fs.existsSync)(file)) {
        const raw = (0, import_node_fs.readFileSync)(file, "utf-8").trim();
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
    } catch {
    }
  }
  return 480;
}
function saveFilePath() {
  return resolveSteamCloudSavePath(import_electron.app.getPath("appData"));
}
function sharedDemoSaveFilePath() {
  return resolveSteamDemoCloudSavePath(import_electron.app.getPath("appData"));
}
function legacyDemoSaveFilePath() {
  return resolveLegacyDemoSavePath(import_electron.app.getPath("appData"));
}
async function readFirstExistingFile(paths) {
  for (const file of paths) {
    try {
      return await (0, import_promises2.readFile)(file, "utf-8");
    } catch {
    }
  }
  return null;
}
async function readSavePayload() {
  if (isSteamDemoBuild) {
    return readFirstExistingFile([saveFilePath(), legacyDemoSaveFilePath()]);
  }
  return readFirstExistingFile([saveFilePath()]);
}
async function readDemoSavePayload() {
  return readFirstExistingFile([
    sharedDemoSaveFilePath(),
    legacyDemoSaveFilePath()
  ]);
}
async function writeSavePayload(payload) {
  try {
    const file = saveFilePath();
    await (0, import_promises2.mkdir)((0, import_node_path3.dirname)(file), { recursive: true });
    await (0, import_promises2.writeFile)(file, String(payload), "utf-8");
    if (isSteamDemoBuild) {
      try {
        const legacy = legacyDemoSaveFilePath();
        await (0, import_promises2.mkdir)((0, import_node_path3.dirname)(legacy), { recursive: true });
        await (0, import_promises2.writeFile)(legacy, String(payload), "utf-8");
      } catch (error) {
        console.warn("[STEAM] legacy demo save:write failed:", error);
      }
    }
    return true;
  } catch (error) {
    console.warn("[STEAM] save:write failed:", error);
    return false;
  }
}
async function clearSavePayload() {
  try {
    await (0, import_promises2.unlink)(saveFilePath());
    return true;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : void 0;
    if (code === "ENOENT") return true;
    console.warn("[STEAM] save:clear failed:", error);
    return false;
  }
}
function resolveClientDir() {
  return (0, import_node_path3.join)(import_electron.app.getAppPath(), "dist", "public");
}
async function readStoredLoopbackPort() {
  try {
    const raw = await (0, import_promises2.readFile)(
      (0, import_node_path3.join)(import_electron.app.getPath("userData"), LOOPBACK_PORT_FILE),
      "utf-8"
    );
    return parseStoredLoopbackPort(raw);
  } catch {
    return null;
  }
}
async function rememberLoopbackPort(port) {
  try {
    const file = (0, import_node_path3.join)(import_electron.app.getPath("userData"), LOOPBACK_PORT_FILE);
    await (0, import_promises2.mkdir)((0, import_node_path3.dirname)(file), { recursive: true });
    await (0, import_promises2.writeFile)(file, `${port}
`, "utf-8");
  } catch (error) {
    console.warn("[STEAM] loopback port remember failed:", error);
  }
}
function resolveWindowIcon() {
  const candidates = [
    (0, import_node_path3.join)(process.resourcesPath ?? "", "icon.ico"),
    (0, import_node_path3.join)(import_electron.app.getAppPath(), "build-resources", "icon.ico")
  ];
  for (const file of candidates) {
    if ((0, import_node_fs.existsSync)(file)) return file;
  }
  return void 0;
}
function hideAltMenuBar() {
  if (process.platform === "darwin") return;
  import_electron.Menu.setApplicationMenu(null);
}
async function createWindow() {
  const iconPath = resolveWindowIcon();
  const trailer = isTrailerCaptureMode();
  if (trailer) {
    console.log("[TRAILER] 1920x1080 frameless capture window (1x scale)");
  }
  hideAltMenuBar();
  mainWindow = new import_electron.BrowserWindow({
    title: APP_WINDOW_TITLE,
    ...iconPath ? { icon: iconPath } : {},
    ...trailer ? {
      width: TRAILER_WIDTH,
      height: TRAILER_HEIGHT,
      minWidth: TRAILER_WIDTH,
      minHeight: TRAILER_HEIGHT,
      frame: false,
      resizable: false,
      fullscreenable: false,
      useContentSize: true,
      center: true
    } : {
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 600
      // Restored size after leaving maximize / exclusive fullscreen.
      // Never create with fullscreen:true + show:false on Windows.
    },
    backgroundColor: "#000000",
    show: false,
    webPreferences: {
      preload: (0, import_node_path3.join)(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // preload uses ipcRenderer; keep isolation on for safety
    }
  });
  if (process.platform !== "darwin") {
    mainWindow.removeMenu();
    mainWindow.setMenuBarVisibility(false);
  }
  const startFullscreen = !trailer && readFullscreenPreference();
  if (!trailer) fullscreenIntent = startFullscreen;
  let revealFallback;
  const clearRevealFallback = () => {
    if (revealFallback === void 0) return;
    clearTimeout(revealFallback);
    revealFallback = void 0;
  };
  const revealMainWindow = () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      clearRevealFallback();
      return;
    }
    if (mainWindow.isVisible()) {
      clearRevealFallback();
    } else {
      mainWindow.show();
    }
    if (startFullscreen && !mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(true);
    }
  };
  mainWindow.once("show", clearRevealFallback);
  mainWindow.once("ready-to-show", revealMainWindow);
  mainWindow.webContents.once("did-finish-load", revealMainWindow);
  revealFallback = setTimeout(revealMainWindow, 2e3);
  mainWindow.once("closed", clearRevealFallback);
  mainWindow.webContents.on("context-menu", (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void import_electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
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
      console.warn(
        `[STEAM] loopback port ${storedPort} was busy; using ${loopback.port}. Language and text size saved on the previous port will not carry over.`
      );
    }
    await rememberLoopbackPort(loopback.port);
    await mainWindow.loadURL(loopback.url + "/");
  }
  const notifyLayoutChange = () => {
    mainWindow?.webContents.send("window:layout-changed");
  };
  const notifyFullscreenChange = (isFullscreen) => {
    setFullscreenIntent(isFullscreen);
    mainWindow?.webContents.send("window:fullscreen-changed", isFullscreen);
    notifyLayoutChange();
  };
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
function beginQuitSave() {
  if (readyToQuit || quitSaveInFlight) return;
  quitSaveInFlight = true;
  if (fullscreenIntent !== null) writeFullscreenPreference(fullscreenIntent);
  acceptFullscreenWrites = false;
  let timeout;
  let quitFinishStarted = false;
  const onRendererSaved = () => {
    finishQuit();
  };
  const finishQuit = () => {
    if (readyToQuit || quitFinishStarted) return;
    quitFinishStarted = true;
    if (timeout !== void 0) clearTimeout(timeout);
    import_electron.ipcMain.removeListener("app:save-complete", onRendererSaved);
    void flushFullscreenPreference().finally(() => {
      if (readyToQuit) return;
      readyToQuit = true;
      quitSaveInFlight = false;
      import_electron.app.quit();
    });
  };
  timeout = setTimeout(finishQuit, QUIT_SAVE_TIMEOUT_MS);
  import_electron.ipcMain.once("app:save-complete", onRendererSaved);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("app:will-quit");
    return;
  }
  finishQuit();
}
var steamTextZoomFactor = null;
function rememberSteamTextZoom(scale) {
  if (typeof scale !== "string") return;
  const factor = textScaleZoomFactor(scale);
  if (factor != null) steamTextZoomFactor = factor;
}
function applySteamTextZoom(contents, scale, notifyLayout) {
  if (typeof scale !== "string" || contents.isDestroyed()) return;
  const factor = textScaleZoomFactor(scale);
  if (factor == null) return;
  steamTextZoomFactor = factor;
  contents.setZoomFactor(factor);
  if (notifyLayout) contents.send("window:layout-changed");
}
function registerIpc() {
  import_electron.ipcMain.handle("steam:is-running", () => isSteamReady());
  import_electron.ipcMain.handle("steam:player-name", () => getPlayerName());
  import_electron.ipcMain.handle(
    "steam:unlock-achievement",
    (_event, apiName) => activateAchievement(String(apiName))
  );
  import_electron.ipcMain.handle("steam:overlay-to-store", () => activateOverlayToStore());
  import_electron.ipcMain.handle(
    "steam:overlay-to-review",
    (_event, appId) => activateOverlayToReview(Number(appId))
  );
  import_electron.ipcMain.handle("save:read", async () => readSavePayload());
  import_electron.ipcMain.handle(
    "save:readDemo",
    async () => readDemoSavePayload()
  );
  import_electron.ipcMain.handle("save:clear", async () => clearSavePayload());
  import_electron.ipcMain.handle(
    "save:write",
    async (_event, payload) => writeSavePayload(payload)
  );
  import_electron.ipcMain.handle("app:quit", () => {
    import_electron.app.quit();
  });
  import_electron.ipcMain.handle("window:is-fullscreen", () => {
    if (fullscreenIntent !== null) return fullscreenIntent;
    return mainWindow?.isFullScreen() ?? false;
  });
  import_electron.ipcMain.handle("window:toggle-fullscreen", () => {
    if (!mainWindow) return false;
    if (isTrailerCaptureMode()) return false;
    const currently = fullscreenIntent !== null ? fullscreenIntent : mainWindow.isFullScreen();
    const next = !currently;
    setFullscreenIntent(next);
    mainWindow.setFullScreen(next);
    if (!next && mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    }
    mainWindow.webContents.send("window:fullscreen-changed", next);
    mainWindow.webContents.send("window:layout-changed");
    return next;
  });
  import_electron.ipcMain.on("window:remember-text-zoom-sync", (event, scale) => {
    rememberSteamTextZoom(scale);
    event.returnValue = true;
  });
  import_electron.ipcMain.handle("window:set-text-zoom", (event, scale) => {
    applySteamTextZoom(event.sender, scale, true);
  });
}
if (!import_electron.app.requestSingleInstanceLock()) {
  import_electron.app.quit();
} else {
  if (isTrailerCaptureMode()) {
    import_electron.app.commandLine.appendSwitch("high-dpi-support", "1");
    import_electron.app.commandLine.appendSwitch("force-device-scale-factor", "1");
  }
  enableSteamOverlay();
  initSteam(resolveAppId());
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(async () => {
    registerIpc();
    await createWindow();
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) void createWindow();
    });
  });
  import_electron.app.on("before-quit", (event) => {
    if (readyToQuit) return;
    event.preventDefault();
    beginQuitSave();
  });
  import_electron.app.on("window-all-closed", () => {
    void loopback?.close();
    if (process.platform !== "darwin") import_electron.app.quit();
  });
}
