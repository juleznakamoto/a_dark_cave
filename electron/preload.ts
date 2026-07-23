import { contextBridge, ipcRenderer } from "electron";

/**
 * Secure bridge between the sandboxed renderer (the game) and the Electron main
 * process. Exposes only a small, explicit Steam API surface. The renderer never
 * gets Node/Electron internals (contextIsolation stays on, nodeIntegration off).
 *
 * Mirrors the `SteamBridge` interface declared in `client/src/vite-env.d.ts`.
 *
 * `isDemoBuild` is baked in by `scripts/build-electron.mjs` when packaging the
 * Steam demo (`ADC_STEAM_DEMO=1` → `ADC_STEAM_DEMO_BUILD`).
 */
const isDemoBuild = process.env.ADC_STEAM_DEMO_BUILD === "1";

contextBridge.exposeInMainWorld("steamBridge", {
  available: true,
  isDemoBuild,
  isSteamRunning: (): Promise<boolean> => ipcRenderer.invoke("steam:is-running"),
  getPlayerName: (): Promise<string | null> => ipcRenderer.invoke("steam:player-name"),
  unlockAchievement: (apiName: string): Promise<boolean> =>
    ipcRenderer.invoke("steam:unlock-achievement", apiName),
  saveRead: (): Promise<string | null> => ipcRenderer.invoke("save:read"),
  saveWrite: (payload: string): Promise<boolean> => ipcRenderer.invoke("save:write", payload),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
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
});
