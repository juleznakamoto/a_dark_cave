// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Howler } from "howler";
import { audioManager } from "./audio";
import { setNativeAppBackgrounded } from "./tabVisibility";

describe("audio context while the page is hidden", () => {
  const originalCtx = Howler.ctx;
  const originalMasterGain = Howler.masterGain;
  let hidden = false;

  afterEach(() => {
    hidden = false;
    setNativeAppBackgrounded(false);
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    Howler.ctx = originalCtx;
    Howler.masterGain = originalMasterGain;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function installContext(options?: { withMasterGain?: boolean }) {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const ctx = {
      state: "running" as AudioContextState,
      currentTime: 0,
      suspend: vi.fn().mockImplementation(() => {
        ctx.state = "suspended";
        return Promise.resolve();
      }),
      resume: vi.fn().mockImplementation(() => {
        ctx.state = "running";
        return Promise.resolve();
      }),
    };
    Howler.ctx = ctx as unknown as AudioContext;

    if (options?.withMasterGain) {
      const gain = {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn((v: number) => {
          gain.value = v;
        }),
        exponentialRampToValueAtTime: vi.fn((v: number) => {
          gain.value = v;
        }),
      };
      Howler.masterGain = { gain } as unknown as GainNode;
    } else {
      Howler.masterGain = null as unknown as GainNode;
    }

    return ctx;
  }

  it("suspends a running context when the page hides and resumes it when shown", async () => {
    const ctx = installContext();

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(ctx.suspend).toHaveBeenCalledOnce();
    expect(ctx.state).toBe("suspended");

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(ctx.state).toBe("running");
  });

  it("does not resume the context while the page is still hidden", () => {
    const ctx = installContext();
    ctx.state = "suspended";
    hidden = true;

    audioManager.playSound("not-loaded", 1, false);

    expect(ctx.resume).not.toHaveBeenCalled();
  });

  it("suspends when the iOS app backgrounds even if document.hidden stays false", async () => {
    const ctx = installContext();

    setNativeAppBackgrounded(true);
    await Promise.resolve();

    expect(ctx.suspend).toHaveBeenCalledOnce();

    setNativeAppBackgrounded(false);

    expect(ctx.resume).toHaveBeenCalledOnce();
  });

  it("fades the master gain before suspending so a lock-screen cut does not click", async () => {
    vi.useFakeTimers();
    const ctx = installContext({ withMasterGain: true });
    const gain = Howler.masterGain.gain;

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(gain.cancelScheduledValues).toHaveBeenCalled();
    expect(gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(ctx.suspend).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    expect(ctx.suspend).toHaveBeenCalledOnce();

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending hide-suspend when the page shows during the fade", async () => {
    vi.useFakeTimers();
    const ctx = installContext({ withMasterGain: true });
    const gain = Howler.masterGain.gain;

    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.advanceTimersByTimeAsync(50);
    await Promise.resolve();

    expect(ctx.suspend).not.toHaveBeenCalled();
    // Hide faded out, show faded back in; context never left running.
    expect(gain.exponentialRampToValueAtTime).toHaveBeenCalledTimes(2);
  });

  it("resumes an interrupted context", () => {
    const ctx = installContext();
    ctx.state = "interrupted";

    audioManager.playSound("not-loaded", 1, false);

    expect(ctx.resume).toHaveBeenCalledOnce();
  });
});
