/**
 * Native iOS shell hooks. Loaded only from the iOS build (`VITE_IOS_BUILD=1`).
 * Web and Steam never import this module.
 */
import { App } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { logger } from "@/lib/logger";
import { setNativeAppBackgrounded } from "@/lib/tabVisibility";

const PAGE_BACKGROUND = "#0b0b0e";

/**
 * Dark status bar over the page, and pause plus save when the player leaves
 * the app. The web view paints under the status bar and home indicator so
 * full-screen art (the start-screen clouds) is not letterboxed in black.
 */
export async function installIosShell(): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch (error) {
    logger.warn("[iOS] Status bar setup failed:", error);
  }
  try {
    await StatusBar.setBackgroundColor({ color: PAGE_BACKGROUND });
  } catch {
    // iOS does not use this call. Android does.
  }

  await App.addListener("appStateChange", ({ isActive }) => {
    setNativeAppBackgrounded(!isActive);
    if (isActive) return;
    void import("@/game/flushSaveOnExit").then((mod) =>
      mod.flushLiveGameForBackground(),
    );
  });
}
