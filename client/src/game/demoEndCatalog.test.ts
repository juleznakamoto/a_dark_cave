import { describe, expect, it } from "vitest";
import { gameStateSchema } from "@shared/schema";
import {
  appendRedactedCatalogIds,
  appendRedactedItems,
  DEMO_END_ATTACK_WAVE_IDS,
  DEMO_END_BASTION_HEAL_IDS,
  DEMO_END_BASTION_REPAIR_IDS,
  DEMO_END_BLESSING_IDS,
  DEMO_END_BOOK_IDS,
  DEMO_END_CUBE_EVENT_IDS,
  DEMO_END_ESTATE_SKILL_IDS,
  DEMO_END_FOREST_BUY_TRADE_IDS,
  DEMO_END_FOREST_TRIBE_TRADE_IDS,
  DEMO_END_VILLAGE_JOB_IDS,
  DEMO_END_VILLAGE_PRESET_SLOT_IDS,
  DEMO_END_VILLAGE_UTILITY_ACTION_IDS,
  DEMO_END_ACTION_TEASER_COUNT,
  getDemoEndBuildingCatalogIds,
  getDemoEndHiddenActionTeasers,
  isDemoEndAttackWaveRevealed,
  isDemoEndBastionHealRevealed,
  isDemoEndBastionRepairRevealed,
  isDemoEndCubeEventCompleted,
  isDemoEndEstateSkillUnlocked,
  isDemoEndVillageJobRevealed,
  isDemoEndVillagePresetSlotRevealed,
  isDemoEndVillageUtilityRevealed,
} from "./demoEndCatalog";
import { MAX_PRESET_SLOTS } from "./villagerJobPresets";

