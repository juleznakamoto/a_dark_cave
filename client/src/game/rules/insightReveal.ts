import type { GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import type { Action } from "@shared/schema";

export const INSIGHT_REVEAL_DURATION_MS = 3_000;
/** Insight cost to unveil a basic-category achievement title. */
export const ACHIEVEMENT_TITLE_INSIGHT_COST_BASIC = 250;
/** Insight cost to unveil non-basic achievement titles. */
export const ACHIEVEMENT_TITLE_INSIGHT_COST = 500;
/** Prefix for `insightRevealing` keys while an achievement title reveal animates. */
export const ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX = "achievementTitle:";

export function getAchievementTitleInsightKey(achievementId: string): string {
  return `${ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX}${achievementId}`;
}

export function parseAchievementTitleInsightKey(key: string): string | null {
  if (!key.startsWith(ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX)) return null;
  return key.slice(ACHIEVEMENT_TITLE_INSIGHT_KEY_PREFIX.length) || null;
}

/**
 * Cost from `{category}-…` IDs (e.g. `basic-0-woodGatherer`).
 * Basic category is cheaper; everything else uses the default.
 */
export function getAchievementTitleInsightCost(achievementId: string): number {
  if (achievementId.startsWith("basic-")) {
    return ACHIEVEMENT_TITLE_INSIGHT_COST_BASIC;
  }
  return ACHIEVEMENT_TITLE_INSIGHT_COST;
}
/** Spend Insight to extend an active timed-event tab countdown. */
export const TIMED_EVENT_TAB_PROLONG_INSIGHT_COST = 500;
export const TIMED_EVENT_TAB_PROLONG_MS = 2 * 60 * 1000;

export function isInsightUnlocked(state: GameState): boolean {
  return (state.buildings.clerksHut ?? 0) >= 1;
}
/** Legacy `insightRevealing` key; tickCooldowns still expires leftover save sessions. */
export const STAT_INSIGHT_REVEAL_KEY = "stats";
/** Legacy `insightRevealing` key; tickCooldowns still expires leftover save sessions. */
export const BUILDING_DESCRIPTIONS_INSIGHT_KEY = "buildingDescriptions";
/** Legacy `insightRevealing` key; tickCooldowns still expires leftover save sessions. */
export const CRAFT_DESCRIPTIONS_INSIGHT_KEY = "craftDescriptions";
/** `insightRevealing` key while the timed-event tab prolong badge plays its animation. */
export const TIMED_EVENT_INSIGHT_PROLONG_KEY = "timedEventProlong";
/** `insightRevealing` key while a villager preset slot unlock animates. */
export const PRESET_UNLOCK_INSIGHT_KEY = "villagerPresetUnlock";
/** Prefix for `insightRevealing` keys while an item Absolution badge animates. */
export const ITEM_ABSOLVE_INSIGHT_KEY_PREFIX = "itemAbsolve:";
/** Prefix for `insightRevealing` keys while a weapon enchant badge animates. */
export const WEAPON_ENCHANT_INSIGHT_KEY_PREFIX = "weaponEnchant:";

export function getItemAbsolveInsightKey(itemId: string): string {
  return `${ITEM_ABSOLVE_INSIGHT_KEY_PREFIX}${itemId}`;
}

export function getWeaponEnchantInsightKey(weaponId: string): string {
  return `${WEAPON_ENCHANT_INSIGHT_KEY_PREFIX}${weaponId}`;
}

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

export function isBuildingDescriptionVisible(
  _state: GameState,
  _actionId: string,
): boolean {
  return true;
}

export function isCraftDescriptionVisible(
  _state: GameState,
  _actionId: string,
): boolean {
  return true;
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
  return getInsightAmount(state) >= getAchievementTitleInsightCost(achievementId);
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
