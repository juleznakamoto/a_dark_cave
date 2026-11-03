import type { Action, GameState } from "@shared/schema";
import type { ActionResult } from "@/game/types";
import { getActionLogMessage } from "@/i18n/resolveGameText";
import { bt } from "./buildingTooltipEffects";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import { gameEvents } from "./events";
import {
  getChainmasterBookOfferChance,
  getFinanceExpeditionFoodCost,
  getFinanceExpeditionGoldCost,
  getFinanceExpeditionTier,
  getFinanceExpeditionUsageCount,
} from "./financeExpedition";

export {
  CHAINMASTER_BOOK_OFFER_CHANCES,
  FINANCE_EXPEDITION_TIERS,
  getChainmasterBookOfferChance,
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
  // leatherboundBookFound is only set on Accept. A missed dialog can be
  // offered again on a later return instead of locking the book away.
  const shouldOfferBook =
    !state.story.seen.leatherboundBookFound &&
    Math.random() < getChainmasterBookOfferChance(usageCount);

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
