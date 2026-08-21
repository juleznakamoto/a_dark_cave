import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "./use-mobile";

const MOBILE_BREAKPOINT = 768;

/** True when the tooltip trigger lives inside an open dialog (e.g. shop / gambler / invest info icons). */
function isTooltipTriggerInsideDialog(id: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const trigger = document.querySelector(
      `[data-tooltip-trigger-id="${CSS.escape(id)}"]`,
    );
    // Radix DialogContent + custom portals (e.g. BlessingOfferDialog) use role="dialog".
    return Boolean(
      trigger?.closest('[role="dialog"], [role="alertdialog"]'),
    );
  } catch {
    return false;
  }
}

function triggerSelector(id: string): string {
  return `[data-tooltip-trigger-id="${CSS.escape(id)}"]`;
}

/**
 * Global tooltip state manager
 * Ensures only one tooltip is open at a time across the entire application
 */
class GlobalTooltipManager {
  private openTooltipId: string | null = null;
  private suppressed = false;
  private mobile = false;
  private listeners: Set<() => void> = new Set();
  private idListeners: Map<string, Set<() => void>> = new Map();
  private suppressedListeners: Set<() => void> = new Set();
  private pressTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private pressingIds: Set<string> = new Set();
  private tooltipsOpenedByTimer: Set<string> = new Set();
  private suppressNextClickIds: Set<string> = new Set();
  private clickSuppressTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private outsideListenerAttached = false;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeId(id: string, listener: () => void) {
    let set = this.idListeners.get(id);
    if (!set) {
      set = new Set();
      this.idListeners.set(id, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.idListeners.delete(id);
    };
  }

  /** Fires only when modal suppression flips, not when another tooltip opens. */
  subscribeSuppressed(listener: () => void) {
    this.suppressedListeners.add(listener);
    return () => {
      this.suppressedListeners.delete(listener);
    };
  }

  private notifyId(id: string | null) {
    if (!id) return;
    this.idListeners.get(id)?.forEach((listener) => listener());
  }

  private notify(previousId: string | null) {
    this.listeners.forEach((listener) => listener());
    if (previousId && previousId !== this.openTooltipId) {
      this.notifyId(previousId);
    }
    this.notifyId(this.openTooltipId);
  }

  private handleOutside = (event: MouseEvent | TouchEvent) => {
    const openId = this.openTooltipId;
    if (!openId) return;
    const target = event.target as Element | null;
    if (!target) return;
    if (target.closest?.('[role="tooltip"]')) return;
    if (target.closest?.(triggerSelector(openId))) return;
    this.setOpenTooltip(null);
  };

  private attachOutsideListener() {
    if (this.outsideListenerAttached || typeof document === "undefined") return;
    this.outsideListenerAttached = true;
    document.addEventListener("click", this.handleOutside, true);
    document.addEventListener("touchstart", this.handleOutside, true);
  }

  private detachOutsideListener() {
    if (!this.outsideListenerAttached || typeof document === "undefined") return;
    this.outsideListenerAttached = false;
    document.removeEventListener("click", this.handleOutside, true);
    document.removeEventListener("touchstart", this.handleOutside, true);
  }

  setOpenTooltip(id: string | null, openedByTimer: boolean = false) {
    // Modal suppression blocks game-chrome tooltips, but not triggers inside
    // the open dialog (shop / settings info icons still need to work).
    if (
      this.suppressed &&
      id !== null &&
      !isTooltipTriggerInsideDialog(id)
    ) {
      return;
    }

    if (id === this.openTooltipId) {
      if (openedByTimer && id) {
        this.tooltipsOpenedByTimer.add(id);
      }
      return;
    }

    const previousId = this.openTooltipId;

    // Clear any existing press timers when opening a new tooltip
    this.clearAllPressTimers();
    this.tooltipsOpenedByTimer.clear();

    this.openTooltipId = id;
    if (openedByTimer && id) {
      this.tooltipsOpenedByTimer.add(id);
    }
    if (id) {
      this.attachOutsideListener();
    } else {
      this.detachOutsideListener();
    }
    this.notify(previousId);
  }

  setSuppressed(suppressed: boolean) {
    if (this.suppressed === suppressed) return;
    this.suppressed = suppressed;
    const previousId = this.openTooltipId;
    if (suppressed) {
      this.clearAllPressTimers();
      this.openTooltipId = null;
      this.tooltipsOpenedByTimer.clear();
      this.detachOutsideListener();
    }
    this.notify(previousId);
    this.suppressedListeners.forEach((listener) => listener());
  }

  setMobile(isMobile: boolean) {
    this.mobile = isMobile;
  }

  isMobile() {
    return this.mobile;
  }

  isSuppressed() {
    return this.suppressed;
  }

  getOpenTooltip() {
    return this.openTooltipId;
  }

  isTooltipOpen(id: string) {
    if (this.openTooltipId !== id) return false;
    if (this.suppressed && !isTooltipTriggerInsideDialog(id)) return false;
    return true;
  }

  clearAllPressTimers() {
    this.pressTimers.forEach((timer) => clearTimeout(timer));
    this.pressTimers.clear();
    this.pressingIds.clear();
  }

  wasOpenedByTimer(id: string) {
    return this.tooltipsOpenedByTimer.has(id);
  }

  clearOpenedByTimer(id: string) {
    this.tooltipsOpenedByTimer.delete(id);
  }

  /**
   * Swallow the browser's synthesized click after a long-press (touchend/mouseup
   * preventDefault on the wrapper does not stop the child button's click).
   */
  suppressNextClick(id: string) {
    this.suppressNextClickIds.add(id);
    const existing = this.clickSuppressTimers.get(id);
    if (existing) clearTimeout(existing);
    this.clickSuppressTimers.set(
      id,
      setTimeout(() => {
        this.suppressNextClickIds.delete(id);
        this.clickSuppressTimers.delete(id);
      }, 400),
    );
  }

  consumeClickSuppression(id: string): boolean {
    const existing = this.clickSuppressTimers.get(id);
    if (existing) {
      clearTimeout(existing);
      this.clickSuppressTimers.delete(id);
    }
    if (!this.suppressNextClickIds.has(id)) return false;
    this.suppressNextClickIds.delete(id);
    return true;
  }

  clearAllClickSuppression() {
    this.clickSuppressTimers.forEach((timer) => clearTimeout(timer));
    this.clickSuppressTimers.clear();
    this.suppressNextClickIds.clear();
  }

  setPressTimer(id: string, timer: ReturnType<typeof setTimeout>) {
    // Clear any existing timer for this id
    const existingTimer = this.pressTimers.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    this.pressTimers.set(id, timer);
    this.pressingIds.add(id);
  }

  clearPressTimer(id: string) {
    const timer = this.pressTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.pressTimers.delete(id);
    }
    this.pressingIds.delete(id);
  }

