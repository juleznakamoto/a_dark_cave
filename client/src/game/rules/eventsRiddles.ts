
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
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${12 + 6 * state.CM} villagers are found in their beds with slit throats.`,
          };
        },
      },
      {
        id: "answerTree",
        label: "Tree",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 12 + 6 * state.CM),
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${12 + 6 * state.CM} villagers are found in their beds with slit throats.`,
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
              gold: state.resources.gold + 200,
            },
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage:
              "The figure lightly nods and vanishes briefly after you say the word. In the morning, you find a bag with 200 gold on the doorsteps of the estate.",
          };
        },
      },
      {
        id: "answerBones",
        label: "Bones",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 12 + 6 * state.CM),
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${12 + 6 * state.CM} villagers are found in their beds with slit throats.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        return {
          ...killVillagers(state, 12 + 6 * state.CM),
          events: {
            ...state.events,
            whispererInTheDark: true,
          },
          _logMessage: `The figure vanishes the very moment you say the word. In the morning, ${12 + 6 * state.CM} villagers are found in their beds with slit throats.`,
        };
      },
    },
  },

  riddleOfAges: {
    id: "riddleOfAges",
    condition: (state: GameState) => state.events.whispererInTheDark === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "Riddle of Ages",
    message:
      "The cloaked figure returns under the pale moonlight. Its voice echoes with ancient wisdom: 'Goes on four feet in the morning, two feet at noon, and three feet in the evening?'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "answerEarth",
        label: "Earth",
        effect: (state: GameState) => {
          const fogDuration = 5 * 60 * 1000; // 5 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage:
              "The figure shakes its hooded head. As it disappears, a dense fog rolls into the village. Villagers claim to see strange figures moving in the mist, their productivity reduced by fear.",
          };
        },
      },
      {
        id: "answerWolf",
        label: "Wolf",
        effect: (state: GameState) => {
          const fogDuration = 5 * 60 * 1000; // 5 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage:
              "The figure shakes its hooded head. As it disappears, a dense fog rolls into the village. Villagers claim to see strange figures moving in the mist, their productivity reduced by fear.",
          };
        },
      },
      {
        id: "answerMan",
        label: "Man",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 300,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage:
              "The figure bows slightly in acknowledgment. 'You have answered wisely,' it whispers before fading into shadow. A leather pouch with 300 gold appears at your feet.",
          };
        },
      },
      {
        id: "answerBird",
        label: "Bird",
        effect: (state: GameState) => {
          const fogDuration = 5 * 60 * 1000; // 5 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage:
              "The figure shakes its hooded head. As it disappears, a dense fog rolls into the village. Villagers claim to see strange figures moving in the mist, their productivity reduced by fear.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const fogDuration = 5 * 60 * 1000; // 5 minutes
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
          },
          events: {
            ...state.events,
            riddleOfAges: true,
          },
          _logMessage:
            "You remain silent. The figure's disappointment is palpable as it vanishes, leaving behind a dense fog that engulfs the village. Strange shapes move within the mist.",
        };
      },
    },
  },

  riddleOfDevourer: {
    id: "riddleOfDevourer",
    condition: (state: GameState) => state.events.riddleOfAges === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "Riddle of the Devourer",
    message:
      "Once again, the mysterious figure appears at your door. Its voice reverberates like the toll of a distant bell: 'All things it devours, turns bones to dust, slays kings, wears mountains down, erases towns.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "answerMan",
        label: "Man",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 18 + 6 * state.CM),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: `The figure's silence is deafening. When dawn breaks, you discover ${18 + 6 * state.CM} villagers dead, their bodies cold and lifeless.`,
          };
        },
      },
      {
        id: "answerWater",
        label: "Water",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 18 + 6 * state.CM),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: `The figure's silence is deafening. When dawn breaks, you discover ${18 + 6 * state.CM} villagers dead, their bodies cold and lifeless.`,
          };
        },
      },
      {
        id: "answerTime",
        label: "Time",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 400,
            },
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage:
              "The figure seems to smile beneath its hood. 'You understand the eternal truth,' it whispers. A heavy coin purse containing 400 gold materializes before you.",
          };
        },
      },
      {
        id: "answerFire",
        label: "Fire",
        effect: (state: GameState) => {
          return {
            ...killVillagers(state, 18 + 6 * state.CM),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: `The figure's silence is deafening. When dawn breaks, you discover ${18 + 6 * state.CM} villagers dead, their bodies cold and lifeless.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        return {
          ...killVillagers(state, 18 + 6 * state.CM),
          events: {
            ...state.events,
            riddleOfDevourer: true,
          },
          _logMessage: `Your silence seals their fate. By morning, ${18 + 6 * state.CM} villagers lie dead in their beds, their lives claimed by an unseen force.`,
        };
      },
    },
  },

  riddleOfTears: {
    id: "riddleOfTears",
    condition: (state: GameState) => state.events.riddleOfDevourer === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "Riddle of Tears",
    message:
      "The cloaked figure materializes from the darkness once more. Its voice carries the weight of sorrow: 'Flies without wings, cries without eyes, darkness follows wherever it goes.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "answerNight",
        label: "Night",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage:
              "An incorrect answer. The figure vanishes as an oppressive fog descends upon the village, thicker than before. The villagers huddle in fear as shadows dance within the mist for what feels like an eternity.",
          };
        },
      },
      {
        id: "answerWind",
        label: "Wind",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage:
              "An incorrect answer. The figure vanishes as an oppressive fog descends upon the village, thicker than before. The villagers huddle in fear as shadows dance within the mist for what feels like an eternity.",
          };
        },
      },
      {
        id: "answerClouds",
        label: "Clouds",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 500,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage:
              "The figure nods approvingly. 'Your wisdom grows with each trial,' it intones. A chest containing 500 gold appears as the figure fades into the night.",
          };
        },
      },
      {
        id: "answerShadow",
        label: "Shadow",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage:
              "An incorrect answer. The figure vanishes as an oppressive fog descends upon the village, thicker than before. The villagers huddle in fear as shadows dance within the mist for what feels like an eternity.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const fogDuration = 10 * 60 * 1000; // 10 minutes
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
          },
          events: {
            ...state.events,
            riddleOfTears: true,
          },
          _logMessage:
            "Your hesitation is met with disapproval. As the figure departs, a thick fog engulfs everything, lasting far longer than before. Fear grips the village.",
        };
      },
    },
  },

  riddleOfEternal: {
    id: "riddleOfEternal",
    condition: (state: GameState) => state.events.riddleOfTears === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "Final Riddle",
    message:
      "The figure appears one last time, its presence more foreboding than ever. Its voice echoes with finality: 'Your eyes are open, I am there, your eyes are closed, I am there too.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "answerLight",
        label: "Light",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          const deathResult = killVillagers(state, 22 + 6 * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: `Wrong. The figure raises its arms as both fog and death descend upon your village. ${22 + 6 * state.CM} villagers perish, and a suffocating fog blankets the settlement for a terrible duration.`,
          };
        },
      },
      {
        id: "answerLife",
        label: "Life",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          const deathResult = killVillagers(state, 22 + 6 * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: `Wrong. The figure raises its arms as both fog and death descend upon your village. ${22 + 6 * state.CM} villagers perish, and a suffocating fog blankets the settlement for a terrible duration.`,
          };
        },
      },
      {
        id: "answerDarkness",
        label: "Darkness",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + 750,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage:
              "The figure bows deeply. 'You have proven yourself worthy through all trials. This is my final gift to you.' A magnificent chest filled with 750 gold appears. The figure then dissolves into the darkness, never to return.",
          };
        },
      },
      {
        id: "answerDeath",
        label: "Death",
        effect: (state: GameState) => {
          const fogDuration = 10 * 60 * 1000; // 10 minutes
          const deathResult = killVillagers(state, 22 + 6 * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: `Wrong. The figure raises its arms as both fog and death descend upon your village. ${22 + 6 * state.CM} villagers perish, and a suffocating fog blankets the settlement for a terrible duration.`,
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const fogDuration = 10 * 60 * 1000; // 10 minutes
        const deathResult = killVillagers(state, 22 + 6 * state.CM);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
          },
          events: {
            ...state.events,
            riddleOfEternal: true,
          },
          _logMessage: `Your silence seals your doom. The figure unleashes both death and fog upon the village. ${22 + 6 * state.CM} souls are lost, and an impenetrable mist shrouds everything.`,
        };
      },
    },
  },
};
