import { FELLOWSHIP_MEMBER_ORDER, gameStateSchema } from "@shared/schema";
import {
  shouldExcludeFromBuildingsSection,
  shouldHideBuilding,
} from "@/game/buildingHierarchy";
import { COMBAT_ITEM_RESOURCES } from "@/game/resourceLimits";
import {
  ATTACK_WAVE_IDS,
  type AttackWaveId,
} from "@/game/rules/attackWaveOrder";
import { getAttackWavesChartRows } from "@/game/rules/eventsAttackWaves";
import { cubeEvents } from "@/game/rules/eventsCube";
import { shouldShowDisplayTool } from "@/game/sidePanelModel";
import { isPresetSlotUnlocked } from "@/game/villagerJobPresets";
import type { GameState } from "@shared/schema";

const defaultGameState = gameStateSchema.parse({});

export const DEMO_END_RESOURCE_IDS = Object.keys(
  defaultGameState.resources,
).filter(
  (key) => !COMBAT_ITEM_RESOURCES.includes(key as (typeof COMBAT_ITEM_RESOURCES)[number]),
);

export const DEMO_END_COMBAT_ITEM_IDS = [...COMBAT_ITEM_RESOURCES];

export const DEMO_END_WEAPON_IDS = Object.keys(defaultGameState.weapons);

const weaponKeySet = new Set(DEMO_END_WEAPON_IDS);

export const DEMO_END_CLOTHING_IDS = Object.keys(defaultGameState.clothing);
export const DEMO_END_RELIC_IDS = Object.keys(defaultGameState.relics);
export const DEMO_END_BOOK_IDS = Object.keys(defaultGameState.books);
export const DEMO_END_FELLOWSHIP_IDS = [...FELLOWSHIP_MEMBER_ORDER];
export const DEMO_END_SCHEMATIC_IDS = Object.keys(defaultGameState.schematics);
export const DEMO_END_BLESSING_IDS = Object.keys(
  defaultGameState.blessings,
).filter((key) => !key.endsWith("_enhanced"));
export const DEMO_END_FORTIFICATION_IDS = [
  "bastion",
  "watchtower",
  "palisades",
  "fortifiedMoat",
  "chitinPlating",
] as const;
export const DEMO_END_BASTION_STAT_IDS = [
  "bastion-attack",
  "bastion-defense",
  "bastion-integrity",
] as const;
export const DEMO_END_STAT_IDS = [
  "luck",
  "strength",
  "knowledge",
  "madness",
] as const;
/** Estate skill tracks, in panel order. Includes Crow's Eye (premium). */
export const DEMO_END_ESTATE_SKILL_IDS = [
  "hunting",
  "crushingStrike",
  "bloodflameSphere",
  "feralHowl",
  "crowsEye",
  "disgracedPrior",
  "chainmaster",
] as const;

export type DemoEndEstateSkillId = (typeof DEMO_END_ESTATE_SKILL_IDS)[number];

/** Village Produce jobs, in panel order. Gatherer is always shown once villagers exist. */
export const DEMO_END_VILLAGE_JOB_IDS = [
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
] as const;

export type DemoEndVillageJobId = (typeof DEMO_END_VILLAGE_JOB_IDS)[number];

/** Village top-row actions, in panel order. */
export const DEMO_END_VILLAGE_UTILITY_ACTION_IDS = [
  "feedFire",
  "callMerchant",
  "invest",
] as const;

export type DemoEndVillageUtilityActionId =
  (typeof DEMO_END_VILLAGE_UTILITY_ACTION_IDS)[number];

/** Produce-header preset slots, in UI order (1–5). Matches `MAX_PRESET_SLOTS`. */
export const DEMO_END_VILLAGE_PRESET_SLOT_IDS = [1, 2, 3, 4, 5] as const;

export type DemoEndVillagePresetSlotId =
  (typeof DEMO_END_VILLAGE_PRESET_SLOT_IDS)[number];

/** How many locked Build / Craft / Sacrifice actions to tease before an ellipsis. */
export const DEMO_END_ACTION_TEASER_COUNT = 5;

