import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

/** Chrome on iOS (CriOS) — not Mobile Safari (which renders the layout correctly). */
export function isIOSChrome(): boolean {
  return typeof navigator !== "undefined" && /CriOS/i.test(navigator.userAgent);
}

/**
 * iOS Chrome reports a layout viewport taller than the visible area for
 * `fixed inset-0` shells, so flex children (especially `flex-1` tab panels)
 * spill into off-screen space. Safari on iOS does not exhibit this.
 *
 * Pin the game shell to `visualViewport` height/offset when running in CriOS.
 */
export function useIOSChromeViewportShell(): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isIOSChrome()) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const sync = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const heightPx = `${viewport.height}px`;
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        heightPx,
      );
      setStyle({
        top: viewport.offsetTop,
        left: 0,
        right: 0,
        width: "100%",
        height: viewport.height,
        bottom: "auto",
      });
    };

    document.documentElement.classList.add("ios-chrome-viewport-pinned");

    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      document.documentElement.classList.remove("ios-chrome-viewport-pinned");
      document.documentElement.style.removeProperty("--visual-viewport-height");
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return style;
}
