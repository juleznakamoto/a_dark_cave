"use client";

import * as React from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { GAME_ACTION_BUTTON_STACK_CLASS } from "@/components/CooldownButton";

type Size = { width: number; height: number };

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
  const [size, setSize] = useState<Size | null>(null);
  const [fixedBox, setFixedBox] = useState<DOMRect | null>(null);

  const sync = useCallback(() => {
    const el = measureRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    setFixedBox(rect);
  }, []);

  useLayoutEffect(() => {
    sync();
    const el = measureRef.current;
    if (!el) return;

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [sync, children]);

  const fixedLayer =
    fixedBox != null ? (
      <div
        className={cn("fixed pointer-events-none", className)}
        style={{
          zIndex: Z_INDEX.actionButtons,
          left: fixedBox.left,
          top: fixedBox.top,
          width: size?.width,
          height: size?.height,
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