/** First N hidden actions, plus whether more remain after the teaser. */
export function getDemoEndHiddenActionTeasers<T extends { id: string }>(
  actions: readonly T[],
  visibleIds: ReadonlySet<string>,
  limit = DEMO_END_ACTION_TEASER_COUNT,
): { teasers: T[]; showEllipsis: boolean } {
  const hidden = actions.filter((action) => !visibleIds.has(action.id));
  return {
    teasers: hidden.slice(0, limit),
    showEllipsis: hidden.length > limit,
  };
}

export function isDemoEndVillagePresetSlotRevealed(
  state: Pick<
    GameState,
    "buildings" | "villagerPresetsPurchased" | "villagerPresetSlotsFromShop"
  >,
  slot: DemoEndVillagePresetSlotId,
): boolean {
  return isPresetSlotUnlocked(state, slot - 1);
}

export function isDemoEndVillageUtilityRevealed(
  state: Pick<GameState, "buildings">,
  id: DemoEndVillageUtilityActionId,
): boolean {
  switch (id) {
    case "feedFire":
      return state.buildings.heartfire > 0;
    case "callMerchant":
      return (state.buildings.tradePost ?? 0) >= 1;
    case "invest":
      return (state.buildings.coinhouse ?? 0) >= 1;
  }
}

export function isDemoEndVillageJobRevealed(
  state: Pick<GameState, "buildings" | "story">,
  id: DemoEndVillageJobId,
): boolean {
  switch (id) {
    case "gatherer":
      return true;
    case "hunter":
      return state.buildings.cabin > 0;
    case "iron_miner":
    case "coal_miner":
      return state.buildings.shallowPit >= 1;
    case "steel_forger":
      return state.buildings.foundry >= 1;
    case "blacksteel_forger":
      return state.buildings.masterworkFoundry >= 1;
    case "sulfur_miner":
      return state.buildings.deepeningPit >= 1;
    case "obsidian_miner":
      return state.buildings.deepPit >= 1;
    case "adamant_miner":
    case "moonstone_miner":
      return state.buildings.bottomlessPit >= 1;
    case "tanner":
      return state.buildings.tannery >= 1;
    case "powder_maker":
      return state.buildings.alchemistHall >= 1;
    case "ashfire_dust_maker":
      return state.story?.seen?.canMakeAshfireDust === true;
    case "scholar":
      return state.buildings.clerksHut > 0;
  }
}

/** Forest Buy trades, in panel order. */
export const DEMO_END_FOREST_BUY_TRADE_IDS = [
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
] as const;

/** Forest tribe canyon-bridge Sell trades, in panel order. */
export const DEMO_END_FOREST_TRIBE_TRADE_IDS = [
  "sellLeatherBatch",
  "sellSteelBatch",
  "sellBlacksteelBatch",
] as const;

/** Canonical chart waves, in Bastion order. Redacted on the Bastion chart at demo end. */
export const DEMO_END_ATTACK_WAVE_IDS = ATTACK_WAVE_IDS;

/** Heal actions shown on the Bastion tab, in panel order. */
export const DEMO_END_BASTION_HEAL_IDS = [
  "healRestlessKnight",
  "healElderWizard",
] as const;

export type DemoEndBastionHealId = (typeof DEMO_END_BASTION_HEAL_IDS)[number];

/** Repair actions shown on the Bastion tab, in panel order. */
export const DEMO_END_BASTION_REPAIR_IDS = [
  "repairBastion",
  "repairWatchtower",
  "repairPalisades",
] as const;

export type DemoEndBastionRepairId = (typeof DEMO_END_BASTION_REPAIR_IDS)[number];

export function isDemoEndBastionHealRevealed(
  state: Pick<GameState, "story" | "fellowship">,
  id: DemoEndBastionHealId,
): boolean {
  switch (id) {
    case "healRestlessKnight":
      return Boolean(
        state.story?.seen?.restlessKnightWounded &&
        state.fellowship?.restless_knight,
      );
    case "healElderWizard":
      return Boolean(
        state.story?.seen?.elderWizardWounded &&
        state.fellowship?.elder_wizard,
      );
  }
}

