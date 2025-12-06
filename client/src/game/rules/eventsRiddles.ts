
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

export const riddleEvents: Record<string, GameEvent> = {
  whispererInTheDark: {
    id: "whispererInTheDark",
    condition: (state: GameState) => state.buildings.darkEstate >= 1,
    triggerType: "resource",
    timeProbability: 30,
    title: "Whisperer in the Dark",
    message:
      "At night, a knock echoes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "answerFire",
        label: "Fire",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 12 + 6 * state.CM),
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${12 + 6 * state.CM} villagers are found in their beds with slit throats.`,
          };
        },
      },
      {
        id: "answerTree",
        label: "Tree",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 10 + 5 * state.CM),
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${10 + 5 * state.CM} villagers are found in their beds with slit throats.`,
          };
        },
      },
      {
        id: "answerWind",
        label: "Wind",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 250,
            },
            _logMessage:
              "The figure lightly nods and vanishes briefly after you say the word. In the morning, you find a bag with 250 gold on the doorsteps of the estate.",
          };
        },
      },
      {
        id: "answerBones",
        label: "Bones",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 10 + 5 * state.CM),
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${10 + 5 * state.CM} villagers are found in their beds with slit throats.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        return {
          ...killVillagers(state, 10 + 5 * state.CM),
          _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${10 + 5 * state.CM} villagers are found in their beds with slit throats.`,
        };
      },
    },
  },
};