  isPressing(id: string) {
    return this.pressingIds.has(id);
  }
}

const globalTooltipManager = new GlobalTooltipManager();

if (typeof window !== "undefined") {
  globalTooltipManager.setMobile(window.innerWidth < MOBILE_BREAKPOINT);
}

/** Close any open tooltip and cancel in-progress long-press timers. */
export function closeAllGlobalTooltips() {
  globalTooltipManager.clearAllPressTimers();
  globalTooltipManager.clearAllClickSuppression();
  globalTooltipManager.setOpenTooltip(null);
}

/**
 * While true, tooltips from behind a blocking modal stay forced closed (z-10000
 * would otherwise paint through the dimmed backdrop). Triggers inside the open
 * dialog itself are still allowed (shop info icons, etc.).
 */
export function setGlobalTooltipsSuppressed(suppressed: boolean) {
  globalTooltipManager.setSuppressed(suppressed);
}

/** Keep the manager's mobile flag in sync without one useIsMobile per wrapper. */
export function setGlobalTooltipIsMobile(isMobile: boolean) {
  globalTooltipManager.setMobile(isMobile);
}

const GameTooltipTreeContext = createContext(false);

/** True when a `GameTooltipProvider` ancestor already mounted Radix's provider. */
export function useInsideGameTooltipProvider(): boolean {
  return useContext(GameTooltipTreeContext);
}