describe("demoEndCatalog", () => {
  it("lists owned ids first, then remaining catalog as redacted", () => {
    expect(appendRedactedCatalogIds(["wood"], ["wood", "stone", "iron"])).toEqual([
      { id: "wood", redacted: false },
      { id: "stone", redacted: true },
      { id: "iron", redacted: true },
    ]);
  });

  it("appends redacted rows onto existing side-panel items", () => {
    const items = appendRedactedItems(
      [{ id: "stone_axe", label: "Stone Axe" }],
      ["stone_axe", "iron_axe"],
      (id) => ({ id, label: id }),
    );
    expect(items).toEqual([
      { id: "stone_axe", label: "Stone Axe" },
      { id: "iron_axe", label: "iron_axe", redacted: true },
    ]);
  });

  it("omits enhanced blessing keys and includes books", () => {
    expect(DEMO_END_BLESSING_IDS.every((id) => !id.endsWith("_enhanced"))).toBe(
      true,
    );
    expect(DEMO_END_BOOK_IDS).toContain("book_of_trials");
  });

  it("lists every estate skill track and unlocks from fellowship / book", () => {
    expect(DEMO_END_ESTATE_SKILL_IDS).toEqual([
      "hunting",
      "crushingStrike",
      "bloodflameSphere",
      "feralHowl",
      "crowsEye",
      "disgracedPrior",
      "chainmaster",
    ]);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndEstateSkillUnlocked(locked, "hunting")).toBe(false);
    const unlocked = gameStateSchema.parse({
      fellowship: { ashwraith_huntress: true },
      books: { book_of_chainmaster: true },
    });
    expect(isDemoEndEstateSkillUnlocked(unlocked, "hunting")).toBe(true);
    expect(isDemoEndEstateSkillUnlocked(unlocked, "chainmaster")).toBe(true);
    expect(isDemoEndEstateSkillUnlocked(unlocked, "crowsEye")).toBe(false);
  });

  it("lists every forest buy trade and forest tribe sell trade", () => {
    expect(DEMO_END_FOREST_BUY_TRADE_IDS).toEqual([
      "tradeGoldForFood",
      "tradeGoldForWood",
      "tradeGoldForStone",
      "tradeGoldForIron",
      "tradeGoldForLeather",
      "tradeGoldForSteel",
      "tradeGoldForObsidian",
      "tradeGoldForAdamant",
      "tradeGoldForBlacksteel",
      "tradeGoldForTorch",
      "tradeGoldForEmberBomb",
      "tradeGoldForAshfireBomb",
      "tradeGoldForVoidBomb",
      "tradeGoldForVeinfireElixir",
      "tradeGoldForInsightPotion",
      "tradeSilverForGold",
    ]);
    expect(DEMO_END_FOREST_TRIBE_TRADE_IDS).toEqual([
      "sellLeatherBatch",
      "sellSteelBatch",
      "sellBlacksteelBatch",
    ]);
  });

  it("teases the first five hidden actions and marks leftover with an ellipsis", () => {
    expect(DEMO_END_ACTION_TEASER_COUNT).toBe(5);
    const actions = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: `a${n}` }));
    expect(
      getDemoEndHiddenActionTeasers(actions, new Set(["a1", "a2"])),
    ).toEqual({
      teasers: [{ id: "a3" }, { id: "a4" }, { id: "a5" }, { id: "a6" }, { id: "a7" }],
      showEllipsis: false,
    });
    expect(getDemoEndHiddenActionTeasers(actions, new Set())).toEqual({
      teasers: [{ id: "a1" }, { id: "a2" }, { id: "a3" }, { id: "a4" }, { id: "a5" }],
      showEllipsis: true,
    });
  });

  it("lists every village preset slot and reveals after Insight purchase", () => {
    expect(DEMO_END_VILLAGE_PRESET_SLOT_IDS).toEqual([1, 2, 3, 4, 5]);
    expect(DEMO_END_VILLAGE_PRESET_SLOT_IDS).toHaveLength(MAX_PRESET_SLOTS);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndVillagePresetSlotRevealed(locked, 1)).toBe(false);
    const officeBought = gameStateSchema.parse({
      buildings: { scribesOffice: 1 },
      villagerPresetsPurchased: 1,
    });
    expect(isDemoEndVillagePresetSlotRevealed(officeBought, 1)).toBe(true);
    expect(isDemoEndVillagePresetSlotRevealed(officeBought, 2)).toBe(false);
  });

  it("lists village utility actions and reveals from buildings", () => {
    expect(DEMO_END_VILLAGE_UTILITY_ACTION_IDS).toEqual([
      "feedFire",
      "callMerchant",
      "invest",
    ]);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndVillageUtilityRevealed(locked, "feedFire")).toBe(false);
    expect(isDemoEndVillageUtilityRevealed(locked, "callMerchant")).toBe(false);
    expect(isDemoEndVillageUtilityRevealed(locked, "invest")).toBe(false);
    const unlocked = gameStateSchema.parse({
      buildings: { heartfire: 1, tradePost: 1, coinhouse: 1 },
    });
    expect(isDemoEndVillageUtilityRevealed(unlocked, "feedFire")).toBe(true);
    expect(isDemoEndVillageUtilityRevealed(unlocked, "callMerchant")).toBe(true);
    expect(isDemoEndVillageUtilityRevealed(unlocked, "invest")).toBe(true);
  });

  it("lists every village produce job and reveals from buildings / story flags", () => {
    expect(DEMO_END_VILLAGE_JOB_IDS).toEqual([
      "gatherer",
      "hunter",
      "iron_miner",
      "coal_miner",
      "steel_forger",
      "blacksteel_forger",
      "sulfur_miner",
      "obsidian_miner",
      "adamant_miner",
      "moonstone_miner",
      "tanner",
      "powder_maker",
      "ashfire_dust_maker",
      "scholar",
    ]);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndVillageJobRevealed(locked, "gatherer")).toBe(true);
    expect(isDemoEndVillageJobRevealed(locked, "hunter")).toBe(false);
    expect(isDemoEndVillageJobRevealed(locked, "iron_miner")).toBe(false);
    const cabin = gameStateSchema.parse({
      buildings: { cabin: 1, shallowPit: 1 },
    });
    expect(isDemoEndVillageJobRevealed(cabin, "hunter")).toBe(true);
    expect(isDemoEndVillageJobRevealed(cabin, "iron_miner")).toBe(true);
    expect(isDemoEndVillageJobRevealed(cabin, "scholar")).toBe(false);
    const ashfire = gameStateSchema.parse({
      story: { seen: { canMakeAshfireDust: true } },
    });
    expect(isDemoEndVillageJobRevealed(ashfire, "ashfire_dust_maker")).toBe(
      true,
    );
  });

  it("lists every bastion heal and repair action and reveals from story flags", () => {
    expect(DEMO_END_BASTION_HEAL_IDS).toEqual([
      "healRestlessKnight",
      "healElderWizard",
    ]);
    expect(DEMO_END_BASTION_REPAIR_IDS).toEqual([
      "repairBastion",
      "repairWatchtower",
      "repairPalisades",
    ]);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndBastionHealRevealed(locked, "healRestlessKnight")).toBe(
      false,
    );
    expect(isDemoEndBastionRepairRevealed(locked, "repairBastion")).toBe(false);
    const wounded = gameStateSchema.parse({
      fellowship: { restless_knight: true },
      story: { seen: { restlessKnightWounded: true, bastionDamaged: true } },
      buildings: { bastion: 1 },
    });
    expect(isDemoEndBastionHealRevealed(wounded, "healRestlessKnight")).toBe(
      true,
    );
    expect(isDemoEndBastionHealRevealed(wounded, "healElderWizard")).toBe(false);
    expect(isDemoEndBastionRepairRevealed(wounded, "repairBastion")).toBe(true);
    expect(isDemoEndBastionRepairRevealed(wounded, "repairWatchtower")).toBe(
      false,
    );
  });

  it("lists every canonical attack wave and reveals after victory", () => {
    expect(DEMO_END_ATTACK_WAVE_IDS).toEqual([
      "firstWave",
      "secondWave",
      "thirdWave",
      "fourthWave",
      "fifthWave",
      "firstBossWave",
      "sixthWave",
      "seventhWave",
      "eighthWave",
      "ninthWave",
      "tenthWave",
      "secondBossWave",
    ]);
    const locked = gameStateSchema.parse({});
    expect(isDemoEndAttackWaveRevealed(locked, "firstWave")).toBe(false);
    const firstWon = gameStateSchema.parse({
      story: { seen: { firstWaveVictory: true } },
    });
    expect(isDemoEndAttackWaveRevealed(firstWon, "firstWave")).toBe(true);
    expect(isDemoEndAttackWaveRevealed(firstWon, "secondWave")).toBe(true);
    expect(isDemoEndAttackWaveRevealed(firstWon, "thirdWave")).toBe(false);
  });

  it("lists every whispering cube event and completes from relic / event flags", () => {
    expect(DEMO_END_CUBE_EVENT_IDS[0]).toBe("cubeDiscovery");
    expect(DEMO_END_CUBE_EVENT_IDS).toContain("cube01");
    expect(DEMO_END_CUBE_EVENT_IDS).toContain("cube16b");
    const locked = gameStateSchema.parse({});
    expect(isDemoEndCubeEventCompleted(locked, "cubeDiscovery")).toBe(false);
    expect(isDemoEndCubeEventCompleted(locked, "cube01")).toBe(false);
    const found = gameStateSchema.parse({
      relics: { whispering_cube: true },
      events: { cube01: true },
    });
    expect(isDemoEndCubeEventCompleted(found, "cubeDiscovery")).toBe(true);
    expect(isDemoEndCubeEventCompleted(found, "cube01")).toBe(true);
    expect(isDemoEndCubeEventCompleted(found, "cube02")).toBe(false);
  });

  it("keeps owned buildings and later catalog rows for demo-end", () => {
    const state = gameStateSchema.parse({
      buildings: { woodenHut: 3, darkEstate: 1 },
    });
    const ids = getDemoEndBuildingCatalogIds(state);
    expect(ids).toContain("woodenHut");
    expect(ids).toContain("darkEstate");
    expect(ids).not.toContain("bastion");
  });
});
