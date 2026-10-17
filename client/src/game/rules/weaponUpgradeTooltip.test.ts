import { describe, expect, it } from "vitest";
import {
  getWeaponInheritedUnlockLines,
  getWeaponUpgradeHighlightId,
  getWeaponUpgradeLevelSections,
  getWeaponUpgradeMarginalEffectLines,
} from "./weaponUpgradeTooltip";

describe("weapon upgrade tooltips", () => {
  it("leaves the first bow and sword as a single tier", () => {
    expect(getWeaponUpgradeHighlightId("crude_bow")).toBeNull();
    expect(getWeaponUpgradeHighlightId("iron_sword")).toBeNull();
    expect(getWeaponUpgradeMarginalEffectLines("crude_bow")).toEqual([]);
    expect(getWeaponUpgradeLevelSections("iron_sword")).toEqual([]);
  });

  it("shows only the changed hunt lines for the next bow", () => {
    expect(getWeaponUpgradeHighlightId("huntsman_bow")).toBe("crude_bow");
    expect(getWeaponUpgradeMarginalEffectLines("huntsman_bow")).toEqual([
      "Strength: +2",
      "Hunt: +50% Bonus",
      "Hunt: -1s Duration",
    ]);
    expect(getWeaponInheritedUnlockLines("huntsman_bow")).toEqual([
      "Unlocks Forest",
    ]);
    expect(getWeaponUpgradeLevelSections("huntsman_bow")).toEqual([
      {
        level: 1,
        label: "Crude Bow",
        effects: [
          "Strength: +1",
          "Hunt: +25% Bonus",
          "Hunt: -0.5s Duration",
          "Unlocks Forest",
        ],
      },
    ]);
  });

  it("labels earlier swords and keeps absolute strength", () => {
    expect(getWeaponUpgradeHighlightId("steel_sword")).toBe("iron_sword");
    expect(getWeaponUpgradeMarginalEffectLines("steel_sword")).toEqual([
      "Strength: +5",
    ]);
    expect(getWeaponUpgradeLevelSections("blacksteel_sword").map((section) => section.label)).toEqual([
      "Adamant Sword",
      "Obsidian Sword",
      "Steel Sword",
      "Iron Sword",
    ]);
    expect(getWeaponUpgradeLevelSections("blacksteel_sword").map((section) => section.effects)).toEqual([
      ["Strength: +12"],
      ["Strength: +8"],
      ["Strength: +5"],
      ["Strength: +3"],
    ]);
  });

  it("treats the iron axe as an upgrade of the stone axe", () => {
    expect(getWeaponUpgradeHighlightId("stone_axe")).toBeNull();
    expect(getWeaponUpgradeHighlightId("iron_axe")).toBe("stone_axe");
    expect(getWeaponUpgradeMarginalEffectLines("iron_axe")).toEqual([
      "Chop Wood: +100% Bonus",
      "Chop Wood: -0.5s Duration",
    ]);
    expect(getWeaponInheritedUnlockLines("iron_axe")).toEqual([
      "Unlocks Village",
    ]);
    expect(getWeaponUpgradeLevelSections("iron_axe")).toEqual([
      {
        level: 1,
        label: "Stone Axe",
        effects: [
          "Chop Wood: +50% Bonus",
          "Chop Wood: -0.25s Duration",
          "Unlocks Village",
        ],
      },
    ]);
  });

  it("omits an unchanged pickaxe duration from the upgrade lines", () => {
    expect(getWeaponUpgradeHighlightId("iron_pickaxe")).toBe("stone_pickaxe");
    expect(getWeaponUpgradeMarginalEffectLines("iron_pickaxe")).toEqual([
      "Mining: +50% Bonus",
    ]);
    expect(getWeaponUpgradeHighlightId("natharit_pickaxe")).toBeNull();
  });

  it("treats the hunter cloak as an upgrade of the fur cloak", () => {
    expect(getWeaponUpgradeHighlightId("fur_cloak")).toBeNull();
    expect(getWeaponUpgradeHighlightId("hunter_cloak")).toBe("fur_cloak");
    expect(getWeaponUpgradeMarginalEffectLines("hunter_cloak")).toEqual([
      "Hunt: +50% Bonus",
      "Hunt: -0.5s Duration",
    ]);
    expect(getWeaponUpgradeLevelSections("hunter_cloak")).toEqual([
      {
        level: 1,
        label: "Fur Cloak",
        effects: ["Hunt: +25% Bonus", "Hunt: -0.25s Duration"],
      },
    ]);
  });

  it("starts the lantern chain at the iron lantern", () => {
    expect(getWeaponUpgradeHighlightId("iron_lantern")).toBeNull();
    expect(getWeaponUpgradeHighlightId("steel_lantern")).toBe("iron_lantern");
    expect(getWeaponUpgradeMarginalEffectLines("steel_lantern")).toEqual([
      "Mining: +50% Bonus",
      "Mining: -1.5s Duration",
      "Cave Explore: +50% Bonus",
      "Torch cost: -2",
    ]);
  });
});
