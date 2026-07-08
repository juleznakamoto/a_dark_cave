"use client";

import * as React from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { GAME_ACTION_BUTTON_STACK_CLASS } from "@/components/CooldownButton";

type Size = { width: number; height: number };

type FixedOverlayState = {
  box: DOMRect;
  clipPath?: string;
};

/** Nearest ancestor that scrolls (panel ScrollArea viewport, overflow-y-auto shell, etc.). */
function getOverflowScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const scrollableY =
      (overflowY === "auto" ||
        overflowY === "scroll" ||
        overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight + 1;
    const scrollableX =
      (overflowX === "auto" ||
        overflowX === "scroll" ||
        overflowX === "overlay") &&
      node.scrollWidth > node.clientWidth + 1;
    if (scrollableY || scrollableX) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function getFixedOverlayState(
  rect: DOMRect,
  scrollRoot: HTMLElement | null,
): FixedOverlayState | null {
  if (!scrollRoot) {
    return { box: rect };
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const intersects =
    rect.bottom > rootRect.top &&
    rect.top < rootRect.bottom &&
    rect.right > rootRect.left &&
    rect.left < rootRect.right;
  if (!intersects) {
    return null;
  }

  const clipTop = Math.max(0, rootRect.top - rect.top);
  const clipRight = Math.max(0, rect.right - rootRect.right);
  const clipBottom = Math.max(0, rect.bottom - rootRect.bottom);
  const clipLeft = Math.max(0, rootRect.left - rect.left);
  const clipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;

  return { box: rect, clipPath };
}

/**
 * Keeps action buttons in a body-portaled fixed layer (z-40) above click particles
 * (body z-35) while preserving flex/grid layout via an in-flow size placeholder.
 */
export function GameActionButtonStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [fixedOverlay, setFixedOverlay] = useState<FixedOverlayState | null>(
    null,
  );

  const sync = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollRoot = getOverflowScrollParent(el);
    if (scrollRoot !== scrollParentRef.current) {
      scrollParentRef.current?.removeEventListener("scroll", sync);
      scrollParentRef.current = scrollRoot;
      scrollRoot?.addEventListener("scroll", sync, { passive: true });
    }
    setSize({ width: rect.width, height: rect.height });
    setFixedOverlay(getFixedOverlayState(rect, scrollRoot));
  }, []);

  useLayoutEffect(() => {
    sync();
    const el = measureRef.current;
    if (!el) return;

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", sync);
    visualViewport?.addEventListener("scroll", sync);
    return () => {
      ro.disconnect();
      scrollParentRef.current?.removeEventListener("scroll", sync);
      scrollParentRef.current = null;
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("scroll", sync);
    };
  }, [sync, children]);

  const fixedLayer =
    fixedOverlay != null ? (
      <div
        className={cn("fixed pointer-events-none", className)}
        style={{
          zIndex: Z_INDEX.actionButtons,
          left: fixedOverlay.box.left,
          top: fixedOverlay.box.top,
          width: size?.width,
          height: size?.height,
          clipPath: fixedOverlay.clipPath,
        }}
      >
        <div className="pointer-events-auto inline-block">{children}</div>
      </div>
    ) : null;

  return (
    <>
      <div
        ref={measureRef}
        className={cn("inline-block", className)}
        aria-hidden
        style={{ visibility: "hidden", pointerEvents: "none" }}
      >
        {children}
      </div>
      {typeof document !== "undefined" && fixedLayer != null
        ? createPortal(fixedLayer, document.body)
        : null}
    </>
  );
}

/** Wraps button (+ badges) in fixed stack when click particles are enabled. */
export function ActionButtonSlot({
  children,
  particleStack,
  className,
}: {
  children: React.ReactNode;
  particleStack: boolean;
  className?: string;
}) {
  if (particleStack) {
    return (
      <GameActionButtonStack className={className}>{children}</GameActionButtonStack>
    );
  }
  return (
    <div className={cn(GAME_ACTION_BUTTON_STACK_CLASS, className)}>{children}</div>
  );
}
