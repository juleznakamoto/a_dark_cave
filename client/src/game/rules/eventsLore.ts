import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";

export const loreEvents: Record<string, GameEvent> = {
  restlessKnight: {
    id: "restlessKnight",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 4 && !state.story.seen.restlessKnightSuccess,
    triggerType: "resource",
    timeProbability: (state: GameState) => {
      return state.story.seen.restlessKnightFailed ? 60 : 30;
    },
    title: "The Restless Knight",
    message: (state: GameState) =>
      state.story.seen.restlessKnightFailed
        ? "Again, the knight in worn armor arrives at your village. 'I have seen much of the world,' he says with a hollow voice. 'For some gold, I will share what I have seen in my travels.'"
        : "A knight in worn armor arrives at your village. 'I have seen much of the world,' he says with a hollow voice. 'For some gold, I will share what I have seen in my travels.'",
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
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightMountainsFailed ? 60 : 30,
    title: "Return from the Mountains",
    message:
      "The knight returns, his armor scratched and weathered. 'I found something extraordinary in the mountains,' he says. I will tell you about it, for a price'",
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
                restlessKnightMountains: true,
              },
            },
            _logMessage:
              "The knight shares his discovery: 'High in the mountains lies a monastery carved into the cliffs. Scholars who gathered there to study the past tell of an advanced civilization far beyond our understanding. Yet something brought their world to ruin.'",
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
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightMountains: true,
              },
            },
            _logMessage:
              "Grateful for the meal, the knight shares his discovery: 'High in the mountains lies a monastery carved into the cliffs. The scholars there who study the past speak of a civilization far beyond our understanding. Their craft was so advanced it would seem like magic to us. Yet something brought their world to ruin.'",
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

  restlessKnightCoast: {
    id: "restlessKnightCoast",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 8 &&
      state.story.seen.restlessKnightMountains &&
      !state.story.seen.restlessKnightCoast,
    triggerType: "resource",
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightCoastFailed ? 60 : 30,
    title: "Tales from the Shore",
    message:
      "The knight appears once more, 'I have traveled to a city on the shore of an ocean,' he says. 'What I found there defies belief. I will share this knowledge, for a price.'",
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
                restlessKnightCoast: true,
              },
            },
            _logMessage:
              "The knight shares: 'On the ocean shore I found a dead city, half-claimed by the waves. Among its ruins lie vast metal vessels, their rusted hulls still defying time. The ancients once ruled the seas with these giants, now stranded and silent on the sand.'",
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
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightCoast: true,
              },
            },
            _logMessage:
              "Content for the meal, the knight shares: 'On the ocean shore I found a dead city, half-claimed by the waves. Among its ruins lie vast metal vessels, their rusted hulls still defying time. The ancients once ruled the seas with these giants, now stranded and silent on the sand.'",
          };
        },
      },
      {
        id: "convince",
        label: "Convince him",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.1, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightCoast: true,
                },
              },
              _logMessage:
                "Your words move the knight. He speaks: 'On the ocean shore I found a dead city, half-claimed by the waves. Among its ruins lie vast metal vessels, their rusted hulls still defying time. The ancients once ruled the seas with these giants, now stranded and silent on the sand.''",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightCoastFailed: true,
                },
              },
              _logMessage:
                "The knight listens but remains unmoved. 'Your words are sincere, but this knowledge is precious. Perhaps another time.' He departs without sharing his discovery.",
            };
          }
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
                restlessKnightCoast: true,
              },
            },
            _logMessage:
              "You decline his offer. The knight nods solemnly. 'Very well. The secrets of the shore shall remain with me for now,' he says before walking away.",
          };
        },
      },
    ],
  },

  restlessKnightDesert: {
    id: "restlessKnightDesert",
    condition: (state: GameState) =>
      state.buildings.bastion >= 1 &&
      state.buildings.darkEstate >= 1 &&
      state.story.seen.restlessKnightCoast &&
      !state.story.seen.restlessKnightDesert,
    triggerType: "resource",
    timeProbability: (state: GameState) =>
      state.story.seen.restlessKnightDesertFailed ? 60 : 30,
    title: "The Knight's Final Journey",
    message:
      "The knight returns, 'I traveled far south to a vast desert. There I met a man devoted to recovering the lost technology of the ancients. He showed me devices once embedded in the body, enhancing senses beyond natural limits. The ancients were not merely human.' He pauses, 'I have traveled enough. Your could use a veteran blade. I offer my service in combat, if you accept.'",
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "payGold",
        label: "Pay 250 Gold",
        cost: "250 gold",
        effect: (state: GameState) => {
          if (state.resources.gold < 250) {
            return {
              _logMessage: "You don't have enough gold.",
            };
          }

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 250,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightDesert: true,
              },
            },
            fellowship: {
              ...state.fellowship,
              restless_knight: true,
            },
            _logMessage:
              "The knight nods with satisfaction. 'A fair price. I shall defend your people with my life.' He removes his weathered helm, revealing a scarred but determined face. The restless knight has joined your fellowship.",
          };
        },
      },
      {
        id: "paySilver",
        label: "Pay 1000 Silver",
        cost: "1000 silver",
        effect: (state: GameState) => {
          if (state.resources.silver < 1000) {
            return {
              _logMessage: "You don't have enough silver.",
            };
          }

          return {
            resources: {
              ...state.resources,
              silver: state.resources.silver - 1000,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                restlessKnightDesert: true,
              },
            },
            fellowship: {
              ...state.fellowship,
              restless_knight: true,
            },
            _logMessage:
              "The knight accepts the silver with a solemn bow. 'I shall defend your people with my life.' He removes his weathered helm, revealing a scarred but determined face. The restless knight has joined your fellowship.",
          };
        },
      },
      {
        id: "convince",
        label: "Convince him",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.05, {
            type: "knowledge",
            multiplier: 0.005,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.05, {
            type: "knowledge",
            multiplier: 0.005,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightDesert: true,
                },
              },
              fellowship: {
                ...state.fellowship,
                restless_knight: true,
              },
              _logMessage:
                "'Your purpose seems noble, the knight’s eyes brighten. 'I would be honored to stand with you.' He removes his weathered helm, revealing a scarred but determined face. The restless knight has joined your fellowship.",
            };
          } else {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  restlessKnightDesertFailed: true,
                },
              },
              _logMessage:
                "The knight listens but shakes his head. 'Words alone cannot sustain a warrior. I must continue my journey, then, for now.', he says, turning away and departing.",
            };
          }
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
                restlessKnightDesertFailed: true,
              },
            },
            _logMessage:
              "You decline his offer. The knight nods with understanding. 'I respect your decision. I must continue my journey, then, for now.', he says, turning away and departing.",
          };
        },
      },
    ],
  },
};
