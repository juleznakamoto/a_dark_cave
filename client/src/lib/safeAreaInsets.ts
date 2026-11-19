import { useSyncExternalStore, type CSSProperties } from "react";

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const ZERO_SAFE_AREA: SafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

type Side = "top" | "right" | "bottom" | "left";

export type CollisionPadding =
  | number
  | Partial<Record<Side, number>>;

let current = ZERO_SAFE_AREA;
let listening = false;
const subscribers = new Set<() => void>();

function readInset(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Pixel insets from `env(safe-area-inset-*)`. Zero when the web view is not edge to edge. */
export function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") return ZERO_SAFE_AREA;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);";
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const next = {
    top: readInset(style.paddingTop),
    right: readInset(style.paddingRight),
    bottom: readInset(style.paddingBottom),
    left: readInset(style.paddingLeft),
  };
  probe.remove();
  return next;
}

function publish(next: SafeAreaInsets) {
  if (
    next.top === current.top &&
    next.right === current.right &&
    next.bottom === current.bottom &&
    next.left === current.left
  ) {
    return;
  }
  current = next;
  subscribers.forEach((listener) => listener());
}

function refresh() {
  publish(readSafeAreaInsets());
}

function ensureListening() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  current = readSafeAreaInsets();
  window.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", refresh);
  window.visualViewport?.addEventListener("resize", refresh);
}

function subscribe(listener: () => void) {
  ensureListening();
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

function getSnapshot(): SafeAreaInsets {
  ensureListening();
  return current;
}

/** Notch, home indicator, and landscape side insets. Stable until they change. */
export function useSafeAreaInsets(): SafeAreaInsets {
  return useSyncExternalStore(subscribe, getSnapshot, () => ZERO_SAFE_AREA);
}

/**
 * Keep a popper inside the screen, and out of the notch.
 * The header's top edge is the safe-area top: tips may meet that line, not cross it.
 */
export function collisionPaddingClearOfSafeArea(
  padding: CollisionPadding | undefined,
  insets: SafeAreaInsets,
  fallback = 0,
): Record<Side, number> {
  const base =
    typeof padding === "number"
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : {
          top: padding?.top ?? fallback,
          right: padding?.right ?? fallback,
          bottom: padding?.bottom ?? fallback,
          left: padding?.left ?? fallback,
        };
  return {
    top: Math.max(base.top, insets.top),
    right: Math.max(base.right, insets.right),
    bottom: Math.max(base.bottom, insets.bottom),
    left: Math.max(base.left, insets.left),
  };
}

/**
 * Center a dialog in the area under the notch and above the home indicator.
 * Keeps an authored `max-h-[...]` when that cap is the smaller one.
 */
export function dialogFrameClearOfSafeArea(
  className: string | undefined,
  insets: SafeAreaInsets,
): CSSProperties | undefined {
  if (
    insets.top <= 0 &&
    insets.right <= 0 &&
    insets.bottom <= 0 &&
    insets.left <= 0
  ) {
    return undefined;
  }
  const matches = className ? [...className.matchAll(/max-h-\[([^\]]+)\]/g)] : [];
  const cap = matches.length > 0 ? matches[matches.length - 1]?.[1] : null;
  const safeHeight = `calc(100dvh - ${insets.top}px - ${insets.bottom}px)`;
  return {
    top: `calc(50% + ${(insets.top - insets.bottom) / 2}px)`,
    maxHeight: cap ? `min(${cap}, ${safeHeight})` : safeHeight,
  };
}
