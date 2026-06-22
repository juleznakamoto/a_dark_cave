/// <reference types="vite/client" />

declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  /** "1" only in the Steam desktop build (set by the `build:steam` script). */
  readonly VITE_STEAM_BUILD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Bridge injected by the Electron preload script in the Steam build. Absent on
 * the web; always access via `@/lib/steam` which guards for its presence.
 */
interface SteamBridge {
  readonly available: boolean;
  isSteamRunning(): Promise<boolean>;
  getPlayerName(): Promise<string | null>;
  unlockAchievement(apiName: string): Promise<boolean>;
  saveRead(): Promise<string | null>;
  saveWrite(payload: string): Promise<boolean>;
  quit(): Promise<void>;
}

interface Window {
  steamBridge?: SteamBridge;
}
