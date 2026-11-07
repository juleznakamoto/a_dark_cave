import { useEffect, useState } from "react";

/** Pause hint and Steam play-time fade. */
export const PAUSE_UI_FADE_MS = 1000;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}

function fadeMs(durationMs: number): number {
  return prefersReducedMotion() ? 0 : durationMs;
}

/**
 * Mount while `open` is true, and keep the node mounted through a fade-out.
 * `visible` stays false for one frame after mount so a CSS opacity transition
 * can run from 0 to 1.
 */
export function useFadePresence(
  open: boolean,
  durationMs = PAUSE_UI_FADE_MS,
): { mounted: boolean; visible: boolean } {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setVisible(false);
    if (!mounted) return;
    const id = window.setTimeout(() => setMounted(false), fadeMs(durationMs));
    return () => window.clearTimeout(id);
  }, [open, mounted, durationMs]);

  useEffect(() => {
    if (!mounted || !open) return;
    if (fadeMs(durationMs) === 0) {
      setVisible(true);
      return;
    }
    // After the opacity-0 paint, so the CSS transition has a start frame.
    const id = window.setTimeout(() => setVisible(true), 0);
    return () => window.clearTimeout(id);
  }, [mounted, open, durationMs]);

  return { mounted, visible };
}
