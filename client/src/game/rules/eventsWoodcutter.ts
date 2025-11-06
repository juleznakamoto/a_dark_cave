
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const woodcutterEvents: Record<string, GameEvent> = {
  woodcutter1: {
    id: "woodcutter1",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 &&
      state.buildings.woodenHut <= 6 &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter1Accepted,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Woodcutter",
    message:
      "A muscular man with a large axe approaches your village. He flexes his arms 'I can cut trees like no other,' he boasts. 'Give me food, and I'll bring wood.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 25 food",
        cost: "25 food",
        effect: (state: GameState) => {
          if (state.resources.food < 25) {
            return {};
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 25,
              wood: state.resources.wood + 100,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterMet: true,
                woodcutter1Met: true,
                woodcutter1Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and heads into the forest. By evening, he returns with the promised 100 wood stacked neatly at your village edge.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his offer. The woodcutter shrugs and walks away into the forest.",
          };
        },
      },
    ],
  },

  woodcutter2: {
    id: "woodcutter2",
    condition: (state: GameState) =>
      state.story.seen.woodcutter1Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter2Accepted &&
      state.buildings.woodenHut >= 2 &&
      state.buildings.woodenHut <= 7,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter Returns",
    message:
      "The woodcutter returns, his axe gleaming in the sun. 'Your village grows well,' he observes. 'I can bring you more wood. What do you say?'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 50 food",
        cost: "50 food",
        effect: (state: GameState) => {
          if (state.resources.food < 50) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 50,
              wood: state.resources.wood + 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter2Met: true,
                woodcutter2Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and disappears into the forest. By nightfall, he returns with a large pile of 250 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his offer. The woodcutter nods and departs without complaint.",
          };
        },
      },
    ],
  },

  woodcutter3: {
    id: "woodcutter3",
    condition: (state: GameState) =>
      state.story.seen.woodcutter2Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter3Accepted &&
      state.buildings.woodenHut >= 3 &&
      state.buildings.woodenHut <= 8,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Offer",
    message:
      "The woodcutter approaches again 'I see your village continues to thrive,' he says with a grin. 'I can bring you more wood if you pay for it.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 100 food",
        cost: "100 food",
        effect: (state: GameState) => {
          if (state.resources.food < 100) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 100,
              wood: state.resources.wood + 750,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter3Met: true,
                woodcutter3Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and ventures deep into the forest. He returns with an impressive haul of 750 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You turn down his offer. He shrugs and walks back into the woods.",
          };
        },
      },
    ],
  },

  woodcutter4: {
    id: "woodcutter4",
    condition: (state: GameState) =>
      state.story.seen.woodcutter3Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter4Accepted &&
      state.buildings.woodenHut >= 4 &&
      state.buildings.woodenHut <= 9,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Ambitious Plan",
    message:
      "The woodcutter arrives once more, 'Do you want to use my services once more?,' he asks.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 150 food",
        cost: "150 food",
        effect: (state: GameState) => {
          if (state.resources.food < 150) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          const betrayalChance = 0.3333; // 33.33%
          const isBetrayedNow = Math.random() < betrayalChance;

          if (isBetrayedNow) {
            return {
              resources: {
                ...state.resources,
                food: state.resources.food - 150,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterBetrayed: true,
                },
              },
              _logMessage:
                "You hand over the food, but days pass with no sign of the woodcutter. It seems you got betrayed.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 150,
              wood: state.resources.wood + 1500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter4Met: true,
                woodcutter4Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and spends the afternoon in the forest. He returns with an enormous pile of 1500 wood.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You decline his ambitious offer. The woodcutter looks disappointed but accepts your decision.",
          };
        },
      },
    ],
  },

  woodcutter5: {
    id: "woodcutter5",
    condition: (state: GameState) =>
      state.story.seen.woodcutter4Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter5Accepted &&
      state.buildings.woodenHut >= 5 &&
      state.buildings.woodenHut <= 10,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Grand Proposal",
    message:
      "The woodcutter appears with a confident smile. 'How about we make one more deal?'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 200 food",
        cost: "200 food",
        effect: (state: GameState) => {
          if (state.resources.food < 200) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          const betrayalChance = 0.5; // 50%
          const isBetrayedNow = Math.random() < betrayalChance;

          if (isBetrayedNow) {
            return {
              resources: {
                ...state.resources,
                food: state.resources.food - 200,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  woodcutterBetrayed: true,
                },
              },
              _logMessage:
                "You hand over the food. The woodcutter promises to return the same day. But he never does. It seems you got betrayed.",
            };
          }

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 200,
              wood: state.resources.wood + 2500,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutter5Met: true,
                woodcutter5Accepted: true,
              },
            },
            _logMessage:
              "The woodcutter takes the food and within the same day he delivers a massive stockpile of 2500 wood to your village.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            _logMessage:
              "You refuse the deal. The woodcutter frowns but doesn't argue.",
          };
        },
      },
    ],
  },

  woodcutter6: {
    id: "woodcutter6",
    condition: (state: GameState) =>
      state.story.seen.woodcutter5Met &&
      !state.story.seen.woodcutterBetrayed &&
      !state.story.seen.woodcutter6Accepted &&
      state.buildings.woodenHut >= 6 &&
      state.buildings.woodenHut <= 10,
    triggerType: "time",
    timeProbability: 5,
    title: "The Woodcutter's Offer",
    message:
      "The woodcutter returns to the village, 'Do you want to use my services once more?,' he asks.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "acceptServices",
        label: "Pay 250 food",
        cost: "250 food",
        effect: (state: GameState) => {
          if (state.resources.food < 250) {
            return {
              _logMessage: "You don't have enough food for this deal.",
            };
          }

          // 100% betrayal
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterBetrayed: true,
                woodcutter6Accepted: true,
              },
            },
            _logMessage:
              "You hand over the food. The woodcutter grins as he leaves towards the forest. You wait, but he never returns. It seems you got betrayed.",
          };
        },
      },
      {
        id: "denyServices",
        label: "Deny services",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                woodcutterEnded: true,
              },
            },
            _logMessage:
              "Something about his demeanor makes you uneasy. You refuse the deal. The woodcutter's smile fades, and he leaves without a word.",
          };
        },
      },
    ],
  },
};
