import { contextBridge, ipcRenderer, webFrame } from "electron";
import {
  LEGACY_TEXT_SCALE_STORAGE_KEY,
  TEXT_SCALE_STORAGE_KEY,
  textScaleIdFromStorage,
  textScaleZoomFactor,
} from "../shared/textScaleZoom";

/**
 * Secure bridge between the sandboxed renderer (the game) and the Electron main
 * process. Exposes only a small, explicit Steam API surface. The renderer never
 * gets Node/Electron internals (contextIsolation stays on, nodeIntegration off).
 *
 * Mirrors the `SteamBridge` interface declared in `client/src/vite-env.d.ts`
 * (achievements, Cloud save, quit-save, full-screen, overlay-to-store,
 * overlay-to-review, text zoom).
 *
 * `isDemoBuild` is baked in by `scripts/build-electron.mjs` when packaging the
 * Steam demo (`ADC_STEAM_DEMO=1` → `ADC_STEAM_DEMO_BUILD`).
 */
const isDemoBuild = process.env.ADC_STEAM_DEMO_BUILD === "1";

/**
 * Apply the saved text size before the page paints. Chromium zoom scales the
 * whole window (100% / 110% / 125%). The page repeats this over IPC once it
 * boots, and skips the website's CSS text delta so the two do not stack.
 */
function applyStoredTextZoom(): void {
  let stored: string | null = null;
  let legacy: string | null = null;
  try {
    stored = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    legacy = localStorage.getItem(LEGACY_TEXT_SCALE_STORAGE_KEY);
  } catch {
    /* Storage can be blocked; the page applies the same choice after boot. */
  }
  const width = typeof window.innerWidth === "number" ? window.innerWidth : null;
  const scale = textScaleIdFromStorage(stored, legacy, width);
  try {
    ipcRenderer.sendSync("window:set-text-zoom-sync", scale);
  } catch {
    const factor = textScaleZoomFactor(scale);
    if (factor != null) webFrame.setZoomFactor(factor);
  }
}

applyStoredTextZoom();

contextBridge.exposeInMainWorld("steamBridge", {
  available: true,
  isDemoBuild,
  isSteamRunning: (): Promise<boolean> => ipcRenderer.invoke("steam:is-running"),
  getPlayerName: (): Promise<string | null> => ipcRenderer.invoke("steam:player-name"),
  unlockAchievement: (apiName: string): Promise<boolean> =>
    ipcRenderer.invoke("steam:unlock-achievement", apiName),
  activateOverlayToStore: (): Promise<boolean> =>
    ipcRenderer.invoke("steam:overlay-to-store"),
  activateOverlayToReview: (appId: number): Promise<boolean> =>
    ipcRenderer.invoke("steam:overlay-to-review", appId),
  saveRead: (): Promise<string | null> => ipcRenderer.invoke("save:read"),
  saveReadDemo: (): Promise<string | null> => ipcRenderer.invoke("save:readDemo"),
  saveClear: (): Promise<boolean> => ipcRenderer.invoke("save:clear"),
  saveWrite: (payload: string): Promise<boolean> => ipcRenderer.invoke("save:write", payload),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
  onWillQuit: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on("app:will-quit", handler);
    return () => {
      ipcRenderer.removeListener("app:will-quit", handler);
    };
  },
  notifyQuitSaveComplete: (): void => {
    ipcRenderer.send("app:save-complete");
  },
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke("window:is-fullscreen"),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke("window:toggle-fullscreen"),
  onFullscreenChanged: (callback: (isFullscreen: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullscreen: boolean) =>
      callback(isFullscreen);
    ipcRenderer.on("window:fullscreen-changed", handler);
    return () => {
      ipcRenderer.removeListener("window:fullscreen-changed", handler);
    };
  },
  onLayoutChanged: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on("window:layout-changed", handler);
    return () => {
      ipcRenderer.removeListener("window:layout-changed", handler);
    };
  },
  setTextZoom: (scale: string): Promise<void> =>
    ipcRenderer.invoke("window:set-text-zoom", scale),
});