/**
 * One Radix provider for the game tree, plus a single mobile-breakpoint sync.
 * Do not wrap the start screen (DeferredAppChrome must not remount `/`).
 */
export function GameTooltipProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  useEffect(() => {
    setGlobalTooltipIsMobile(isMobile);
  }, [isMobile]);
  return createElement(
    GameTooltipTreeContext.Provider,
    { value: true },
    createElement(TooltipProvider, null, children),
  );
}

/** Subscribe to whichever tooltip is open. For pulse/hover hosts, not per-button wrappers. */
export function useOpenGlobalTooltipId(): string | null {
  return useSyncExternalStore(
    (onChange) => globalTooltipManager.subscribe(onChange),
    () => globalTooltipManager.getOpenTooltip(),
    () => null,
  );
}

/**
 * Radix `open` for one tooltip:
 * - `true` while this id is the long-press / tap tooltip
 * - `false` while a blocking modal suppresses behind-the-overlay triggers
 * - `undefined` otherwise so hover stays uncontrolled
 */
export function getTooltipOpenProp(id: string): boolean | undefined {
  if (
    globalTooltipManager.isSuppressed() &&
    !isTooltipTriggerInsideDialog(id)
  ) {
    return false;
  }
  return globalTooltipManager.isTooltipOpen(id) ? true : undefined;
}

/** Subscribe to one tooltip id plus modal suppression. Other ids do not re-render on long-press. */
export function useGlobalTooltipOpen(id: string): boolean | undefined {
  return useSyncExternalStore(
    (onChange) => {
      const unsubId = globalTooltipManager.subscribeId(id, onChange);
      const unsubSuppressed = globalTooltipManager.subscribeSuppressed(onChange);
      return () => {
        unsubId();
        unsubSuppressed();
      };
    },
    () => getTooltipOpenProp(id),
    () => undefined,
  );
}

/**
 * Stable handlers for tooltip triggers. Does not subscribe to open-id changes.
 * Use `useGlobalTooltipOpen(id)` or `useOpenGlobalTooltipId()` to re-render.
 */
