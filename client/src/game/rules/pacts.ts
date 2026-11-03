import { isSteamDemoEditionActive } from "@/lib/edition";
import { PACTS_ENABLED } from "@/lib/featureFlags";

/** Web, portals, and the full Steam game. Off on the Steam demo and its DEV preview. */
export function arePactsEnabled(): boolean {
  return PACTS_ENABLED && !isSteamDemoEditionActive();
}

/** Opening pact offer for a new run, normal or Cruel Mode. Each chosen pact adds madness and its two boons. */
export const PACT_IDS = [
  "blazesmith",
  "full_larders",
  "sturdy_hands",
  "cunning_trader",
  "avid_apprentices",
] as const;

export type PactId = (typeof PACT_IDS)[number];

/** Ids from before the cards were renamed. They still select the same pacts. */
const LEGACY_PACT_IDS: Record<string, PactId> = {
  firecrafter: "blazesmith",
  crowded_graves: "full_larders",
  loud_omens: "sturdy_hands",
};

/** Most pacts one playthrough can offer. */
export const PACT_CHOICE_MAX = 5;

/** Madness added for each chosen pact. */
export const PACT_MADNESS = 3;

/** Madness from the pacts currently chosen. Unknown ids do not count. None while pacts are switched off. */
export function getPactMadness(ids: unknown): number {
  if (!arePactsEnabled()) return 0;
  return sanitizeChosenPacts(ids).length * PACT_MADNESS;
}

export function isPactId(id: string): id is PactId {
  return (PACT_IDS as readonly string[]).includes(id);
}

function resolvePactId(id: string): PactId | null {
  if (isPactId(id)) return id;
  return LEGACY_PACT_IDS[id] ?? null;
}

/** Missing or invalid values become 1. Never above the cap. */
export function clampPactChoices(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(PACT_CHOICE_MAX, Math.max(1, Math.floor(n)));
}

/**
 * Opening allowance for a loaded save.
 * A run starts with 1. Finished games already on the save add one each, up to 5.
 * A Cruel Mode finish grants two when that win is awarded. This backfill
 * cannot tell those wins apart, so a stored count that is already higher is kept.
 */
export function resolvePactChoicesFromSave(
  stored: unknown,
  completedGames: unknown,
): number {
  const wins = Math.max(0, Math.floor(Number(completedGames) || 0));
  const fromCompletions = Math.min(PACT_CHOICE_MAX, 1 + wins);
  return Math.max(clampPactChoices(stored), fromCompletions);
}

/** A finished game has earned the opening offer. This ignores the feature flag. */
export function hasEarnedPactOffer(completedGames: unknown): boolean {
  return Math.max(0, Math.floor(Number(completedGames) || 0)) > 0;
}

/**
 * The opening offer waits until at least one game has been finished,
 * and the pact system is switched on.
 */
export function shouldOpenPactOffer(completedGames: unknown): boolean {
  return arePactsEnabled() && hasEarnedPactOffer(completedGames);
}

/** New run: remember an earned offer, and open the dialog only while pacts are on. */
export function resolvePactOfferForNewRun(completedGames: unknown): {
  pactOfferPending: boolean;
  pactOfferDialogOpen: boolean;
} {
  const earned = hasEarnedPactOffer(completedGames);
  return {
    pactOfferPending: earned,
    pactOfferDialogOpen: arePactsEnabled() && earned,
  };
}

/**
 * Loaded save: open the dialog only while pacts are on.
 * A pending offer stays on the save so it can open after the flag is turned on.
 */
export function resolvePactOfferForLoad(
  completedGames: unknown,
  storedPending: boolean,
): { pactOfferPending: boolean; pactOfferDialogOpen: boolean } {
  const open = shouldOpenPactOffer(completedGames) && storedPending;
  return {
    pactOfferPending: arePactsEnabled() ? open : storedPending,
    pactOfferDialogOpen: open,
  };
}

/** A finished game grants one pact choice. Cruel Mode grants two. Starting over does not. */
export function grantPactChoiceForCompletedGame(
  current: unknown,
  cruelMode = false,
): number {
  const granted = cruelMode ? 2 : 1;
  return Math.min(PACT_CHOICE_MAX, clampPactChoices(current) + granted);
}

/** Keep known ids, map renamed ids, drop duplicates, and preserve offer order. */
export function sanitizeChosenPacts(ids: unknown): PactId[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<PactId>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const resolved = resolvePactId(id);
    if (resolved) seen.add(resolved);
  }
  return PACT_IDS.filter((id) => seen.has(id));
}

/**
 * Saves written before the pact rename used curse* keys, and before that cruel* keys.
 * A present newer key wins, including an empty choice list.
 */
type LegacyPactSave = {
  chosenPacts?: unknown;
  chosenCurses?: unknown;
  chosenCruelCurses?: unknown;
  pactOfferPending?: unknown;
  curseOfferPending?: unknown;
  cruelCurseOfferPending?: unknown;
  pactChoices?: unknown;
  curseChoices?: unknown;
  cruelCurseChoices?: unknown;
};

export function readStoredChosenPacts(saved: LegacyPactSave): unknown {
  if (saved.chosenPacts !== undefined) return saved.chosenPacts;
  if (saved.chosenCurses !== undefined) return saved.chosenCurses;
  return saved.chosenCruelCurses;
}

export function readStoredPactOfferPending(saved: LegacyPactSave): boolean {
  if (typeof saved.pactOfferPending === "boolean") return saved.pactOfferPending;
  if (typeof saved.curseOfferPending === "boolean") return saved.curseOfferPending;
  return saved.cruelCurseOfferPending === true;
}

