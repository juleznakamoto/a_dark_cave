import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import { hasVisibleVillagerBlockingAction } from "./villagerBlockingActions";

describe("hasVisibleVillagerBlockingAction", () => {
  it("stays false while only non-locking actions are visible", () => {
    const earlyVillage = {
      ...gameStateSchema.parse({
        flags: { forestUnlocked: true, villageUnlocked: true },
        buildings: { blacksmith: 1 },
        story: { seen: { hasVillagers: true, actionCraftTorch: true } },
      }),
      executionStartTimes: {},
    };
    expect(hasVisibleVillagerBlockingAction(earlyVillage)).toBe(false);
  });

  it("turns true when Descend Further appears", () => {
    const withIronLantern = {
      ...gameStateSchema.parse({
        tools: { iron_lantern: true },
        story: { seen: { hasVillagers: true } },
      }),
      executionStartTimes: {},
    };
    expect(hasVisibleVillagerBlockingAction(withIronLantern)).toBe(true);
  });

  it("stays true while a locking expedition is already running", () => {
    const running = {
      ...gameStateSchema.parse({}),
      executionStartTimes: { descendFurther: 1_700_000_000_000 },
    };
    expect(hasVisibleVillagerBlockingAction(running)).toBe(true);
  });
});
