import { hasSteamBridge, steamOnFullscreenChanged, steamOnLayoutChanged } from "@/lib/steam";

export type ViewportSize = {
  width: number;
  height: number;
};

/** Layout viewport size used by full-screen background canvases. */
export function getViewportSize(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** Notify listeners when the layout viewport changes (resize, full screen, etc.). */
export function subscribeViewportResize(onChange: () => void): () => void {
  const notify = () => {
    requestAnimationFrame(onChange);
  };

  window.addEventListener("resize", notify);
  document.addEventListener("fullscreenchange", notify);

  const unsubscribeSteam = hasSteamBridge()
    ? (() => {
        const unsubLayout = steamOnLayoutChanged(notify);
        const unsubFullscreen = steamOnFullscreenChanged(() => notify());
        return () => {
          unsubLayout?.();
          unsubFullscreen?.();
        };
      })()
    : undefined;

  return () => {
    window.removeEventListener("resize", notify);
    document.removeEventListener("fullscreenchange", notify);
    unsubscribeSteam?.();
  };
}
