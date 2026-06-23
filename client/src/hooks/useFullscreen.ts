import { useCallback, useEffect, useState } from "react";
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
  const available = isSteamBuild && hasSteamBridge();

  useEffect(() => {
    if (!available) return;

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
  }, [available]);

  const toggleFullscreen = useCallback(async () => {
    if (!available) return;
    const next = await steamToggleFullscreen();
    setIsFullscreen(next);
    nudgeViewportResize();
  }, [available]);

  return { isFullscreen, toggleFullscreen, available };
}
