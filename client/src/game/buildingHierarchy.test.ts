import { describe, expect, it } from "vitest";
import { getTrapLevel, getTrapWinChanceBonus } from "./buildingHierarchy";
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
