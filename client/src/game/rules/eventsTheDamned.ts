import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { addFreeVillagersWithinCap, stackTimedDebuff } from "@/game/stateHelpers";
import { getCurrentPopulation } from "@/game/population";
import { disgustDurationMs } from "@/game/cruelMode";

function turnThemAwayEffect(logKey: string) {
  return (state: GameState) => ({
    disgustState: stackTimedDebuff(
      state.disgustState,
      disgustDurationMs(state.cruelMode),
    ),
    _logMessageKey: logKey,
  });
}

export const theDamnedEvents: Record<string, GameEvent> = {
  theDamned: {
    id: "theDamned",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 && getCurrentPopulation(state) < 6,
    timeProbability: 5,
    priority: 4,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    choices: [
      {
        id: "welcomeThem",
        effect: (state: GameState) => {
          const { added, patch } = addFreeVillagersWithinCap(state, 12);

          return {
            ...patch,
            _logMessageKey: added > 0 ? "outcome0" : "outcome3",
            _logMessageVars: added > 0 ? { added } : undefined,
          };
        },
      },
      {
        id: "turnThemAway",
        effect: turnThemAwayEffect("outcome1"),
      },
    ],
    fallbackChoice: {
      id: "turnThemAway",
      effect: turnThemAwayEffect("outcome2"),
    },
  },
};
