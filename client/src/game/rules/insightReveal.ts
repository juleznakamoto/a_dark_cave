import type { GameState } from "@shared/schema";
import { getGameActions } from "./actionsRegistry";
import type { Action } from "@shared/schema";

export const INSIGHT_REVEAL_BUILDING_COST = 50;
export const INSIGHT_REVEAL_FORTIFICATION_COST = 25;
export const INSIGHT_REVEAL_CRAFT_COST = 25;
export const INSIGHT_REVEAL_DURATION_MS = 3_000;
/** Action button cooldown (seconds); ticks subtract 0.25 every 250ms → 1s per unit. */
export const INSIGHT_REVEAL_ACTION_COOLDOWN_SEC = 3;
/** One-time cost to reveal all side-panel stat effect tooltips. */
export const STAT_EFFECTS_INSIGHT_COST = 500;
/** One-time cost to reveal a hidden achievement title before any progress is made. */
export const ACHIEVEMENT_TITLE_INSIGHT_COST = 100;
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
export const TIMED_EVENT_TAB_PROLONG_INSIGHT_COST = 250;
export const TIMED_EVENT_TAB_PROLONG_MS = 3 * 60 * 1000;

export function isInsightUnlocked(state: GameState): boolean {
  return (state.buildings.clerksHut ?? 0) >= 1;
}
/** `insightRevealing` key while the Stats header badge plays its reveal animation. */
export const STAT_INSIGHT_REVEAL_KEY = "stats";
/** `insightRevealing` key while the timed-event tab prolong badge plays its animation. */
export const TIMED_EVENT_INSIGHT_PROLONG_KEY = "timedEventProlong";

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

export function getInsightRevealCost(actionId: string): number | null {
  if (isCraftOnceAction(actionId)) return INSIGHT_REVEAL_CRAFT_COST;
  if (isFortificationBuildAction(actionId)) return INSIGHT_REVEAL_FORTIFICATION_COST;
  if (isBuildingAction(actionId)) return INSIGHT_REVEAL_BUILDING_COST;
  return null;
}

export function canRevealEffects(actionId: string, state: GameState): boolean {
  if (!isInsightUnlocked(state)) return false;
  if ((state.revealedEffects ?? []).includes(actionId)) return false;
  return getInsightRevealCost(actionId) !== null;
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
