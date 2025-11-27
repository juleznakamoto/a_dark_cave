
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";

export const loreEvents: Record<string, GameEvent> = {
  restlessKnight: {
    id: "restlessKnight",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 4 &&
      !state.story.seen.restlessKnightSuccess,
    triggerType: "resource",
    timeProbability: (state: GameState) => {
      return state.story.seen.restlessKnightFailed ? 60 : 15;
    },
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

  restlessKnightMountains: {
    id: "restlessKnightMountains",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 6 &&
      state.story.seen.restlessKnightSuccess &&
      !state.story.seen.restlessKnightMountains,
    triggerType: "resource",
    timeProbability: (state: GameState) => 60,
    title: "The Knight Returns",
    message:
      "The restless knight returns from the mountains, his armor scratched and weathered. 'I found a monastery carved into the cliffs,' he says, eyes distant with memory. 'Scholars once gathered there, collecting ancient texts and artifacts in an attempt to learn about the past. From what they wrote, the people who lived on this earth before us were far more advanced than we can imagine.' He pauses. 'For a fair price, I can share what I learned there.'",
    triggered: false,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "payGold",
        label: "Pay 75 Gold",
        cost: "75 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 75) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 75,
            },
            stats: {
              ...state.stats,
              knowledge: (state.stats.knowledge || 0) + 3,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            _logMessage:
              "The knight shares his knowledge: 'The monastery's archives spoke of cities that touched the clouds, machines that moved without horses, and devices that could speak across vast distances. They built wonders we can barely comprehend, yet something brought their world to ruin. The scholars feared the same fate might befall us.' (+3 Knowledge)",
          };
        },
      },
      {
        id: "payFood",
        label: "Pay 2500 Food",
        cost: "2500 food",
        effect: (state: GameState) => {
          if (state.resources.food < 2500) {
            return {
              _logMessage: "You don't have enough food.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 2500,
            },
            stats: {
              ...state.stats,
              knowledge: (state.stats.knowledge || 0) + 3,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            _logMessage:
              "The knight accepts your provisions gratefully and shares his knowledge: 'The monastery's archives spoke of cities that touched the clouds, machines that moved without horses, and devices that could speak across vast distances. They built wonders we can barely comprehend, yet something brought their world to ruin. The scholars feared the same fate might befall us.' (+3 Knowledge)",
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            _logMessage:
              "You decline his offer. The knight nods understandingly. 'The knowledge will remain with me then,' he says before departing once more.",
          };
        },
      },
    ],
  },
};
