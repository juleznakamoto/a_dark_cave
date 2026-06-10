import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { GameState } from "@shared/schema";
import { createInitialState, useGameStore } from "@/game/state";
import { calculateTotalEffects } from "@/game/rules/effectsCalculation";
import { villageBuildActions } from "@/game/rules/villageBuildActions";
import { SUPPORTED_LOCALES } from "@/i18n/locales";
import { parseLocaleJson } from "../../../scripts/parse-locale-json.mjs";
import {
  canEnchantWeapon,
  getMaxEnchantLevel,
  getNextEnchantCost,
  getPoisonArrowsDotFightRounds,
  getWeaponEnchantBonus,
  getWeaponEnchantLevel,
  isWeaponEnchantable,
  isWeaponEnchantUnlocked,
} from "./weaponEnchantments";

function stateWithWeapon(
  weaponId: string,
  level: number,
): GameState {
  const state = createInitialState();
  (state.weapons as Record<string, boolean>)[weaponId] = true;
  state.weaponEnchantments = { [weaponId]: level };
  return state;
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    buildings: { clerksHut: 1, inkwardenAcademy: 1 },
    weapons: {
      blacksteel_sword: true,
      nightshade_bow: true,
      bloodstone_staff: true,
    },
    weaponEnchantments: {},
    resources: { insight: 5000 },
    ...overrides,
  } as unknown as GameState;
}

describe("weaponEnchantments", () => {
  it("limits generic weapons to one level and Nightshade Bow to two", () => {
    expect(getMaxEnchantLevel("blacksteel_sword")).toBe(1);
    expect(getMaxEnchantLevel("nightshade_bow")).toBe(2);
    expect(getMaxEnchantLevel("adamant_sword")).toBe(0);
    expect(getMaxEnchantLevel("master_bow")).toBe(0);
  });

  it("allows enchanting only blacksteel among tiered bows and swords", () => {
    expect(isWeaponEnchantable("blacksteel_bow")).toBe(true);
    expect(isWeaponEnchantable("blacksteel_sword")).toBe(true);
    expect(isWeaponEnchantable("master_bow")).toBe(false);
    expect(isWeaponEnchantable("adamant_sword")).toBe(false);
    expect(isWeaponEnchantable("iron_sword")).toBe(false);
    expect(isWeaponEnchantable("crude_bow")).toBe(false);
    // Non-hierarchical weapons remain enchantable.
    expect(isWeaponEnchantable("nightshade_bow")).toBe(true);
    expect(isWeaponEnchantable("stormglass_halberd")).toBe(true);
  });

  it("unlocks only once the Tomewarden Academy is built", () => {
    expect(isWeaponEnchantUnlocked(baseState())).toBe(true);
    expect(
      isWeaponEnchantUnlocked(
        baseState({ buildings: { inkwardenAcademy: 0 } as GameState["buildings"] }),
      ),
    ).toBe(false);
  });

  it("derives generic enchant bonus as base 1 plus 1 per full 10 of the stat", () => {
    const state = baseState({ weaponEnchantments: { blacksteel_sword: 1 } });
    // Blacksteel Sword has +18 Strength -> 1 + floor(18/10) = 2
    const bonus = getWeaponEnchantBonus(state, "blacksteel_sword");
    expect(bonus.enchantStrength).toBe(2);
    expect(bonus.enchantKnowledge).toBe(0);
    expect(bonus.baseStrength).toBe(0);
  });

  it("ignores stored enchant levels on non-enchantable tier weapons", () => {
    const state = baseState({ weaponEnchantments: { adamant_sword: 1 } });
    expect(getWeaponEnchantBonus(state, "adamant_sword").enchantStrength).toBe(0);
    expect(getNextEnchantCost(state, "adamant_sword")).toBeNull();
    expect(canEnchantWeapon(state, "adamant_sword")).toBe(false);
  });

  it("enchants both Strength and Knowledge when the weapon has both", () => {
    // Bloodstone Staff: +10 Strength (->2), +25 Knowledge (->3)
    const enchanted = baseState({ weaponEnchantments: { bloodstone_staff: 1 } });
    const bonus = getWeaponEnchantBonus(enchanted, "bloodstone_staff");
    expect(bonus.enchantStrength).toBe(2);
    expect(bonus.enchantKnowledge).toBe(3);
    // Cost = (2 + 3) * 250
    expect(getNextEnchantCost(baseState(), "bloodstone_staff")).toBe(1250);
  });

  it("prices generic enchant at 250 per added stat point", () => {
    // Blacksteel Sword adds +2 Strength -> 2 * 250 = 500
    expect(getNextEnchantCost(baseState(), "blacksteel_sword")).toBe(500);
  });

  it("applies the Nightshade Bow two-level table", () => {
    const base = baseState();
    expect(getNextEnchantCost(base, "nightshade_bow")).toBe(1000);

    const lvl1 = baseState({ weaponEnchantments: { nightshade_bow: 1 } });
    const bonus1 = getWeaponEnchantBonus(lvl1, "nightshade_bow");
    expect(bonus1.baseStrength).toBe(5);
    expect(bonus1.enchantStrength).toBe(2);
    expect(bonus1.poisonRounds).toBe(0);
    expect(getNextEnchantCost(lvl1, "nightshade_bow")).toBe(2000);

    const lvl2 = baseState({ weaponEnchantments: { nightshade_bow: 2 } });
    const bonus2 = getWeaponEnchantBonus(lvl2, "nightshade_bow");
    expect(bonus2.baseStrength).toBe(5);
    expect(bonus2.enchantStrength).toBe(5); // 2 + 3
    expect(bonus2.poisonRounds).toBe(1);
    // Fully enchanted -> no further level
    expect(getNextEnchantCost(lvl2, "nightshade_bow")).toBeNull();
    expect(getWeaponEnchantLevel(lvl2, "nightshade_bow")).toBe(2);
  });

  it("adds the Nightshade poison round only at level 2", () => {
    expect(getPoisonArrowsDotFightRounds(baseState())).toBe(2);
    expect(
      getPoisonArrowsDotFightRounds(
        baseState({ weaponEnchantments: { nightshade_bow: 1 } }),
      ),
    ).toBe(2);
    expect(
      getPoisonArrowsDotFightRounds(
        baseState({ weaponEnchantments: { nightshade_bow: 2 } }),
      ),
    ).toBe(3);
  });

  it("gates enchanting on unlock, ownership, max level, and affordability", () => {
    expect(canEnchantWeapon(baseState(), "blacksteel_sword")).toBe(true);

    const locked = baseState({
      buildings: { clerksHut: 1, inkwardenAcademy: 0 } as GameState["buildings"],
    });
    expect(canEnchantWeapon(locked, "blacksteel_sword")).toBe(false);

    const unowned = baseState({
      weapons: { blacksteel_sword: false } as GameState["weapons"],
    });
    expect(canEnchantWeapon(unowned, "blacksteel_sword")).toBe(false);

    const poor = baseState({ resources: { insight: 10 } as GameState["resources"] });
    expect(canEnchantWeapon(poor, "blacksteel_sword")).toBe(false);

    const maxed = baseState({ weaponEnchantments: { nightshade_bow: 2 } });
    expect(canEnchantWeapon(maxed, "nightshade_bow")).toBe(false);
  });

  it("enchantWeapon spends insight and increments the weapon level", () => {
    useGameStore.getState().initialize(
      baseState({
        weaponEnchantments: {},
        resources: { insight: 5000 } as GameState["resources"],
      }) as Partial<GameState>,
    );

    const ok = useGameStore.getState().enchantWeapon("nightshade_bow");
    expect(ok).toBe(true);

    const next = useGameStore.getState();
    expect(next.weaponEnchantments?.nightshade_bow).toBe(1);
    expect(next.resources.insight).toBe(4000); // 5000 - 1000
  });
});