export function isDemoEndBastionRepairRevealed(
  state: Pick<GameState, "story" | "buildings">,
  id: DemoEndBastionRepairId,
): boolean {
  switch (id) {
    case "repairBastion":
      return Boolean(
        state.story?.seen?.bastionDamaged && state.buildings.bastion > 0,
      );
    case "repairWatchtower":
      return Boolean(
        state.story?.seen?.watchtowerDamaged && state.buildings.watchtower > 0,
      );
    case "repairPalisades":
      return Boolean(
        state.story?.seen?.palisadesDamaged && state.buildings.palisades > 0,
      );
  }
}

export type DemoEndAttackWaveId = AttackWaveId;

export function isDemoEndAttackWaveRevealed(
  state: Pick<GameState, "story" | "buildings" | "weapons">,
  id: DemoEndAttackWaveId,
): boolean {
  const row = getAttackWavesChartRows(state).find((wave) => wave.id === id);
  return Boolean(row?.completed || row?.conditionMet);
}

/** Whispering cube events, in story order. Includes cruel-only endings. */
export const DEMO_END_CUBE_EVENT_IDS = Object.keys(cubeEvents);

export function isDemoEndCubeEventCompleted(
  state: Pick<GameState, "events" | "relics">,
  id: string,
): boolean {
  if (id === "cubeDiscovery") {
    return state.relics.whispering_cube === true;
  }
  const baseEventId = id.replace(/[a-z]$/, "");
  return state.events[id] === true || state.events[baseEventId] === true;
}

export function isDemoEndEstateSkillUnlocked(
  state: GameState,
  id: DemoEndEstateSkillId,
): boolean {
  switch (id) {
    case "hunting":
      return state.fellowship.ashwraith_huntress === true;
    case "crushingStrike":
      return state.fellowship.restless_knight === true;
    case "bloodflameSphere":
      return state.fellowship.elder_wizard === true;
    case "feralHowl":
      return state.fellowship.the_hound === true;
    case "crowsEye":
      return state.fellowship.one_eyed_crow === true;
    case "disgracedPrior":
      return state.fellowship.disgraced_prior === true;
    case "chainmaster":
      return state.books.book_of_chainmaster === true;
  }
}

export const DEMO_END_EXTRA_BONUS_IDS = [
  "craftingCostReduction",
  "buildingCostReduction",
  "buildingTimeReduction",
  "villagerProductionBonus",
  "doubleGainChance",
] as const;

export function getDemoEndToolCatalogIds(state: GameState): string[] {
  return Object.keys(defaultGameState.tools).filter(
    (key) => !weaponKeySet.has(key) && shouldShowDisplayTool(key, state),
  );
}

export function getDemoEndBuildingCatalogIds(state: GameState): string[] {
  const buildings = state.buildings as Record<string, number>;
  return Object.keys(defaultGameState.buildings).filter((key) => {
    if (shouldExcludeFromBuildingsSection(key)) return false;
    return !shouldHideBuilding(key, buildings);
  });
}

export function getDemoEndSchematicCatalogIds(state: GameState): string[] {
  return DEMO_END_SCHEMATIC_IDS.filter((key) => {
    const craftedKey = key.replace("_schematic", "");
    if (state.weapons[craftedKey as keyof typeof state.weapons]) return false;
    if (state.tools[craftedKey as keyof typeof state.tools]) return false;
    if (state.clothing[craftedKey as keyof typeof state.clothing]) return false;
    if (state.relics[craftedKey as keyof typeof state.relics]) return false;
    return true;
  });
}

export function appendRedactedCatalogIds(
  ownedIds: readonly string[],
  catalogIds: readonly string[],
): Array<{ id: string; redacted: boolean }> {
  const seen = new Set<string>();
  const out: Array<{ id: string; redacted: boolean }> = [];
  for (const id of ownedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, redacted: false });
  }
  for (const id of catalogIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ id, redacted: true });
  }
  return out;
}

export function appendRedactedItems<T extends { id: string; redacted?: boolean }>(
  ownedItems: T[],
  catalogIds: readonly string[],
  makeRedacted: (id: string) => T,
): T[] {
  const have = new Set(ownedItems.map((item) => item.id));
  const extra = catalogIds
    .filter((id) => !have.has(id))
    .map((id) => ({ ...makeRedacted(id), redacted: true as const }));
  return [...ownedItems, ...extra];
}
