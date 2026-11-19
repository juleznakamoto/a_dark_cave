import { useLayoutEffect, useRef, type RefObject } from "react";

const SLACK_PX = 1;
const MAX_STEPS = 12;

type FitCache = {
  text: string;
  width: string;
  height: number;
};

const fitCache = new WeakMap<HTMLElement, FitCache>();
const locks = new WeakSet<HTMLElement>();

/**
 * Radix puts a 1px clipped copy of the tip text in the frame for screen
 * readers. That copy is `white-space: nowrap`, so its scroll width is the
 * whole sentence and would keep every narrower width looking like overflow.
 */
function isClippedClone(el: HTMLElement): boolean {
  if (el.offsetWidth > 1 || el.offsetHeight > 1) return false;
  const style = getComputedStyle(el);
  return style.position === "absolute" && style.overflow === "hidden";
}

/**
 * A child wider than its box (a cost row that cannot wrap). Line growth is
 * handled separately. Direct children include overflowing descendants.
 */
function childOverflows(el: HTMLElement): boolean {
  for (const child of el.children) {
    if (!(child instanceof HTMLElement)) continue;
    if (isClippedClone(child)) continue;
    if (child.scrollWidth > child.clientWidth + SLACK_PX) return true;
  }
  return false;
}

function tooNarrow(el: HTMLElement, naturalHeight: number): boolean {
  return el.offsetHeight > naturalHeight + SLACK_PX || childOverflows(el);
}

function remember(el: HTMLElement, text: string, width: string) {
  fitCache.set(el, { text, width, height: el.offsetHeight });
}

/**
 * `width: max-content` plus a max-width cap wraps the text and then keeps the
 * cap. The wrapped line is shorter than the box, so the right side stays
 * empty. CSS still has no property that shrinks to the longest wrapped line
 * (the shrinkwrap problem). This locks the narrowest border-box width that
 * keeps those same line breaks.
 */
export function shrinkTooltipFrame(el: HTMLElement): void {
  if (locks.has(el)) return;
  const text = el.textContent ?? "";
  const cached = fitCache.get(el);
  if (
    cached &&
    cached.text === text &&
    cached.width === el.style.width &&
    cached.height === el.offsetHeight
  ) {
    if (!cached.width) return;
    const locked = Number.parseFloat(cached.width);
    if (Number.isFinite(locked) && el.offsetWidth >= locked - SLACK_PX) return;
  }

  locks.add(el);
  const previous = el.style.width;
  try {
    el.style.width = "";
    const natural = el.offsetWidth;
    if (natural <= 0) {
      el.style.width = previous;
      return;
    }
    const naturalHeight = el.offsetHeight;

    el.style.width = "min-content";
    const minWidth = el.offsetWidth;
    if (minWidth <= 0) {
      el.style.width = "";
      return;
    }
    const minIsTooNarrow = tooNarrow(el, naturalHeight);

    if (!minIsTooNarrow) {
      el.style.width = "";
      if (natural - minWidth <= SLACK_PX) {
        remember(el, text, "");
        return;
      }
      const next = `${Math.ceil(minWidth) + SLACK_PX}px`;
      el.style.width = next;
      remember(el, text, next);
      return;
    }

    let lo = minWidth;
    let hi = natural;
    let steps = 0;
    while (hi - lo > SLACK_PX && steps < MAX_STEPS) {
      steps += 1;
      const mid = (lo + hi) / 2;
      el.style.width = `${mid}px`;
      if (tooNarrow(el, naturalHeight)) lo = mid;
      else hi = mid;
    }

    el.style.width = "";
    const nextPx = Math.ceil(hi) + SLACK_PX;
    if (natural - nextPx <= SLACK_PX) {
      remember(el, text, "");
      return;
    }
    const next = `${nextPx}px`;
    el.style.width = next;
    remember(el, text, next);
  } finally {
    locks.delete(el);
  }
}

/**
 * Search on a hidden copy, then write the final width once.
 *
 * The binary search has to try several widths. Doing that on the tip the
 * player can see makes it appear at the cap and then snap tighter. Radix also
 * reads the tip size while it is placing it, so a later change moves the tip
 * as well. The copy inherits the same cap and font, and the visible node is
 * touched only when the answer is different.
 */
export function applyFittedTooltipWidth(el: HTMLElement): void {
  if (el.offsetWidth <= 0) return;
  const text = el.textContent ?? "";
  const cached = fitCache.get(el);
  if (
    cached &&
    cached.width === el.style.width &&
    Math.abs(el.offsetHeight - cached.height) <= SLACK_PX
  ) {
    const locked = Number.parseFloat(cached.width);
    const stillWideEnough =
      !cached.width ||
      (Number.isFinite(locked) && el.offsetWidth + SLACK_PX >= locked);
    // A ticking cost line changes the text without changing the box. Measuring
    // again would rebuild the tip and snap it. Rebuild only when it no longer fits.
    if (cached.text === text) {
      if (stillWideEnough) return;
    } else if (stillWideEnough && !childOverflows(el)) {
      fitCache.set(el, { text, width: el.style.width, height: el.offsetHeight });
      return;
    }
  }

  const computed = getComputedStyle(el);
  const clone = el.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");
  clone.style.position = "fixed";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.visibility = "hidden";
  clone.style.pointerEvents = "none";
  clone.style.transform = "none";
  clone.style.animation = "none";
  clone.style.font = computed.font;
  clone.style.maxWidth = computed.maxWidth;
  clone.style.width = "";
  clone.style.minWidth = "0";
  document.body.appendChild(clone);
  try {
    shrinkTooltipFrame(clone);
    const next = clone.style.width;
    if (el.style.width !== next) el.style.width = next;
    fitCache.set(el, { text, width: next, height: el.offsetHeight });
  } finally {
    clone.remove();
  }
}

/**
 * Live tips and the gallery share this. The visible node only ever receives
 * the finished width. A viewport change can shrink the cap without a React
 * render, so the observer measures again when the box size actually changes.
 */
export function useTooltipShrinkWrap(ref: RefObject<HTMLElement | null>) {
  const sizeRef = useRef({ w: -1, h: -1 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || el.offsetWidth <= 0) return;
    applyFittedTooltipWidth(el);
    sizeRef.current = { w: el.offsetWidth, h: el.offsetHeight };
  });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      const node = ref.current;
      if (!node || node.offsetWidth <= 0) return;
      if (
        node.offsetWidth === sizeRef.current.w &&
        node.offsetHeight === sizeRef.current.h
      ) {
        return;
      }
      applyFittedTooltipWidth(node);
      sizeRef.current = { w: node.offsetWidth, h: node.offsetHeight };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}
