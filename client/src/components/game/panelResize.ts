import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import { useGameStore } from "@/game/state";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GameState } from "@shared/schema";

type PanelSizeKey = keyof GameState["panelSizes"];
type PanelId = "sidePanel" | "log";

/**
 * Layout sizing limits and responsive defaults for the three-panel game shell.
 * Desktop resizes column widths; mobile resizes stacked row heights. The flexible
 * panel (the center "game" column on desktop, the bottom game area on mobile) is
 * never resized directly — it absorbs the remaining space — so we only persist the
 * two outer panels and clamp against the flexible panel's minimum.
 */
export const PANEL_RESIZE = {
  desktop: {
    middleMinPx: 320,
    sidePanel: { minPx: 240, maxPx: 600 },
    logPanel: { minPx: 200, maxPx: 560 },
    defaultSidePanelTemplate: "minmax(20rem, 28rem)",
    defaultLogPanelTemplate: "minmax(14rem, 26rem)",
    middleTemplate: "minmax(20rem, 1fr)",
  },
  mobile: {
    gameMinPx: 160,
    sidePanel: { minPx: 140 },
    logPanel: { minPx: 80 },
  },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface UsePanelResizeResult {
  isMobile: boolean;
  isResizing: boolean;
  mainRef: RefObject<HTMLElement>;
  sidePanelRef: RefObject<HTMLDivElement>;
  logRef: RefObject<HTMLDivElement>;
  /** Inline grid-template-columns on desktop; empty on mobile (flex layout). */
  mainStyle: CSSProperties;
  /** Inline height on mobile when a custom size is set; empty otherwise. */
  sidePanelStyle: CSSProperties;
  logStyle: CSSProperties;
  startSidePanelResize: (e: ReactPointerEvent) => void;
  startLogResize: (e: ReactPointerEvent) => void;
  resetSidePanel: () => void;
  resetLog: () => void;
}

function panelKey(panel: PanelId, mobile: boolean): PanelSizeKey {
  if (panel === "sidePanel") {
    return mobile ? "mobileSidePanelPx" : "desktopSidePanelPx";
  }
  return mobile ? "mobileLogPanelPx" : "desktopLogPanelPx";
}

/**
 * Wires up drag-to-resize for the side panel and event-log panels, persisting the
 * chosen size to the save (separately for desktop / mobile). Returns refs, inline
 * styles, and pointer-down handlers consumed by `GameContainer` and the handles.
 */
export function usePanelResize(): UsePanelResizeResult {
  const isMobile = useIsMobile();
  const panelSizes = useGameStore((s) => s.panelSizes);
  const setPanelSize = useGameStore((s) => s.setPanelSize);

  const mainRef = useRef<HTMLElement>(null);
  const sidePanelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  // rAF-throttle store writes so a drag does not flood the store with updates.
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ key: PanelSizeKey; size: number } | null>(null);

  const startResize = useCallback(
    (panel: PanelId, e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      const mobile = isMobile;
      const el = panel === "sidePanel" ? sidePanelRef.current : logRef.current;
      const otherEl =
        panel === "sidePanel" ? logRef.current : sidePanelRef.current;
      const main = mainRef.current;
      if (!el || !main) return;
      e.preventDefault();

      const key = panelKey(panel, mobile);
      const startRect = el.getBoundingClientRect();
      const startCoord = mobile ? e.clientY : e.clientX;
      const startSize = mobile ? startRect.height : startRect.width;

      setIsResizing(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = mobile ? "row-resize" : "col-resize";

      const flush = () => {
        rafRef.current = null;
        if (pendingRef.current) {
          setPanelSize(pendingRef.current.key, pendingRef.current.size);
        }
      };
      const apply = (size: number) => {
        pendingRef.current = { key, size: Math.round(size) };
        if (rafRef.current == null) {
          rafRef.current = requestAnimationFrame(flush);
        }
      };

      const onMove = (ev: PointerEvent) => {
        const coord = mobile ? ev.clientY : ev.clientX;
        const delta = coord - startCoord;
        // The log panel sits on the far side of the center column on desktop, so its
        // left-edge handle grows the panel when dragged toward the start (negative delta).
        let next =
          !mobile && panel === "log" ? startSize - delta : startSize + delta;

        const mainRect = main.getBoundingClientRect();
        const otherRect = otherEl?.getBoundingClientRect();
        if (mobile) {
          const otherH = otherRect?.height ?? 0;
          const minPx =
            panel === "sidePanel"
              ? PANEL_RESIZE.mobile.sidePanel.minPx
              : PANEL_RESIZE.mobile.logPanel.minPx;
          const maxPx =
            mainRect.height - otherH - PANEL_RESIZE.mobile.gameMinPx;
          next = clamp(next, minPx, Math.max(minPx, maxPx));
        } else {
          const otherW = otherRect?.width ?? 0;
          const cfg =
            panel === "sidePanel"
              ? PANEL_RESIZE.desktop.sidePanel
              : PANEL_RESIZE.desktop.logPanel;
          const avail =
            mainRect.width - otherW - PANEL_RESIZE.desktop.middleMinPx;
          next = clamp(next, cfg.minPx, Math.max(cfg.minPx, Math.min(cfg.maxPx, avail)));
        }
        apply(next);
      };

      const onUp = () => {
        setIsResizing(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (pendingRef.current) {
          setPanelSize(pendingRef.current.key, pendingRef.current.size);
          pendingRef.current = null;
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [isMobile, setPanelSize],
  );

  const startSidePanelResize = useCallback(
    (e: ReactPointerEvent) => startResize("sidePanel", e),
    [startResize],
  );
  const startLogResize = useCallback(
    (e: ReactPointerEvent) => startResize("log", e),
    [startResize],
  );
  const resetSidePanel = useCallback(
    () => setPanelSize(panelKey("sidePanel", isMobile), null),
    [isMobile, setPanelSize],
  );
  const resetLog = useCallback(
    () => setPanelSize(panelKey("log", isMobile), null),
    [isMobile, setPanelSize],
  );

  const col1 =
    panelSizes.desktopSidePanelPx != null
      ? `${panelSizes.desktopSidePanelPx}px`
      : PANEL_RESIZE.desktop.defaultSidePanelTemplate;
  const col3 =
    panelSizes.desktopLogPanelPx != null
      ? `${panelSizes.desktopLogPanelPx}px`
      : PANEL_RESIZE.desktop.defaultLogPanelTemplate;

  const mainStyle: CSSProperties = isMobile
    ? {}
    : {
        gridTemplateColumns: `${col1} ${PANEL_RESIZE.desktop.middleTemplate} ${col3}`,
      };

  const sidePanelStyle: CSSProperties =
    isMobile && panelSizes.mobileSidePanelPx != null
      ? {
          height: `${panelSizes.mobileSidePanelPx}px`,
          minHeight: 0,
          maxHeight: "none",
        }
      : {};
  const logStyle: CSSProperties =
    isMobile && panelSizes.mobileLogPanelPx != null
      ? {
          height: `${panelSizes.mobileLogPanelPx}px`,
          minHeight: 0,
          maxHeight: "none",
        }
      : {};

  return {
    isMobile,
    isResizing,
    mainRef,
    sidePanelRef,
    logRef,
    mainStyle,
    sidePanelStyle,
    logStyle,
    startSidePanelResize,
    startLogResize,
    resetSidePanel,
    resetLog,
  };
}
