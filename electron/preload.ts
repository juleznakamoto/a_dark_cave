import { contextBridge, ipcRenderer } from "electron";

/**
 * Secure bridge between the sandboxed renderer (the game) and the Electron main
 * process. Exposes only a small, explicit Steam API surface. The renderer never
 * gets Node/Electron internals (contextIsolation stays on, nodeIntegration off).
 *
 * Mirrors the `SteamBridge` interface declared in `client/src/vite-env.d.ts`.
 */
contextBridge.exposeInMainWorld("steamBridge", {
  available: true,
  isSteamRunning: (): Promise<boolean> => ipcRenderer.invoke("steam:is-running"),
  getPlayerName: (): Promise<string | null> => ipcRenderer.invoke("steam:player-name"),
  unlockAchievement: (apiName: string): Promise<boolean> =>
    ipcRenderer.invoke("steam:unlock-achievement", apiName),
  saveRead: (): Promise<string | null> => ipcRenderer.invoke("save:read"),
  saveWrite: (payload: string): Promise<boolean> => ipcRenderer.invoke("save:write", payload),
  quit: (): Promise<void> => ipcRenderer.invoke("app:quit"),
});
