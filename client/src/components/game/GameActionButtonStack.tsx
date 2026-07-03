"use client";

import * as React from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Z_INDEX } from "@/lib/z-index";
import { GAME_ACTION_BUTTON_STACK_CLASS } from "@/components/CooldownButton";

type Size = { width: number; height: number };

/**
 * Keeps action buttons in a fixed viewport layer above click particles (body z-35)
 * while preserving flex/grid layout via an in-flow size placeholder.
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
      <div
        className={cn("fixed pointer-events-none", className)}
        style={{
          zIndex: Z_INDEX.actionButtons,
          left: fixedBox?.left ?? 0,
          top: fixedBox?.top ?? 0,
          width: size?.width,
          height: size?.height,
          visibility: fixedBox ? "visible" : "hidden",
        }}
      >
        <div className="pointer-events-auto inline-block">{children}</div>
      </div>
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
