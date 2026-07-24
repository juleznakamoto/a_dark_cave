import { GameState } from "@shared/schema";
import { GameEvent } from "./events";
import {
  ensureInsightBlessingOfferState,
  getInsightBlessingCost,
  getInsightBlessingCostLabel,
  hasUnownedInsightBlessings,
} from "./insightBlessings";
import { formatNumber } from "@/lib/utils";

export const insightBlessingEvents: Record<string, GameEvent> = {
  insightBlessingOffer: {
    id: "insightBlessingOffer",
    condition: (state: GameState) =>
      (state.buildings.darkEstate ?? 0) >= 1 && hasUnownedInsightBlessings(state),
    timeProbability: 45,
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000,
    skipEventLog: true,
    i18nVars: (state: GameState) => ({
      insightCost: formatNumber(getInsightBlessingCost(state)),
    }),
    effect: (state: GameState) => {
      const nextOffer = ensureInsightBlessingOfferState(state);
      const prev = state.insightBlessingOfferState;
      if (
        prev &&
        prev.nextIndex === nextOffer.nextIndex &&
        prev.slots.length === nextOffer.slots.length &&
        prev.slots.every((id, i) => id === nextOffer.slots[i])
      ) {
        return {};
      }
      return { insightBlessingOfferState: nextOffer };
    },
    choices: [
      {
        id: "receiveBlessing",
        cost: (state: GameState) => getInsightBlessingCostLabel(state),
        // Opens the selection dialog in TimedEventPanel; Insight is spent on choose.
        effect: () => ({}),
      },
      {
        id: "sendAway",
        effect: () => ({
          _logMessageKey: "outcomeSendAway",
        }),
      },
    ],
    fallbackChoice: {
      id: "sendAway",
      effect: () => ({
        _logMessageKey: "outcomeFallback",
      }),
    },
  },
};