export function readStoredPactChoices(saved: LegacyPactSave): unknown {
  if (saved.pactChoices !== undefined) return saved.pactChoices;
  if (saved.curseChoices !== undefined) return saved.curseChoices;
  return saved.cruelCurseChoices;
}

/** True when every pact is selected for this run. Renamed ids still count. False while pacts are switched off. */
export function hasAllPactsActive(ids: unknown): boolean {
  if (!arePactsEnabled()) return false;
  return sanitizeChosenPacts(ids).length === PACT_IDS.length;
}

/** True when this run has the pact selected. Renamed ids still count. False while pacts are switched off, and while the offer is still open. */
export function hasChosenPact(
  state: { chosenPacts?: unknown; pactOfferPending?: boolean } | null | undefined,
  id: PactId,
): boolean {
  if (!arePactsEnabled() || !state || state.pactOfferPending === true) return false;
  return sanitizeChosenPacts(state.chosenPacts).includes(id);
}

/** Heartfire production bonus before Ebon Grace or Blazesmith doubles it. */
export const HEARTFIRE_BASE_PRODUCTION_PER_LEVEL = 0.05;

/** Blazesmith halves these crafting costs. Buying a bomb is a Trade Post rate, not crafting. */
export const BOMB_CRAFT_ACTION_IDS = [
  "craftEmberBomb",
  "craftAshfireBomb",
  "craftVoidBomb",
] as const;

export const BLAZESMITH_BOMB_COST_MULTIPLIER = 0.5;

/** Full Larders: extra food per villager each production cycle. */
export const FULL_LARDERS_FREE_FOOD = 2;
export const FULL_LARDERS_HUNTER_FOOD = 5;

/** The only action that can fill the Full Larders extra slot. */
export const HUNTRESS_PRIOR_ACTION_ID = "hunt";

type HuntressPriorSlotState = {
  chosenPacts?: unknown;
  fellowship?: { ashwraith_huntress?: boolean } | null;
  story?: { seen?: { huntressHunts?: boolean | number } | null } | null;
};

/**
 * Full Larders lets the Ashwraith Huntress take Hunt without spending a
 * Prior slot, once she has offered to hunt.
 */
export function hasHuntressPriorSlot(
  state: HuntressPriorSlotState | null | undefined,
): boolean {
  return (
    !!state?.fellowship?.ashwraith_huntress &&
    !!state?.story?.seen?.huntressHunts &&
    hasChosenPact(state, "full_larders")
  );
}

/** Assignments that consume a normal Prior slot. Hunt is free when she offers it. */
export function countPriorSlotsUsed(
  assigned: readonly string[] | null | undefined,
  huntressSlot: boolean,
): number {
  const list = assigned ?? [];
  if (!huntressSlot) return list.length;
  let used = 0;
  for (const id of list) {
    if (id !== HUNTRESS_PRIOR_ACTION_ID) used += 1;
  }
  return used;
}

/** Whether another assignment fits. Hunt always fits in the extra slot. */
export function canAssignAnotherPriorAction(
  actionId: string,
  assigned: readonly string[] | null | undefined,
  maxActions: number,
  huntressSlot: boolean,
): boolean {
  if (huntressSlot && actionId === HUNTRESS_PRIOR_ACTION_ID) return true;
  return countPriorSlotsUsed(assigned, huntressSlot) < maxActions;
}

/** Sturdy Hands: extra wood and stone per gatherer each production cycle. */
export const STURDY_HANDS_WOOD = 5;
export const STURDY_HANDS_STONE = 5;

/** Sturdy Hands: extra resource trades on every merchant visit. Tools stay the same. */
export const STURDY_HANDS_EXTRA_RESOURCE_TRADES = 3;

/** Cunning Trader: off the travelling merchant's price, and off Trade Post buy prices. */
export const CUNNING_TRADER_RATE = 0.2;

/** Avid Apprentices. */
export const AVID_APPRENTICES_INSIGHT = 1;
export const AVID_APPRENTICES_MASTERY_RATE = 1.2;

/** Trade Post shop buys. Bridge sales and the clerks' elixir stay at full price. */
const TRADE_POST_BUY_ACTIONS = new Set([
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
]);

export function isBombCraftAction(actionId: string): boolean {
  return (BOMB_CRAFT_ACTION_IDS as readonly string[]).includes(actionId);
}

/** 5% per Heartfire level, plus 5% for each doubling (Ebon Grace, Blazesmith). */
export function getHeartfireProductionPerLevel(state: {
  blessings?: { ebon_grace?: boolean } | null;
  chosenPacts?: unknown;
} | null | undefined): number {
  const doubles =
    (state?.blessings?.ebon_grace ? 1 : 0) +
    (hasChosenPact(state, "blazesmith") ? 1 : 0);
  return HEARTFIRE_BASE_PRODUCTION_PER_LEVEL * (1 + doubles);
}

/** 20% off the gold or silver a Trade Post buy charges. The goods stay the same. */
export function applyTradePostBuyCost(
  actionId: string,
  amount: number,
  state: { chosenPacts?: unknown } | null | undefined,
): number {
  if (!hasChosenPact(state, "cunning_trader")) return amount;
  if (!TRADE_POST_BUY_ACTIONS.has(actionId)) return amount;
  if (!Number.isFinite(amount) || amount <= 0) return amount;
  return Math.ceil(amount * (1 - CUNNING_TRADER_RATE));
}
