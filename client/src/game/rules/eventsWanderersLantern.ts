import type { GameState } from "@shared/schema";
import type { GameEvent } from "./eventTypes";
import {
  WANDERERS_LANTERN_EVENT_ID,
  WANDERERS_LANTERN_TOOL_ID,
  isWanderersLanternEventReady,
} from "@/game/wanderersLantern";

export const wanderersLanternEvents: Record<string, GameEvent> = {
  [WANDERERS_LANTERN_EVENT_ID]: {
    id: WANDERERS_LANTERN_EVENT_ID,
    // Average 0.1 minutes after the gift code is accepted. Not a timed tab.
    timeProbability: 0.1,
    priority: 40,
    repeatable: false,
    skipEventLog: true,
    condition: (state: GameState) => isWanderersLanternEventReady(state),
    // Granted on trigger so the outcome dialog is the only popup.
    effect: (state: GameState) => ({
      tools: {
        ...state.tools,
        [WANDERERS_LANTERN_TOOL_ID]: true,
      },
    }),
  },
};
