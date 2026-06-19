import type { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/actions";
import { getActionLogMessage } from "@/i18n/resolveGameText";
import { bt } from "./buildingTooltipEffects";

export const FINANCE_EXPEDITION_TIERS = [
  { gold: 10, food: 250, villagers: 4, executionTime: 30, insight: 250 },
  { gold: 20, food: 500, villagers: 6, executionTime: 45, insight: 500 },
  { gold: 30, food: 750, villagers: 8, executionTime: 60, insight: 750 },
  { gold: 40, food: 1000, villagers: 10, executionTime: 75, insight: 1000 },
  { gold: 50, food: 1500, villagers: 12, executionTime: 90, insight: 1500 },
] as const;

export function getFinanceExpeditionUsageCount(
  state: Pick<GameState, "story">,
): number {
  return Number(state.story?.seen?.financeExpeditionUsageCount) || 0;
}

export function getFinanceExpeditionTierIndex(
  state: Pick<GameState, "story">,
): number {
  const usageCount = getFinanceExpeditionUsageCount(state);
  return Math.min(usageCount, FINANCE_EXPEDITION_TIERS.length - 1);
}

export function getFinanceExpeditionTier(
  state: Pick<GameState, "story">,
): (typeof FINANCE_EXPEDITION_TIERS)[number] {
  return FINANCE_EXPEDITION_TIERS[getFinanceExpeditionTierIndex(state)];
}

export function getFinanceExpeditionGoldCost(state: GameState): number {
  return getFinanceExpeditionTier(state).gold;
}

export function getFinanceExpeditionFoodCost(state: GameState): number {
  return getFinanceExpeditionTier(state).food;
}

export function getFinanceExpeditionInsightReward(state: GameState): number {
  return getFinanceExpeditionTier(state).insight;
}

export const forestResearchActions: Record<string, Action> = {
  financeExpedition: {
    id: "financeExpedition",
    label: "Finance Expedition",
    description:
      "Fund a scholar-led expedition to temples and ruins in the forest",
    tooltipEffects: (state: GameState) => {
      const tier = getFinanceExpeditionTier(state);
      return [
        bt("insightGain", "+{{amount}} Insight", { amount: tier.insight }),
      ];
    },
    show_when: {
      "flags.forestUnlocked": true,
      "story.seen.scholarResearchExpeditionsUnlocked": true,
    },
    cost: (state: GameState) => ({
      "resources.gold": getFinanceExpeditionGoldCost(state),
      "resources.food": getFinanceExpeditionFoodCost(state),
    }),
    effects: {},
    expeditionVillagersRequired: (state: GameState) =>
      getFinanceExpeditionTier(state).villagers,
    executionTime: (state: GameState) =>
      getFinanceExpeditionTier(state).executionTime,
    cooldown: 0,
  },
};

export function handleFinanceExpedition(
  state: GameState,
  result: ActionResult,
): ActionResult {
  const usageCount = getFinanceExpeditionUsageCount(state);
  const tier = getFinanceExpeditionTier(state);

  const existingStory = result.stateUpdates.story ?? { ...state.story };
  const existingSeen = {
    ...state.story.seen,
    ...(existingStory.seen ?? {}),
  };

  result.stateUpdates.resources = {
    ...state.resources,
    ...(result.stateUpdates.resources ?? {}),
    insight: (state.resources.insight || 0) + tier.insight,
  };
  result.stateUpdates.story = {
    ...state.story,
    ...existingStory,
    seen: {
      ...existingSeen,
      financeExpeditionUsageCount: usageCount + 1,
    },
  };

  result.logEntries!.push({
    id: `finance-expedition-${Date.now()}`,
    message: getActionLogMessage(
      "financeExpedition",
      "complete",
      "The research expedition returns from the forest. Scribes spend days cataloguing inscriptions, weathered relics, and fragments of forgotten lore. Your scholars distill it into Insight.",
    ),
    timestamp: Date.now(),
    type: "system",
    actionId: "financeExpedition",
    actionLogKey: "complete",
  });

  return result;
}