describe("weaponEnchantments — total effects integration", () => {
  it("adds the generic enchant Strength to total stat bonuses", () => {
    const before = calculateTotalEffects(stateWithWeapon("blacksteel_sword", 0));
    const after = calculateTotalEffects(stateWithWeapon("blacksteel_sword", 1));
    // Blacksteel Sword (+18 base) gains +2 Strength from enchanting.
    expect(after.statBonuses.strength - before.statBonuses.strength).toBe(2);
    expect(after.statBonuses.knowledge - before.statBonuses.knowledge).toBe(0);
  });

  it("does not apply enchant bonuses to lower-tier swords in saves", () => {
    const before = calculateTotalEffects(stateWithWeapon("adamant_sword", 0));
    const after = calculateTotalEffects(stateWithWeapon("adamant_sword", 1));
    expect(after.statBonuses.strength - before.statBonuses.strength).toBe(0);
  });

  it("adds both Strength and Knowledge for dual-stat weapons", () => {
    const before = calculateTotalEffects(stateWithWeapon("bloodstone_staff", 0));
    const after = calculateTotalEffects(stateWithWeapon("bloodstone_staff", 1));
    // Bloodstone Staff: +10 Str (->2), +25 Kn (->3).
    expect(after.statBonuses.strength - before.statBonuses.strength).toBe(2);
    expect(after.statBonuses.knowledge - before.statBonuses.knowledge).toBe(3);
  });

  it("stacks Nightshade base + enchant Strength across both levels", () => {
    const lvl0 = calculateTotalEffects(stateWithWeapon("nightshade_bow", 0));
    const lvl1 = calculateTotalEffects(stateWithWeapon("nightshade_bow", 1));
    const lvl2 = calculateTotalEffects(stateWithWeapon("nightshade_bow", 2));
    // L1: +5 base +2 enchant = +7; L2: +5 base +5 enchant = +10.
    expect(lvl1.statBonuses.strength - lvl0.statBonuses.strength).toBe(7);
    expect(lvl2.statBonuses.strength - lvl0.statBonuses.strength).toBe(10);
  });
});

describe("Tomewarden Academy tooltip", () => {
  it("lists Weapon Enhancement as a build effect", () => {
    const academy = villageBuildActions.buildInkwardenAcademy;
    const keys = (academy.tooltipEffects ?? []).map((e) => e.key);
    expect(keys).toContain("weaponEnhancement");
  });
});

describe("weaponEnchantments — i18n parity", () => {
  it("defines enchant tooltip keys in every supported language", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const path = `client/src/i18n/locales/${locale}/ui/tooltips.json`;
      const json = parseLocaleJson(fs.readFileSync(path, "utf8")) as {
        tooltips?: {
          enchantForInsight?: string;
          buildings?: { weaponEnhancement?: string };
        };
      };
      expect(
        json.tooltips?.enchantForInsight,
        `enchantForInsight missing in ${locale}`,
      ).toBeTruthy();
      expect(
        json.tooltips?.poisonEnchantRound_one,
        `poisonEnchantRound_one missing in ${locale}`,
      ).toBeTruthy();
      expect(
        json.tooltips?.buildings?.weaponEnhancement,
        `buildings.weaponEnhancement missing in ${locale}`,
      ).toBeTruthy();
    }
  });
});
