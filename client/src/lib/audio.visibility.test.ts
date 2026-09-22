// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { Howler } from "howler";
import { audioManager } from "./audio";

describe("audio context while the page is hidden", () => {
  const originalCtx = Howler.ctx;
  let hidden = false;

  afterEach(() => {
    hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    Howler.ctx = originalCtx;
    vi.restoreAllMocks();
  });

  function installContext() {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    const ctx = {
      state: "running" as AudioContextState,
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
});
