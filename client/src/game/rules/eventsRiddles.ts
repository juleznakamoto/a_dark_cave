
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

// Riddle rewards (gold amounts)
const RIDDLE_REWARDS = {
  first: 200,
  second: 300,
  third: 400,
  fourth: 500,
  fifth: 750,
} as const;

// Riddle penalties
const RIDDLE_PENALTIES = {
  first: {
    baseDeaths: 12,
    cmMultiplier: 6,
  },
  second: {
    fogDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
  },
  third: {
    baseDeaths: 18,
    cmMultiplier: 6,
  },
  fourth: {
    fogDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
  },
  fifth: {
    fogDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
    baseDeaths: 22,
    cmMultiplier: 6,
  },
} as const;

// Success messages
const SUCCESS_MESSAGES = {
  first: (gold: number) =>
    `The figure lightly nods and vanishes briefly after you say the word. In the morning, you find a bag with ${gold} gold on the doorsteps of the estate.`,
  second: (gold: number) =>
    `The figure bows slightly in acknowledgment. 'You have answered wisely,' it whispers before fading into shadow. A leather pouch with ${gold} gold appears at your feet.`,
  third: (gold: number) =>
    `The figure seems to smile beneath its hood. 'You understand the eternal truth,' it whispers. A heavy coin purse containing ${gold} gold materializes before you.`,
  fourth: (gold: number) =>
    `The figure nods approvingly. 'Your wisdom grows with each trial,' it intones. A chest containing ${gold} gold appears as the figure fades into the night.`,
  fifth: (gold: number) =>
    `The figure bows deeply. 'You have proven yourself worthy through all trials. This is my final gift to you.' A magnificent chest filled with ${gold} gold appears. The figure then dissolves into the darkness, never to return.`,
} as const;

// Wrong answer messages
const WRONG_ANSWER_MESSAGES = {
  first: (deaths: number) =>
    `The figure vanishes the very moment you say the word. In the morning, ${deaths} villagers are found in their beds with slit throats.`,
  second: () =>
    "The figure shakes its hooded head. As it disappears, a dense fog rolls into the village. Villagers claim to see strange figures moving in the mist, their productivity reduced by fear.",
  third: (deaths: number) =>
    `The figure's silence is deafening. When dawn breaks, you discover ${deaths} villagers dead, their bodies cold and lifeless.`,
  fourth: () =>
    "An incorrect answer. The figure vanishes as an oppressive fog descends upon the village, thicker than before. The villagers huddle in fear as shadows dance within the mist for what feels like an eternity.",
  fifth: (deaths: number) =>
    `Wrong. The figure raises its arms as both fog and death descend upon your village. ${deaths} villagers perish, and a suffocating fog blankets the settlement for a terrible duration.`,
} as const;

// Timeout messages
const TIMEOUT_MESSAGES = {
  first: (deaths: number) =>
    `The figure vanishes the very moment you say the word. In the morning, ${deaths} villagers are found in their beds with slit throats.`,
  second: () =>
    "You remain silent. The figure's disappointment is palpable as it vanishes, leaving behind a dense fog that engulfs the village. Strange shapes move within the mist.",
  third: (deaths: number) =>
    `Your silence seals their fate. By morning, ${deaths} villagers lie dead in their beds, their lives claimed by an unseen force.`,
  fourth: () =>
    "Your hesitation is met with disapproval. As the figure departs, a thick fog engulfs everything, lasting far longer than before. Fear grips the village.",
  fifth: (deaths: number) =>
    `Your silence seals your doom. The figure unleashes both death and fog upon the village. ${deaths} souls are lost, and an impenetrable mist shrouds everything.`,
} as const;

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
          const deaths =
            RIDDLE_PENALTIES.first.baseDeaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.first(deaths),
          };
        },
      },
      {
        id: "answerTree",
        label: "Tree",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.baseDeaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.first(deaths),
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
              gold: state.resources.gold + RIDDLE_REWARDS.first,
            },
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: SUCCESS_MESSAGES.first(RIDDLE_REWARDS.first),
          };
        },
      },
      {
        id: "answerBones",
        label: "Bones",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.baseDeaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.first(deaths),
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const deaths =
          RIDDLE_PENALTIES.first.baseDeaths +
          RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            whispererInTheDark: true,
          },
          _logMessage: TIMEOUT_MESSAGES.first(deaths),
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
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.second.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.second(),
          };
        },
      },
      {
        id: "answerWolf",
        label: "Wolf",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.second.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.second(),
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
              gold: state.resources.gold + RIDDLE_REWARDS.second,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage: SUCCESS_MESSAGES.second(RIDDLE_REWARDS.second),
          };
        },
      },
      {
        id: "answerBird",
        label: "Bird",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.second.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.second(),
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + RIDDLE_PENALTIES.second.fogDuration,
          },
          events: {
            ...state.events,
            riddleOfAges: true,
          },
          _logMessage: TIMEOUT_MESSAGES.second(),
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
          const deaths =
            RIDDLE_PENALTIES.third.baseDeaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.third(deaths),
          };
        },
      },
      {
        id: "answerWater",
        label: "Water",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.baseDeaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.third(deaths),
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
              gold: state.resources.gold + RIDDLE_REWARDS.third,
            },
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: SUCCESS_MESSAGES.third(RIDDLE_REWARDS.third),
          };
        },
      },
      {
        id: "answerFire",
        label: "Fire",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.baseDeaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.third(deaths),
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const deaths =
          RIDDLE_PENALTIES.third.baseDeaths +
          RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            riddleOfDevourer: true,
          },
          _logMessage: TIMEOUT_MESSAGES.third(deaths),
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
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fourth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fourth(),
          };
        },
      },
      {
        id: "answerWind",
        label: "Wind",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fourth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fourth(),
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
              gold: state.resources.gold + RIDDLE_REWARDS.fourth,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage: SUCCESS_MESSAGES.fourth(RIDDLE_REWARDS.fourth),
          };
        },
      },
      {
        id: "answerShadow",
        label: "Shadow",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fourth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fourth(),
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + RIDDLE_PENALTIES.fourth.fogDuration,
          },
          events: {
            ...state.events,
            riddleOfTears: true,
          },
          _logMessage: TIMEOUT_MESSAGES.fourth(),
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
          const deaths =
            RIDDLE_PENALTIES.fifth.baseDeaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fifth(deaths),
          };
        },
      },
      {
        id: "answerLife",
        label: "Life",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.baseDeaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fifth(deaths),
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
              gold: state.resources.gold + RIDDLE_REWARDS.fifth,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: SUCCESS_MESSAGES.fifth(RIDDLE_REWARDS.fifth),
          };
        },
      },
      {
        id: "answerDeath",
        label: "Death",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.baseDeaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fifth(deaths),
          };
        },
      },
    ],
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: (state: GameState) => {
        const deaths =
          RIDDLE_PENALTIES.fifth.baseDeaths +
          RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
        const deathResult = killVillagers(state, deaths);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
          },
          events: {
            ...state.events,
            riddleOfEternal: true,
          },
          _logMessage: TIMEOUT_MESSAGES.fifth(deaths),
        };
      },
    },
  },
};
