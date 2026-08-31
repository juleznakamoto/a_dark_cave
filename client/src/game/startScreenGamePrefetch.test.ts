import { describe, expect, it, vi } from "vitest";
import { subscribeStartScreenGamePrefetch } from "./startScreenGamePrefetch";

describe("subscribeStartScreenGamePrefetch", () => {
  it("does not prefetch on activity before LCP", () => {
    const onPrefetch = vi.fn();
    const target = new EventTarget();
    const unsubscribe = subscribeStartScreenGamePrefetch(onPrefetch, {
      target,
      lcpFallbackMs: 60_000,
      observeLcp: () => () => { },
    });

    target.dispatchEvent(new Event("pointermove"));
    expect(onPrefetch).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("prefetches after LCP once the player has already moved", () => {
    const onPrefetch = vi.fn();
    const target = new EventTarget();
    let reportLcp!: () => void;
    const unsubscribe = subscribeStartScreenGamePrefetch(onPrefetch, {
      target,
      lcpFallbackMs: 60_000,
      observeLcp: (callback) => {
        reportLcp = callback;
        return () => { };
      },
    });

    target.dispatchEvent(new Event("pointermove"));
    expect(onPrefetch).not.toHaveBeenCalled();
    reportLcp();
    expect(onPrefetch).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("prefetches on the first move after LCP and only once", () => {
    const onPrefetch = vi.fn();
    const target = new EventTarget();
    let reportLcp!: () => void;
    const unsubscribe = subscribeStartScreenGamePrefetch(onPrefetch, {
      target,
      lcpFallbackMs: 60_000,
      observeLcp: (callback) => {
        reportLcp = callback;
        return () => { };
      },
    });

    reportLcp();
    expect(onPrefetch).not.toHaveBeenCalled();
    target.dispatchEvent(new Event("pointermove"));
    target.dispatchEvent(new Event("pointerdown"));
    expect(onPrefetch).toHaveBeenCalledOnce();
    unsubscribe();
  });
});
