/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { peekPreferStartScreen, peekResumeGame, setResumeGame } from "@/game/startupBootSurface";
import { HARD_RELOAD_CACHE_BUST_PARAM, MODULE_LOAD_RETRY_KEY } from "./hardReload";
import {
  FATAL_SHOWN_COUNT_KEY,
  escapeFailedGameBoot,
  isRepeatFatalScreen,
  markFatalEscapeToTitle,
  mountFatalErrorScreen,
  triggerReload,
  triggerReturnToCave,
} from "./fatalErrorScreen";

describe("fatal screen recovery", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
    vi.stubGlobal("location", {
      ...originalLocation,
      href: "https://a-dark-cave.com/game",
      replace: vi.fn(),
      reload: vi.fn(),
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends the next boot to the title instead of resuming the crash", () => {
    setResumeGame();
    markFatalEscapeToTitle();
    expect(peekPreferStartScreen()).toBe(true);
    expect(peekResumeGame()).toBe(false);
  });

  it("treats the second show as a repeat", () => {
    expect(isRepeatFatalScreen(1)).toBe(false);
    expect(isRepeatFatalScreen(2)).toBe(true);
  });

  it("reload leaves /game for the title and does not resume", async () => {
    mountFatalErrorScreen(new Error("init failed"));
    expect(sessionStorage.getItem(FATAL_SHOWN_COUNT_KEY)).toBe("1");
    expect(document.getElementById("adc-fatal-error-return")?.hasAttribute("hidden")).toBe(
      true,
    );

    triggerReload();
    await vi.waitFor(() => {
      expect(window.location.replace).toHaveBeenCalled();
    });

    const url = String(vi.mocked(window.location.replace).mock.calls[0][0]);
    expect(url).toContain(`https://a-dark-cave.com/?${HARD_RELOAD_CACHE_BUST_PARAM}=`);
    expect(url).not.toContain("/game");
    expect(peekPreferStartScreen()).toBe(true);
    expect(peekResumeGame()).toBe(false);
    expect(sessionStorage.getItem(MODULE_LOAD_RETRY_KEY)).toBeNull();
  });

  it("first screen only offers reload, and says we are digging deeper", () => {
    mountFatalErrorScreen(new Error("first"));
    const message = document.querySelector("[data-adc-fatal-message]")?.textContent ?? "";
    expect(message).toContain("digging deeper");
    expect(message).not.toContain("make fire");
    expect(document.getElementById("adc-fatal-error-reload")?.textContent).toBe(
      "Reload game",
    );
    expect(document.getElementById("adc-fatal-error-return")?.hasAttribute("hidden")).toBe(
      true,
    );
  });

  it("offers make fire again after reload already failed", () => {
    mountFatalErrorScreen(new Error("first"));
    document.getElementById("adc-fatal-error")?.remove();
    mountFatalErrorScreen(new Error("second"));
    const message = document.querySelector("[data-adc-fatal-message]")?.textContent ?? "";
    expect(message).toContain("make fire again");
    expect(message).not.toContain("light");
    expect(document.getElementById("adc-fatal-error-return")?.textContent).toBe(
      "Return to the cave",
    );
    expect(document.getElementById("adc-fatal-error-return")?.hasAttribute("hidden")).toBe(
      false,
    );
  });

  it("does not count a second mount of the same screen", () => {
    mountFatalErrorScreen(new Error("first"));
    mountFatalErrorScreen(new Error("again"));
    expect(sessionStorage.getItem(FATAL_SHOWN_COUNT_KEY)).toBe("1");
    expect(document.querySelector("[data-adc-fatal-message]")?.textContent).toContain(
      "digging deeper",
    );
  });

  it("the reload button leaves a hash host on its title", async () => {
    vi.stubGlobal("location", {
      href: "https://files.example/wrap/index.html#/game?x=1",
      replace: vi.fn(),
      reload: vi.fn(),
    });
    mountFatalErrorScreen(new Error("init failed"));
    document.getElementById("adc-fatal-error-reload")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(window.location.replace).toHaveBeenCalled();
    });
    const url = new URL(String(vi.mocked(window.location.replace).mock.calls[0][0]));
    expect(url.pathname).toBe("/wrap/index.html");
    expect(url.hash).toBe("#/");
    expect(url.searchParams.has(HARD_RELOAD_CACHE_BUST_PARAM)).toBe(true);
    expect(url.searchParams.get("x")).toBeNull();
    expect(peekPreferStartScreen()).toBe(true);
    expect(peekResumeGame()).toBe(false);
  });

  it("the return button keeps the chunk retry spent", async () => {
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, "1");
    sessionStorage.setItem(FATAL_SHOWN_COUNT_KEY, "1");
    mountFatalErrorScreen(new Error("second"));
    document.getElementById("adc-fatal-error-return")?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(window.location.replace).toHaveBeenCalled();
    });
    const url = String(vi.mocked(window.location.replace).mock.calls[0][0]);
    expect(url).toContain("https://a-dark-cave.com/?");
    expect(url).not.toContain("/game");
    expect(sessionStorage.getItem(MODULE_LOAD_RETRY_KEY)).toBe("1");
  });

  it("return to the cave does not re-arm the automatic chunk retry", async () => {
    sessionStorage.setItem(MODULE_LOAD_RETRY_KEY, "1");
    triggerReturnToCave();
    await vi.waitFor(() => {
      expect(window.location.replace).toHaveBeenCalled();
    });
    expect(sessionStorage.getItem(MODULE_LOAD_RETRY_KEY)).toBe("1");
    expect(peekPreferStartScreen()).toBe(true);
    expect(peekResumeGame()).toBe(false);
  });

  it("startup failure escapes to the title", async () => {
    escapeFailedGameBoot();
    await vi.waitFor(() => {
      expect(window.location.replace).toHaveBeenCalled();
    });
    const url = String(vi.mocked(window.location.replace).mock.calls[0][0]);
    expect(url).not.toContain("/game");
    expect(peekPreferStartScreen()).toBe(true);
    expect(peekResumeGame()).toBe(false);
  });
});
