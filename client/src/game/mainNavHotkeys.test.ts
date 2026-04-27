import { describe, expect, it, vi } from "vitest";
import {
  buildMainNavHotkeyTabOrder,
  buildMainNavHotkeyTargets,
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
