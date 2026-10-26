import { formatNumber } from "@/lib/utils";
import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { stackTimedDebuff } from "@/game/stateHelpers";

export const CROSSING_PATHS_WOOD_REWARD = 5000;
export const CROSSING_PATHS_DISGUST_MS = 10 * 60 * 1000;
export const CROSSING_PATHS_MIN_HUTS = 10;

const SEEN_KEYS = ["woodcutterHelped", "woodcutterLeft", "woodcutterKilled"] as const;

function alreadyResolved(state: GameState): boolean {
  if (state.tools?.woodcutter_axe) return true;
  return SEEN_KEYS.some((key) => state.story?.seen?.[key] === true);
}

function giveAxe(
  state: GameState,
  seenKey: (typeof SEEN_KEYS)[number],
): Pick<GameState, "tools" | "story"> {
  return {
    tools: {
      ...state.tools,
      woodcutter_axe: true,
    },
    story: {
      ...state.story,
      seen: {
        ...state.story.seen,
        [seenKey]: true,
      },
    },
  };
}

export const crossingPathsEvents: Record<string, GameEvent> = {
  crossingPathsAgain: {
    id: "crossingPathsAgain",
    i18nKey: "crossingPathsAgain",
    i18nVars: {
      woodReward: formatNumber(CROSSING_PATHS_WOOD_REWARD),
    },
    condition: (state: GameState) =>
      state.story?.seen?.woodcutterBetrayed === true &&
      (state.buildings?.woodenHut ?? 0) >= CROSSING_PATHS_MIN_HUTS &&
      !alreadyResolved(state),
    timeProbability: 40,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "helpHim",
        effect: (state: GameState) => ({
          ...giveAxe(state, "woodcutterHelped"),
          resources: {
            ...state.resources,
            wood: state.resources.wood + CROSSING_PATHS_WOOD_REWARD,
          },
          _logMessageKey: "help",
        }),
      },
      {
        id: "leaveHim",
        effect: (state: GameState) => ({
          ...giveAxe(state, "woodcutterLeft"),
          _logMessageKey: "leave",
        }),
      },
      {
        id: "killHim",
        effect: (state: GameState) => ({
          ...giveAxe(state, "woodcutterKilled"),
          disgustState: stackTimedDebuff(
            state.disgustState,
            CROSSING_PATHS_DISGUST_MS,
          ),
          _logMessageKey: "kill",
        }),
      },
    ],
  },
};
