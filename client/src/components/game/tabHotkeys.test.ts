import { describe, it, expect } from "vitest";
import { getVisibleHotkeyTabs } from "./tabHotkeys";

describe("getVisibleHotkeyTabs", () => {
  it("returns only cave when nothing else is unlocked", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: false,
        forestUnlocked: false,
        bastionUnlocked: false,
        darkEstate: 0,
        survivorsNotes: false,
        bookOfTrials: false,
        timedEventActive: false,
      }),
    ).toEqual(["cave"]);
  });

  it("matches tab bar order: cave, village, estate, forest, bastion, achievements, timedevent", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: true,
        forestUnlocked: true,
        bastionUnlocked: true,
        darkEstate: 1,
        survivorsNotes: true,
        bookOfTrials: false,
        timedEventActive: true,
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

  it("includes achievements when only book_of_trials is set", () => {
    expect(
      getVisibleHotkeyTabs({
        villageUnlocked: false,
        forestUnlocked: false,
        bastionUnlocked: false,
        darkEstate: 0,
        survivorsNotes: false,
        bookOfTrials: true,
        timedEventActive: false,
      }),
    ).toEqual(["cave", "achievements"]);
  });
});
