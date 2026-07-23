import { useCallback, useEffect, useRef, useState } from "react";
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

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Bumped on toggle / native fullscreen events so a slow initial
  // steamIsFullscreen() read cannot overwrite a newer known state.
  const syncEpochRef = useRef(0);
  const available = isSteamBuild && hasSteamBridge();

  useEffect(() => {
    if (!available) return;

    let cancelled = false;
    const fetchEpoch = syncEpochRef.current;
    void steamIsFullscreen().then((value) => {
      if (!cancelled && syncEpochRef.current === fetchEpoch) {
        setIsFullscreen(value);
      }
    });

    const unsubscribe = steamOnFullscreenChanged((value) => {
      syncEpochRef.current += 1;
      setIsFullscreen(value);
      nudgeViewportResize();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [available]);

  const toggleFullscreen = useCallback(async () => {
    if (!available) return;
    syncEpochRef.current += 1;
    // Optimistic update so the icon flips immediately; Steam's setFullScreen
    // (and the matching IPC return) can lag behind the click.
    setIsFullscreen((prev) => !prev);
    const next = await steamToggleFullscreen();
    setIsFullscreen(next);
    nudgeViewportResize();
  }, [available]);

  return { isFullscreen, toggleFullscreen, available };
}
