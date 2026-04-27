import { describe, expect, it, vi } from "vitest";
import {
  buildMainNavHotkeyTabOrder,
  buildMainNavHotkeyTargets,
  isMainNavArrowKey,
  pauseNavDigitIndexFromKeyboard,
  tryHandleMainNavKeydown,
} from "./mainNavHotkeys";

describe("buildMainNavHotkeyTabOrder", () => {
  const base = {
    flags: {
      villageUnlocked: false,
      forestUnlocked: false,
      bastionUnlocked: false,
    },
    buildings: { darkEstate: 0 },
    relics: {} as { survivors_notes?: boolean } | null,
    books: {} as { book_of_trials?: boolean } | null,
    timedEventTab: { isActive: false },
  };

  it("is cave-only when nothing else is available", () => {
    expect(buildMainNavHotkeyTabOrder(base)).toEqual(["cave"]);
  });

  it("uses full fixed order when all segments are available", () => {
    expect(
      buildMainNavHotkeyTabOrder({
        flags: {
          villageUnlocked: true,
          forestUnlocked: true,
          bastionUnlocked: true,
        },
        buildings: { darkEstate: 1 },
        relics: { survivors_notes: true },
        books: {},
        timedEventTab: { isActive: true },
      }),
    ).toEqual([
      "cave",
      "village",
      "estate",
      "forest",
      "bastion",
      "achievements",
      "timedevent",
    ]);
  });
});

describe("buildMainNavHotkeyTargets", () => {
  it("cave target calls setActiveTab(cave)", () => {
    const setActiveTab = vi.fn();
    const getState = () => ({
      setActiveTab,
      flags: {
        villageUnlocked: false,
        forestUnlocked: false,
        bastionUnlocked: false,
      },
      buildings: { darkEstate: 0 },
      relics: {},
      books: {},
      timedEventTab: { isActive: false },
    });
    const ui = {
      clearTabBlink: vi.fn(),
      setLastViewedUnclaimedAchievementIds: vi.fn(),
    };
    const targets = buildMainNavHotkeyTargets(getState, ui);
    expect(targets).toHaveLength(1);
    expect(targets[0].index1Based).toBe(1);
    targets[0].activate();
    expect(setActiveTab).toHaveBeenCalledWith("cave");
    expect(ui.clearTabBlink).not.toHaveBeenCalled();
  });
});

describe("pauseNavDigitIndexFromKeyboard", () => {
  it("maps top row 1-7 and numpad codes", () => {
    expect(pauseNavDigitIndexFromKeyboard({ key: "1", code: "Digit1" })).toBe(1);
    expect(pauseNavDigitIndexFromKeyboard({ key: "7", code: "Digit7" })).toBe(7);
    expect(pauseNavDigitIndexFromKeyboard({ key: "1", code: "Numpad1" })).toBe(1);
    expect(pauseNavDigitIndexFromKeyboard({ key: "3", code: "Numpad3" })).toBe(3);
  });

  it("prefers e.code Digit1-7 so physical row works when e.key is not 1-7 (e.g. some layouts)", () => {
    expect(pauseNavDigitIndexFromKeyboard({ key: "&", code: "Digit1" })).toBe(1);
  });

  it("returns null for out-of-range or non-digit keys", () => {
    expect(pauseNavDigitIndexFromKeyboard({ key: "8", code: "Digit8" })).toBeNull();
    expect(pauseNavDigitIndexFromKeyboard({ key: "a", code: "KeyA" })).toBeNull();
    expect(pauseNavDigitIndexFromKeyboard({ key: "9", code: "Numpad9" })).toBeNull();
  });
});

describe("isMainNavArrowKey", () => {
  it("detects by code and key", () => {
    expect(isMainNavArrowKey({ key: "ArrowLeft", code: "ArrowLeft" })).toBe("left");
    expect(isMainNavArrowKey({ key: "ArrowRight", code: "ArrowRight" })).toBe("right");
  });
});

describe("tryHandleMainNavKeydown", () => {
  const ctxBase = (over: Partial<Parameters<typeof tryHandleMainNavKeydown>[1]>) => ({
    isTypingInField: false,
    isModalOpen: false,
    isPaused: true,
    hasTradePost: true,
    activeTab: "cave" as const,
    mainNavHotkeyTargets: [],
    ...over,
  });

  const makeEv = (o: {
    key: string;
    code: string;
    ctrlKey?: boolean;
  }) => ({
    key: o.key,
    code: o.code,
    ctrlKey: o.ctrlKey ?? false,
    metaKey: false,
    altKey: false,
    preventDefault: vi.fn(),
  });

  it("opens trader on T and prevents default", () => {
    const openTrader = vi.fn();
    const ev = makeEv({ key: "T", code: "KeyT" });
    const r = tryHandleMainNavKeydown(
      ev,
      ctxBase({ hasTradePost: true }),
      { openTrader },
    );
    expect(r).toBe(true);
    expect(openTrader).toHaveBeenCalledTimes(1);
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("activates first tab on Digit1 by code (non-US layout key)", () => {
    const a1 = vi.fn();
    const a2 = vi.fn();
    const ev = makeEv({ key: "&", code: "Digit1" });
    const r = tryHandleMainNavKeydown(
      ev,
      ctxBase({
        mainNavHotkeyTargets: [
          { tab: "cave", index1Based: 1, activate: a1 },
          { tab: "village", index1Based: 2, activate: a2 },
        ],
      }),
      { openTrader: vi.fn() },
    );
    expect(r).toBe(true);
    expect(a1).toHaveBeenCalled();
    expect(a2).not.toHaveBeenCalled();
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("cycles right on ArrowRight", () => {
    const a1 = vi.fn();
    const a2 = vi.fn();
    const ev = makeEv({ key: "ArrowRight", code: "ArrowRight" });
    const r = tryHandleMainNavKeydown(
      ev,
      ctxBase({
        activeTab: "cave",
        mainNavHotkeyTargets: [
          { tab: "cave", index1Based: 1, activate: a1 },
          { tab: "village", index1Based: 2, activate: a2 },
        ],
      }),
      { openTrader: vi.fn() },
    );
    expect(r).toBe(true);
    expect(a2).toHaveBeenCalled();
    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("ignores tab keys when not paused", () => {
    const a1 = vi.fn();
    const ev = makeEv({ key: "1", code: "Digit1" });
    const r = tryHandleMainNavKeydown(
      ev,
      ctxBase({ isPaused: false, mainNavHotkeyTargets: [{ tab: "cave", index1Based: 1, activate: a1 }] }),
      { openTrader: vi.fn() },
    );
    expect(r).toBe(false);
    expect(a1).not.toHaveBeenCalled();
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it("does nothing for nav when a modal is open", () => {
    const a1 = vi.fn();
    const openTrader = vi.fn();
    const ev = makeEv({ key: "1", code: "Digit1" });
    const r = tryHandleMainNavKeydown(
      ev,
      ctxBase({ isModalOpen: true, mainNavHotkeyTargets: [{ tab: "cave", index1Based: 1, activate: a1 }] }),
      { openTrader },
    );
    expect(r).toBe(false);
    expect(a1).not.toHaveBeenCalled();
  });
});
