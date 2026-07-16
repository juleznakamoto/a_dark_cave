import { useCallback, useEffect, useState } from "react";
import { useGameStore } from "@/game/state";
import { isSteamBuild } from "@/lib/edition";
import {
  hasSteamBridge,
  steamIsFullscreen,
  steamOnFullscreenChanged,
  steamToggleFullscreen,
} from "@/lib/steam";

function nudgeViewportResize(): void {
  window.dispatchEvent(new Event("resize"));
}

function isBrowserFullscreen(): boolean {
  return !!document.fullscreenElement;
}

async function toggleBrowserFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    // User gesture / permissions / unsupported — keep current state.
  }
  return isBrowserFullscreen();
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const useSteamApi = hasSteamBridge();
  const devGameMode = useGameStore((s) => s.devGameMode);
  // Real Steam shell uses Electron IPC. DEV Game Mode in a browser has no
  // bridge, so fall back to the document Fullscreen API for parity.
  const useBrowserApi =
    import.meta.env.DEV && !isSteamBuild && devGameMode !== "normal";
  const available = useSteamApi || useBrowserApi;

  useEffect(() => {
    if (!available) return;

    if (useSteamApi) {
      let cancelled = false;
      void steamIsFullscreen().then((value) => {
        if (!cancelled) setIsFullscreen(value);
      });

      const unsubscribe = steamOnFullscreenChanged((value) => {
        setIsFullscreen(value);
        nudgeViewportResize();
      });

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    }

    const sync = () => {
      setIsFullscreen(isBrowserFullscreen());
      nudgeViewportResize();
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [available, useSteamApi]);

  const toggleFullscreen = useCallback(async () => {
    if (!available) return;
    const next = useSteamApi
      ? await steamToggleFullscreen()
      : await toggleBrowserFullscreen();
    setIsFullscreen(next);
    nudgeViewportResize();
  }, [available, useSteamApi]);

  return { isFullscreen, toggleFullscreen, available };
}
