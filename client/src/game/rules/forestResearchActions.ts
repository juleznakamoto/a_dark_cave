import type { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/actions";
import { getActionLogMessage } from "@/i18n/resolveGameText";
import { bt } from "./buildingTooltipEffects";

export const FINANCE_EXPEDITION_TIERS = [
  { gold: 50, food: 100, villagers: 4, executionTime: 10, insight: 250 },
  { gold: 100, food: 200, villagers: 5, executionTime: 15, insight: 500 },
  { gold: 150, food: 300, villagers: 6, executionTime: 20, insight: 750 },
  { gold: 200, food: 400, villagers: 7, executionTime: 25, insight: 1000 },
  { gold: 250, food: 500, villagers: 10, executionTime: 30, insight: 1500 },
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
