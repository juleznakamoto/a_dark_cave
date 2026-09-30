import type { GameTab } from "@/game/types";
import type { GameStore } from "./types";

/** Cleared timed-event tab slice - use when starting a new game so no visit survives reset. */
export const INACTIVE_TIMED_EVENT_TAB: GameStore["timedEventTab"] = {
  isActive: false,
  event: null,
  expiryTime: 0,
  startTime: undefined,
  lastEndedAt: 0,
  pauseAccumMs: 0,
  pauseStartedAt: 0,
  insightProlongUsed: false,
};

/** Store patch that ends any active timed-tab visit (merchant, gambler, etc.). */
export function getTimedEventTabCleanupPatch(
  activeTab: GameTab,
): Partial<GameStore> {
  return {
    timedEventTab: INACTIVE_TIMED_EVENT_TAB,
    gamblerGame: null,
    gamblerDiceDialogOpen: false,
    blessingOfferDialogOpen: false,
    merchantTrades: { choices: [], purchasedIds: [] },
    ...(activeTab === "timedevent" ? { activeTab: "cave" as const } : {}),
  };
}