export function useGlobalTooltip() {
  const setOpenTooltip = useCallback((id: string | null) => {
    globalTooltipManager.setOpenTooltip(id);
  }, []);

  const isTooltipOpen = useCallback((id: string) => {
    return getTooltipOpenProp(id);
  }, []);

  const handleWrapperClick = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    if (globalTooltipManager.consumeClickSuppression(id)) {
      e.preventDefault();
      e.stopPropagation();
      return true;
    }

    if (!globalTooltipManager.isMobile() || isCoolingDown) return false;

    // On mobile with tooltip, handle inactive buttons specially
    if (disabled) {
      e.stopPropagation();
      const currentOpen = globalTooltipManager.getOpenTooltip();
      globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
    }
    return false;
  }, []);

  const handleClickCapture = useCallback((id: string, e: React.MouseEvent) => {
    if (!globalTooltipManager.consumeClickSuppression(id)) return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  }, []);

  const handleMouseDown = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.MouseEvent) => {
    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Don't prevent default to allow button interaction
    // Start timer to show tooltip after 300ms (works on all devices including tablets)
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id, true); // Mark as opened by timer
      globalTooltipManager.clearPressTimer(id);
    }, 300);

    globalTooltipManager.setPressTimer(id, timer);
  }, []);

  const handleMouseUp = useCallback((
    id: string,
    disabled: boolean,
    onClick: () => void,
    e: React.MouseEvent,
    preferNativeClick = true,
  ) => {
    const wasPressing = globalTooltipManager.isPressing(id);
    const tooltipWasOpen = globalTooltipManager.isTooltipOpen(id);
    globalTooltipManager.clearPressTimer(id);

    // If tooltip is already open
    if (tooltipWasOpen) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);

      // If tooltip was opened by long press: keep it open, prevent action. User clicks elsewhere to close.
      // Keep openedByTimer so a follow-up compatibility mouseup is treated the same way.
      if (wasOpenedByTimer) {
        e.preventDefault();
        e.stopPropagation();
        globalTooltipManager.suppressNextClick(id);
        return;
      }

      // Tooltip was already open (not from this press). Close it and block the
      // synthesized click so closing a tooltip never executes the action.
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      globalTooltipManager.suppressNextClick(id);
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // On mobile, short taps on disabled controls should open the tooltip directly.
    // Relying on a later click is unreliable because disabled buttons may not emit one.
    if (wasPressing && !tooltipWasOpen) {
      if (disabled && globalTooltipManager.isMobile()) {
        e.preventDefault();
        e.stopPropagation();
        const currentOpen = globalTooltipManager.getOpenTooltip();
        globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
        return;
      }

      if (!disabled && preferNativeClick) {
        // Let the native button click handle the action (standard touch → click path).
        return;
      }

      if (!disabled) {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, []);

  const handleTouchStart = useCallback((id: string, disabled: boolean, isCoolingDown: boolean, e: React.TouchEvent) => {
    // Clear any existing timer before creating a new one
    globalTooltipManager.clearPressTimer(id);

    // Start timer to show tooltip (250ms on mobile for faster feedback, 300ms on desktop)
    const delay = globalTooltipManager.isMobile() ? 250 : 300;
    const timer = setTimeout(() => {
      globalTooltipManager.setOpenTooltip(id, true); // Mark as opened by timer
      globalTooltipManager.clearPressTimer(id);
    }, delay);

    globalTooltipManager.setPressTimer(id, timer);
  }, []);

  const handleTouchEnd = useCallback((
    id: string,
    disabled: boolean,
    onClick: () => void,
    e: React.TouchEvent,
    preferNativeClick = true,
  ) => {
    // Capture state before clearing (clearPressTimer removes from pressingIds)
    const wasPressing = globalTooltipManager.isPressing(id);
    const tooltipWasOpen = globalTooltipManager.isTooltipOpen(id);
    globalTooltipManager.clearPressTimer(id);

    // If tooltip is already open
    if (tooltipWasOpen) {
      const wasOpenedByTimer = globalTooltipManager.wasOpenedByTimer(id);

      // If tooltip was opened by long press: keep it open, prevent action. User clicks elsewhere to close.
      // Keep openedByTimer so a follow-up compatibility mouseup is treated the same way.
      if (wasOpenedByTimer) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        globalTooltipManager.suppressNextClick(id);
        return;
      }

      // Tooltip was already open (not from this press). Close it and block the
      // synthesized click so closing a tooltip never executes the action.
      globalTooltipManager.setOpenTooltip(null);
      globalTooltipManager.clearOpenedByTimer(id);
      globalTooltipManager.suppressNextClick(id);
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      return;
    }

    // On mobile, short taps on disabled controls should open the tooltip directly.
    // Relying on a later click is unreliable because disabled buttons may not emit one.
    if (wasPressing && !tooltipWasOpen) {
      if (disabled) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        const currentOpen = globalTooltipManager.getOpenTooltip();
        globalTooltipManager.setOpenTooltip(currentOpen === id ? null : id);
        return;
      }

      if (preferNativeClick) {
        // Let the native button click handle the action (standard touch → click path).
        return;
      }

      if (!disabled) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        onClick();
      }
    }
  }, []);

  const closeTooltip = useCallback(() => {
    closeAllGlobalTooltips();
  }, []);

  return {
    isMobile: globalTooltipManager.isMobile(),
    isTooltipOpen,
    setOpenTooltip,
    handleWrapperClick,
    handleClickCapture,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
    closeTooltip,
  };
}
