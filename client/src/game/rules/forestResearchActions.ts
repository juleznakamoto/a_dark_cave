import type { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { getActionLogMessage } from "@/i18n/resolveGameText";
import { bt } from "./buildingTooltipEffects";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import { gameEvents } from "./events";
import {
  FINANCE_EXPEDITION_TIERS,
  getFinanceExpeditionFoodCost,
  getFinanceExpeditionGoldCost,
  getFinanceExpeditionTier,
  getFinanceExpeditionTierIndex,
  getFinanceExpeditionUsageCount,
} from "./financeExpedition";

export {
  FINANCE_EXPEDITION_TIERS,
  getFinanceExpeditionUsageCount,
  getFinanceExpeditionTierIndex,
  getFinanceExpeditionTier,
  getFinanceExpeditionGoldCost,
  getFinanceExpeditionFoodCost,
  getFinanceExpeditionInsightReward,
  isFinanceExpeditionPriorUnlocked,
} from "./financeExpedition";

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
  const isMaxTier =
    getFinanceExpeditionTierIndex(state) === FINANCE_EXPEDITION_TIERS.length - 1;
  // leatherboundBookFound is only set on Accept - a missed dialog re-offers on the
  // next max-tier expedition instead of soft-locking the book forever.
  const shouldOfferBook =
    isMaxTier && !state.story.seen.leatherboundBookFound;

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

  if (shouldOfferBook) {
    const eventDef = gameEvents.leatherboundBookFound;
    result.logEntries!.push(
      buildLocalizedEventLogEntry("leatherboundBookFound", eventDef, state, {
        skipEventLog: true,
      }),
    );
  }

  return result;
}
