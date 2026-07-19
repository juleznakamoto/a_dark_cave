import { describe, expect, it } from "vitest";
import {
  hasForestUnlockEvidence,
  hasVillageUnlockEvidence,
  isVillageTabVisible,
  repairUnlockFlags,
} from "./repairUnlockFlags";

const defaults = {
  villageUnlocked: false,
  forestUnlocked: false,
  bastionUnlocked: false,
  gameStarted: false,
};

describe("repairUnlockFlags", () => {
  it("restores villageUnlocked from stone_axe / huts when flags were wiped", () => {
    const repaired = repairUnlockFlags(
      {
        flags: { gameStarted: true, villagerCapsEnabled: true } as typeof defaults & {
          villagerCapsEnabled?: boolean;
        },
        tools: { stone_axe: true, steel_axe: true },
        buildings: { woodenHut: 7, clerksHut: 1, darkEstate: 1 },
        weapons: { long_bow: true, crude_bow: true },
      },
      defaults,
    );

    expect(repaired.flags.villageUnlocked).toBe(true);
    expect(repaired.flags.forestUnlocked).toBe(true);
    expect(repaired.flags.gameStarted).toBe(true);
  });

  it("restores unlocks when the entire flags object is missing", () => {
    const repaired = repairUnlockFlags(
      {
        tools: { stone_axe: true },
        buildings: { woodenHut: 1 },
      },
      defaults,
    );

    expect(repaired.flags.villageUnlocked).toBe(true);
    expect(repaired.flags.gameStarted).toBe(true);
  });

  it("does not invent unlocks for a fresh save", () => {
    const repaired = repairUnlockFlags(
      {
        flags: defaults,
        tools: {},
        buildings: {},
        weapons: {},
      },
      defaults,
    );

    expect(repaired.flags.villageUnlocked).toBe(false);
    expect(repaired.flags.forestUnlocked).toBe(false);
    expect(repaired.flags.bastionUnlocked).toBe(false);
  });

  it("hasVillageUnlockEvidence matches tab visibility", () => {
    const state = {
      tools: { stone_axe: true },
      flags: { villageUnlocked: false },
    };
    expect(hasVillageUnlockEvidence(state)).toBe(true);
    expect(isVillageTabVisible(state)).toBe(true);
  });

  it("detects forest from crude_bow", () => {
    expect(
      hasForestUnlockEvidence({
        weapons: { crude_bow: true },
        flags: { forestUnlocked: false },
      }),
    ).toBe(true);
  });

  it("does not treat village Hunter Cabin as forest unlock evidence", () => {
    expect(
      hasForestUnlockEvidence({
        buildings: { cabin: 1, woodenHut: 1 },
        flags: { forestUnlocked: false, villageUnlocked: true },
      }),
    ).toBe(false);
  });
});
