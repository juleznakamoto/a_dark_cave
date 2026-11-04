import { describe, expect, it } from "vitest";
import {
  getBuildHoverHighlightId,
  getTrapLevel,
  getTrapWinChanceBonus,
} from "./buildingHierarchy";
import { villageAttackEvents } from "./rules/eventsVillageAttacks";

describe("getTrapLevel", () => {
  it("is 0 with no traps, 1 with traps, 2 with improved traps", () => {
    expect(getTrapLevel({ traps: 0, improvedTraps: 0 })).toBe(0);
    expect(getTrapLevel({ traps: 1, improvedTraps: 0 })).toBe(1);
    expect(getTrapLevel({ traps: 1, improvedTraps: 1 })).toBe(2);
    expect(getTrapLevel({ traps: 2, improvedTraps: 1 })).toBe(2);
  });

  it("gives +10% / +20% win chance", () => {
    expect(getTrapWinChanceBonus({ traps: 1 })).toBe(0.1);
    expect(getTrapWinChanceBonus({ traps: 1, improvedTraps: 1 })).toBe(0.2);
  });
});

describe("getBuildHoverHighlightId", () => {
  it("lights the building the button adds when the player already has one", () => {
    const owned = { woodenHut: 8, stoneHut: 2, furTents: 1, longhouse: 0, cabin: 1 };
    expect(getBuildHoverHighlightId("woodenHut", owned)).toBe("woodenHut");
    expect(getBuildHoverHighlightId("stoneHut", owned)).toBe("stoneHut");
    expect(getBuildHoverHighlightId("furTents", owned)).toBe("furTents");
    expect(getBuildHoverHighlightId("longhouse", owned)).toBeNull();
    expect(getBuildHoverHighlightId("cabin", owned)).toBe("cabin");
  });

  it("lights the building an upgrade replaces when the new one is not built yet", () => {
    expect(
      getBuildHoverHighlightId("storehouse", { supplyHut: 1, storehouse: 0 }),
    ).toBe("supplyHut");
    expect(
      getBuildHoverHighlightId("storehouse", { supplyHut: 1, storehouse: 1 }),
    ).toBe("storehouse");
  });
});

describe("wolfAttack", () => {
  const wolf = villageAttackEvents.wolfAttack;

  it("starts at 4 wooden huts and stops after Alpha's Hide", () => {
    const populated = {
      villagers: { free: 11 },
      clothing: { alphas_hide: false },
    };
    expect(
      wolf.condition({
        ...populated,
        buildings: { woodenHut: 4 },
      } as never),
    ).toBe(true);
    expect(
      wolf.condition({
        ...populated,
        buildings: { woodenHut: 3 },
      } as never),
    ).toBe(false);
    expect(
      wolf.condition({
        ...populated,
        buildings: { woodenHut: 4 },
        clothing: { alphas_hide: true },
      } as never),
    ).toBe(false);
  });

  it("uses 45 minute cadence and 0.75 cooldown", () => {
    expect(wolf.timeProbability).toBe(45);
    expect(wolf.cooldownPercent).toBe(0.75);
  });
});

describe("cannibalRaid", () => {
  const raid = villageAttackEvents.cannibalRaid;

  it("starts at 8 wooden huts after Alpha's Hide and stops after victory", () => {
    const populated = {
      villagers: { free: 11 },
      clothing: { alphas_hide: true },
      story: { seen: {} },
    };
    expect(
      raid.condition({
        ...populated,
        buildings: { woodenHut: 8 },
      } as never),
    ).toBe(true);
    expect(
      raid.condition({
        ...populated,
        buildings: { woodenHut: 7 },
      } as never),
    ).toBe(false);
    expect(
      raid.condition({
        ...populated,
        buildings: { woodenHut: 8 },
        clothing: { alphas_hide: false },
      } as never),
    ).toBe(false);
    expect(
      raid.condition({
        ...populated,
        buildings: { woodenHut: 8 },
        story: { seen: { cannibalRaidVictory: true } },
      } as never),
    ).toBe(false);
  });

  it("uses 40 minute cadence and 0.75 cooldown", () => {
    expect(raid.timeProbability).toBe(40);
    expect(raid.cooldownPercent).toBe(0.75);
  });
});
