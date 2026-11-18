import {
  audioManager,
  SOUND_VOLUME,
  caveExploreVolume,
  PLAYBACK_RATE_STEP,
} from "@/lib/audio";
import { isCollectorTradeChoiceId } from "@/game/rules/eventsWanderingCollector";
/** Village build, hall repair, and bastion fortification repairs. */
export function isConstructAction(actionId: string): boolean {
  return (
    actionId.startsWith("build") ||
    actionId === "repairBastion" ||
    actionId === "repairWatchtower" ||
    actionId === "repairPalisades"
  );
}

const CAVE_EXPLORE_SOUND_ACTIONS = new Set([
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "lowChamber",
  "occultistChamber",
  "hiddenLibrary",
  "exploreUndergroundLake",
  "blastPortal",
  "encounterBeyondPortal",
]);

/** Forest trade post buy and sell buttons. */
const FOREST_TRADE_SOUND_ACTIONS = new Set([
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
  "tradeSilverForGold",
  "tradeGoldForEmberBomb",
  "tradeGoldForAshfireBomb",
  "tradeGoldForVoidBomb",
  "tradeGoldForVeinfireElixir",
  "tradeGoldForInsightPotion",
  "tradeGoldForBoneTotems",
  "tradeGoldForLeatherTotems",
  "sellLeatherBatch",
  "sellSteelBatch",
  "sellBlacksteelBatch",
]);

/**
 * One-off event choices that spend or take gold or silver.
 * Keyed by catalog event id. Food, villagers, and item handoffs stay off this list.
 * Merchant and the wandering collector are handled separately because their
 * choice ids are generated per visit.
 */
const PURCHASE_EVENT_CHOICES: Record<string, ReadonlySet<string>> = {
  blackenedMirror: new Set(["buyMirror"]),
  nordicWarAxe: new Set(["buyAxe"]),
  chainmasterCollector: new Set(["sellBook", "learnSecrets"]),
  cartographer: new Set(["accept"]),
  wanderingFirecrafter: new Set(["payGold", "paySilver"]),
  monasteryMonk: new Set(["payTribute"]),
  obsidianOrbVisit: new Set(["payGold"]),
  restlessKnight: new Set(["payGold"]),
  restlessKnightMountains: new Set(["payGold"]),
  restlessKnightCoast: new Set(["payGold"]),
  restlessKnightDesert: new Set(["payGold", "paySilver"]),
  witchsCurse: new Set(["payGold"]),
  mercenaryDemand: new Set(["payGold"]),
  mercenaryReturnDemand: new Set(["payGold"]),
  feast4: new Set(["makeGreatFeast"]),
  feast8: new Set(["makeGreatFeast"]),
};

export function playPurchaseSfx(): void {
  audioManager.playSound("purchase", SOUND_VOLUME.purchase);
}

/**
 * True when a resolved event choice is a goods purchase or sale.
 * Merchant only counts when the trade actually went through (`merchantTrades` on the result).
 */
export function shouldPlayPurchaseSfx(
  eventId: string,
  choiceId: string,
  changes: { merchantTrades?: unknown },
): boolean {
  const catalogId = eventId.split("-")[0] ?? eventId;
  if (catalogId === "merchant") {
    return changes.merchantTrades != null;
  }
  if (
    catalogId === "wandering_collector" &&
    isCollectorTradeChoiceId(choiceId)
  ) {
    return true;
  }
  if (catalogId.startsWith("boneDevourer") && choiceId === "sellBones") {
    return true;
  }
  return PURCHASE_EVENT_CHOICES[catalogId]?.has(choiceId) ?? false;
}

/** Mine section order under Cave. Each later ore plays the mining cue 2.5% slower. */
export const MINE_ACTION_ORDER = [
  "mineStone",
  "mineIron",
  "mineCoal",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
] as const;

export function miningPlaybackRate(actionId: string): number {
  const index = (MINE_ACTION_ORDER as readonly string[]).indexOf(actionId);
  if (index < 0) return 1;
  return 1 - index * PLAYBACK_RATE_STEP;
}

/** One-shot action cues that should fire when the player clicks, not when the bar finishes. */
export function playActionStartSfx(
  actionId: string,
  opts: { forestUnlocked: boolean; caveExploreLevel: number },
): void {
  if (FOREST_TRADE_SOUND_ACTIONS.has(actionId)) {
    playPurchaseSfx();
    return;
  }
  if (isConstructAction(actionId)) {
    audioManager.playSound(
      "buildingComplete",
      SOUND_VOLUME.buildingComplete,
    );
    return;
  }
  if (actionId.startsWith("craft")) {
    audioManager.playSound("craft", SOUND_VOLUME.craft);
    return;
  }
  if (actionId.startsWith("mine")) {
    audioManager.playSound(
      "mining",
      SOUND_VOLUME.mining,
      false,
      miningPlaybackRate(actionId),
    );
    return;
  }
  // chopWood is Gather Wood in the cave, Chop Wood once the forest is unlocked
  if (actionId === "chopWood") {
    if (opts.forestUnlocked) {
      audioManager.playSound("chopWood", SOUND_VOLUME.chopWood);
    } else {
      audioManager.playSound("gatherWood", SOUND_VOLUME.gatherWood);
    }
    return;
  }
  if (actionId === "hunt") {
    audioManager.playSound("hunt", SOUND_VOLUME.hunt);
    return;
  }
  if (CAVE_EXPLORE_SOUND_ACTIONS.has(actionId)) {
    audioManager.playSound(
      "caveExplore",
      caveExploreVolume(opts.caveExploreLevel),
    );
  }
}
