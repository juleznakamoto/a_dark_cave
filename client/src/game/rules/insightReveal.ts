import type { GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import type { Action } from "@shared/schema";

export const INSIGHT_REVEAL_BUILDING_COST_EARLY = 50;
export const INSIGHT_REVEAL_BUILDING_COST = 100;
export const INSIGHT_REVEAL_STONE_HUT_COST_MID = 150;
export const INSIGHT_REVEAL_STONE_HUT_COST_HIGH = 200;
export const INSIGHT_REVEAL_FORTIFICATION_COST = 200;
/** Building/craft reveal costs stay at the wooden early tier while wooden huts are at or below this count. */
export const INSIGHT_REVEAL_WOODEN_HUT_EARLY_THRESHOLD = 5;
/** Stone-hut tier uses the mid cost while stone huts are at or below this count. */
export const INSIGHT_REVEAL_STONE_HUT_MID_THRESHOLD = 5;
export const INSIGHT_REVEAL_DURATION_MS = 3_000;
/** Action button cooldown (seconds); ticks subtract 0.25 every 250ms → 1s per unit. */
export const INSIGHT_REVEAL_ACTION_COOLDOWN_SEC = 3;
/** One-time cost to reveal all side-panel stat effect tooltips. */
export const STAT_EFFECTS_INSIGHT_COST = 1000;
/** One-time cost to reveal all village build action descriptions. */
export const BUILDING_DESCRIPTIONS_INSIGHT_COST = 2500;
/** One-time cost to reveal all cave craft action descriptions. */
export const CRAFT_DESCRIPTIONS_INSIGHT_COST = 2500;
/** One-time cost to reveal a hidden achievement title before any progress is made. */
export const ACHIEVEMENT_TITLE_INSIGHT_COST = 250;
/** Prefix for `insightRevealing` keys while an achievement title reveal animates. */
export const ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX = "achievementTitle:";

export function getAchievementTitleInsightKey(achievementId: string): string {
  return `${ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX}${achievementId}`;
}

export function parseAchievementTitleInsightKey(key: string): string | null {
  if (!key.startsWith(ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX)) return null;
  return key.slice(ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX.length) || null;
}
/** Spend Insight to extend an active timed-event tab countdown. */
export const TIMED_EVENT_TAB_PROLONG_INSIGHT_COST = 500;
export const TIMED_EVENT_TAB_PROLONG_MS = 3 * 60 * 1000;

export function isInsightUnlocked(state: GameState): boolean {
  return (state.buildings.clerksHut ?? 0) >= 1;
}
/** `insightRevealing` key while the Stats header badge plays its reveal animation. */
export const STAT_INSIGHT_REVEAL_KEY = "stats";
/** `insightRevealing` key while the Build header description-unlock badge animates. */
export const BUILDING_DESCRIPTIONS_INSIGHT_KEY = "buildingDescriptions";
/** `insightRevealing` key while the Craft header description-unlock badge animates. */
export const CRAFT_DESCRIPTIONS_INSIGHT_KEY = "craftDescriptions";
/** `insightRevealing` key while the timed-event tab prolong badge plays its animation. */
export const TIMED_EVENT_INSIGHT_PROLONG_KEY = "timedEventProlong";
/** `insightRevealing` key while a villager preset slot unlock animates. */
export const PRESET_UNLOCK_INSIGHT_KEY = "villagerPresetUnlock";

export function isStatEffectsRevealed(state: GameState): boolean {
  return Boolean(state.statEffectsRevealed);
}

export function canRevealStatEffects(
  state: GameState,
  insightRevealing?: Record<string, number>,
): boolean {
  if (!isInsightUnlocked(state)) return false;
  if (isStatEffectsRevealed(state)) return false;
  if (isInsightRevealInProgress(STAT_INSIGHT_REVEAL_KEY, insightRevealing)) {
    return false;
  }
  return getInsightAmount(state) >= STAT_EFFECTS_INSIGHT_COST;
}

const FORTIFICATION_BUILDING_KEYS = new Set([
  "bastion",
  "watchtower",
  "palisades",
  "fortifiedMoat",
  "chitinPlating",
]);

const OWNABLE_EFFECT_PREFIXES = ["tools.", "weapons.", "clothing.", "relics."];

function getAction(actionId: string): Action | undefined {
  return getGameActions()[actionId];
}

function resolveEffects(action: Action): Record<string, unknown> | null {
  const effects = action.effects;
  if (!effects) return null;
  if (typeof effects === "function") return null;
  return effects as Record<string, unknown>;
}

/** Craft-once: grants a single owned item via boolean effect. */
export function isCraftOnceAction(actionId: string): boolean {
  if (!actionId.startsWith("craft")) return false;
  const action = getAction(actionId);
  if (!action) return false;
  const effects = resolveEffects(action);
  if (!effects) return false;
  return Object.entries(effects).some(
    ([key, value]) =>
      OWNABLE_EFFECT_PREFIXES.some((p) => key.startsWith(p)) && value === true,
  );
}

export function isBuildingAction(actionId: string): boolean {
  const action = getAction(actionId);
  return Boolean(action?.building);
}

export function isFortificationBuildAction(actionId: string): boolean {
  if (!actionId.startsWith("build")) return false;
  const buildingKey =
    actionId.slice(5, 6).toLowerCase() + actionId.slice(6);
  return FORTIFICATION_BUILDING_KEYS.has(buildingKey);
}

function getBuildingCraftInsightRevealCost(
  state: Pick<GameState, "buildings">,
): number {
  const stoneHuts = state.buildings.stoneHut ?? 0;
  if (stoneHuts >= 1) {
    return stoneHuts <= INSIGHT_REVEAL_STONE_HUT_MID_THRESHOLD
      ? INSIGHT_REVEAL_STONE_HUT_COST_MID
      : INSIGHT_REVEAL_STONE_HUT_COST_HIGH;
  }

  const woodenHuts = state.buildings.woodenHut ?? 0;
  return woodenHuts <= INSIGHT_REVEAL_WOODEN_HUT_EARLY_THRESHOLD
    ? INSIGHT_REVEAL_BUILDING_COST_EARLY
    : INSIGHT_REVEAL_BUILDING_COST;
}

export function getInsightRevealCost(
  actionId: string,
  state: Pick<GameState, "buildings">,
): number | null {
  if (isCraftOnceAction(actionId)) {
    return getBuildingCraftInsightRevealCost(state);
  }
  if (isFortificationBuildAction(actionId)) return INSIGHT_REVEAL_FORTIFICATION_COST;
  if (isBuildingAction(actionId)) return getBuildingCraftInsightRevealCost(state);
  return null;
}

export function isBuildingDescriptionsRevealed(state: GameState): boolean {
  return Boolean(state.buildingDescriptionsRevealed);
}

export function isCraftDescriptionsRevealed(state: GameState): boolean {
  return Boolean(state.craftDescriptionsRevealed);
}

export function isBuildingDescriptionsUnlockAvailable(
  state: Pick<GameState, "buildings">,
): boolean {
  return (
    (state.buildings.clerksHut ?? 0) >= 1 &&
    (state.buildings.buildersHall ?? 0) >= 1
  );
}

export function isCraftDescriptionsUnlockAvailable(
  state: Pick<GameState, "buildings">,
): boolean {
  return (
    (state.buildings.clerksHut ?? 0) >= 1 &&
    (state.buildings.blacksmith ?? 0) >= 1
  );
}

export function isBuildingDescriptionVisible(
  state: GameState,
  actionId: string,
): boolean {
  return Boolean(
    state.books?.book_of_craftsmanship ||
    isBuildingDescriptionsRevealed(state) ||
    (state.revealedEffects ?? []).includes(actionId),
  );
}

export function isCraftDescriptionVisible(
  state: GameState,
  actionId: string,
): boolean {
  return Boolean(
    state.books?.book_of_craftsmanship ||
    isCraftDescriptionsRevealed(state) ||
    (state.revealedEffects ?? []).includes(actionId),
  );
}

export function canRevealBuildingDescriptions(
  state: GameState,
  insightRevealing?: Record<string, number>,
): boolean {
  if (!isInsightUnlocked(state)) return false;
  if (!isBuildingDescriptionsUnlockAvailable(state)) return false;
  if (isBuildingDescriptionsRevealed(state)) return false;
  if (
    isInsightRevealInProgress(
      BUILDING_DESCRIPTIONS_INSIGHT_KEY,
      insightRevealing,
    )
  ) {
    return false;
  }
  return getInsightAmount(state) >= BUILDING_DESCRIPTIONS_INSIGHT_COST;
}

export function canRevealCraftDescriptions(
  state: GameState,
  insightRevealing?: Record<string, number>,
): boolean {
  if (!isInsightUnlocked(state)) return false;
  if (!isCraftDescriptionsUnlockAvailable(state)) return false;
  if (isCraftDescriptionsRevealed(state)) return false;
  if (
    isInsightRevealInProgress(CRAFT_DESCRIPTIONS_INSIGHT_KEY, insightRevealing)
  ) {
    return false;
  }
  return getInsightAmount(state) >= CRAFT_DESCRIPTIONS_INSIGHT_COST;
}

/** @deprecated Per-action build/craft insight reveal removed; always false. */
export function canRevealEffects(_actionId: string, _state: GameState): boolean {
  return false;
}

export function isInsightRevealInProgress(
  actionId: string,
  insightRevealing: Record<string, number> | undefined,
): boolean {
  const end = insightRevealing?.[actionId];
  return typeof end === "number" && end > Date.now();
}

export function getInsightAmount(state: GameState): number {
  return state.resources.insight ?? 0;
}

export function isAchievementTitleRevealed(
  state: GameState,
  achievementId: string,
): boolean {
  return (state.revealedAchievementTitles ?? []).includes(achievementId);
}

export function isAchievementTitleVisible(
  state: GameState,
  achievementId: string,
  currentCount: number,
): boolean {
  return currentCount >= 1 || isAchievementTitleRevealed(state, achievementId);
}

export function canRevealAchievementTitle(
  state: GameState,
  achievementId: string,
  currentCount: number,
  insightRevealing?: Record<string, number>,
): boolean {
  if (!isInsightUnlocked(state)) return false;
  if (isAchievementTitleVisible(state, achievementId, currentCount)) return false;
  if (
    isInsightRevealInProgress(
      getAchievementTitleInsightKey(achievementId),
      insightRevealing ?? state.insightRevealing,
    )
  ) {
    return false;
  }
  return getInsightAmount(state) >= ACHIEVEMENT_TITLE_INSIGHT_COST;
}

export function canProlongTimedEventTab(
  state: GameState & {
    timedEventTab?: {
      isActive?: boolean;
      expiryTime?: number;
      insightProlongUsed?: boolean;
    };
  },
  effectiveRemainingMs: number | null,
): boolean {
  if (!isInsightUnlocked(state)) return false;
  const tab = state.timedEventTab;
  if (!tab?.isActive || !tab.expiryTime) return false;
  if (tab.insightProlongUsed) return false;
  if (effectiveRemainingMs == null || effectiveRemainingMs <= 0) return false;
  return getInsightAmount(state) >= TIMED_EVENT_TAB_PROLONG_INSIGHT_COST;
}
