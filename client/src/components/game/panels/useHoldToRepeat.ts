import { useCallback, useEffect, useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";

const HOLD_REPEAT_DELAY_MS = 500;
const HOLD_REPEAT_INTERVAL_MS = 100;
/** Same slop as tooltip long-press: a small slide is a scroll, not another press. */
const HOLD_SCROLL_CANCEL_PX = 10;
/** Covers the compatibility mousedown browsers fire just after touchend. */
const TOUCH_GUARD_AFTER_END_MS = 100;
/**
 * If a scroll ends the gesture with pointercancel and no touchend, drop the
 * ghost-click guard so a later mouse click still works.
 */
const TOUCH_GUARD_SAFETY_MS = 2000;

type HoldTimers = {
  interval: ReturnType<typeof setInterval> | null;
  timeout: ReturnType<typeof setTimeout> | null;
};

/**
 * Press-and-hold repeat for the village job −/+ buttons.
 * A finger that slides into a scroll must stop the repeat. mouseleave is
 * ignored while a touch is active (it is the compatibility event that used
 * to cancel the hold early), and buttons often never receive touchcancel
 * when a parent list starts scrolling.
 */
export function useHoldToRepeat() {
  const holdRef = useRef<HoldTimers>({ interval: null, timeout: null });
  const touchActiveRef = useRef(false);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const touchGuardRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoldTimers = useCallback(() => {
    if (holdRef.current.timeout) clearTimeout(holdRef.current.timeout);
    if (holdRef.current.interval) clearInterval(holdRef.current.interval);
    holdRef.current = { interval: null, timeout: null };
  }, []);

  const scheduleTouchGuardRelease = useCallback((delayMs: number) => {
    if (touchGuardRef.current) clearTimeout(touchGuardRef.current);
    touchGuardRef.current = setTimeout(() => {
      touchActiveRef.current = false;
      touchGuardRef.current = null;
    }, delayMs);
  }, []);

  const finishTouchGesture = useCallback(() => {
    if (!touchActiveRef.current) return;
    clearHoldTimers();
    originRef.current = null;
    scheduleTouchGuardRelease(TOUCH_GUARD_AFTER_END_MS);
  }, [clearHoldTimers, scheduleTouchGuardRelease]);

  const cancelRepeatForScroll = useCallback(() => {
    if (!touchActiveRef.current) return;
    clearHoldTimers();
    originRef.current = null;
    scheduleTouchGuardRelease(TOUCH_GUARD_SAFETY_MS);
  }, [clearHoldTimers, scheduleTouchGuardRelease]);

  const noteTouchPoint = useCallback(
    (x: number, y: number) => {
      const origin = originRef.current;
      if (!origin || !touchActiveRef.current) return;
      const dx = x - origin.x;
      const dy = y - origin.y;
      if (dx * dx + dy * dy >= HOLD_SCROLL_CANCEL_PX * HOLD_SCROLL_CANCEL_PX) {
        cancelRepeatForScroll();
      }
    },
    [cancelRepeatForScroll],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      noteTouchPoint(touch.clientX, touch.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      noteTouchPoint(event.clientX, event.clientY);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      cancelRepeatForScroll();
    };

    document.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: true,
    });
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("touchend", finishTouchGesture, true);
    document.addEventListener("touchcancel", finishTouchGesture, true);

    return () => {
      document.removeEventListener("touchmove", onTouchMove, true);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      document.removeEventListener("touchend", finishTouchGesture, true);
      document.removeEventListener("touchcancel", finishTouchGesture, true);
      clearHoldTimers();
      if (touchGuardRef.current) clearTimeout(touchGuardRef.current);
      touchActiveRef.current = false;
      originRef.current = null;
    };
  }, [
    noteTouchPoint,
    cancelRepeatForScroll,
    finishTouchGesture,
    clearHoldTimers,
  ]);

  const startHold = useCallback(
    (action: () => void, isTouch: boolean = false) => {
      // Compatibility mousedown after a touch would press the neighboring button.
      if (!isTouch && touchActiveRef.current) return;
      if (isTouch) touchActiveRef.current = true;

      clearHoldTimers();
      action();

      const timeout = setTimeout(() => {
        holdRef.current.interval = setInterval(action, HOLD_REPEAT_INTERVAL_MS);
        holdRef.current.timeout = null;
      }, HOLD_REPEAT_DELAY_MS);
      holdRef.current.timeout = timeout;
    },
    [clearHoldTimers],
  );

  const stopHold = useCallback(
    (isTouch: boolean = false) => {
      // Synthetic mouseup/leave while the finger is down must not end the hold.
      if (!isTouch && touchActiveRef.current) return;
      if (isTouch) {
        finishTouchGesture();
        return;
      }
      clearHoldTimers();
    },
    [clearHoldTimers, finishTouchGesture],
  );

  const beginTouchHold = useCallback(
    (event: ReactTouchEvent, action: () => void, enabled: boolean) => {
      if (!enabled) return;
      const touch = event.changedTouches[0] ?? event.touches[0];
      if (touch) {
        originRef.current = { x: touch.clientX, y: touch.clientY };
      }
      startHold(action, true);
    },
    [startHold],
  );

  const endTouchHold = useCallback(
    (event: ReactTouchEvent) => {
      // touchend is not passive. Canceling it blocks the ghost click on the
      // neighboring −/+ after the finger lifts.
      if (event.cancelable) event.preventDefault();
      finishTouchGesture();
    },
    [finishTouchGesture],
  );

  return { startHold, stopHold, beginTouchHold, endTouchHold };
}
