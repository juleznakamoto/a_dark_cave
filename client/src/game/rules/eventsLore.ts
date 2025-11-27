
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";

export const loreEvents: Record<string, GameEvent> = {
  restlessKnight: {
    id: "restlessKnight",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 3 &&
      !state.story.seen.restlessKnightSuccess,
    triggerType: "resource",
    timeProbability: (state: GameState) => 
      state.story.seen.restlessKnightFailed ? 60 : 45,
    title: "The Restless Knight",
    message:
      "A knight in worn armor arrives at your village. 'I have seen much of the world,' he says with a hollow voice. 'For some gold, I will share what I have seen in my travels.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "payGold",
        label: "Pay 50 Gold",
        cost: "50 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 50) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightSuccess: true,
              },
            },
            _logMessage:
              "The knight speaks: 'Beyond the eastern mountains lies a dead city of giant stone towers, almost touching the clouds. Empty windows stare across the land like countless eyes. Nature has climbed every wall and filled the streets with roots. No one has lived there for ages.'",
          };
        },
      },
      {
        id: "convince",
        label: "Convince him",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightSuccess: true,
                },
              },
              _logMessage:
                "Your words intrigue the knight, he speaks: 'Beyond the eastern mountains lies a dead city of giant stone towers, almost touching the clouds. Empty windows stare across the land like countless eyes. Nature has climbed every wall and filled the streets with roots. No one has lived there for ages.'",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightFailed: true,
                },
              },
              _logMessage:
                "The knight listens to your words but shakes his head. 'Your words are earnest, but my knowledge has value. Perhaps our paths will cross again.' He departs without sharing his tale.",
            };
          }
        },
      },
      {
        id: "refuse",
        label: "Do not pay",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightFailed: true,
              },
            },
            _logMessage:
              "You decline the knight's offer. He nods respectfully. 'Perhaps our paths will cross again,' he says before continuing his journey.",
          };
        },
      },
    ],
  },
};
