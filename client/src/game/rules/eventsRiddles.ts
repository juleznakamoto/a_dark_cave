import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { StateManager } from "../state";

// Riddle rewards (gold amounts)
const RIDDLE_REWARDS = {
  first: 150,
  second: 200,
  third: 250,
  fourth: 300,
  fifth: 350,
} as const;

// Riddle penalties
const RIDDLE_PENALTIES = {
  first: {
    deaths: 12 + 6*state.CM,
  },
  second: {
    fogDuration: (10+5*StateManager.CM) * 60 * 1000, // 10 minutes in milliseconds
  },
  third: {
    deaths: 18,
    cmMultiplier: 6,
  },
  fourth: {
    fogDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
  },
  fifth: {
    fogDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    deaths: 24,
    cmMultiplier: 6,
  },
} as const;

// Questions
const START_MESSAGES = {
  first:
    "A knock echoes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.'",
  second:
    "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: 'Goes on four feet in the morning, two feet at noon, and three feet in the evening.'",
  third:
    "Once again, the mysterious figure appears at the estate. It whispers with a low voice: 'All things it devours, turns bones to dust, slays kings, wears mountains down, erases towns.'",
  fourth:
    "The hulled figure appears once more at the estate. It whispers: 'Flies without wings, cries without eyes, darkness follows wherever it goes.'",
  fifth:
    "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: 'Your eyes are open, I am there, your eyes are closed, I am there too.'",
};

// Success messages
const SUCCESS_MESSAGES = {
  first: (gold: number) =>
    `The figure nods its head slightly before fading into the darkness. By morning, a small bag with ${gold} gold rests upon the estate's doorstep.`,
  second: (gold: number) =>
    `The figure gives a faint nod and vanishes into the night. At dawn, a weathered leather pouch with ${gold} gold lies where it stood.`,
  third: (gold: number) =>
    `The figure tilts its head in quiet acknowledgment before stepping back into the dim. When morning comes, a worn coin purse with ${gold} gold is found outside the door.`,
  fourth: (gold: number) =>
    `The figure lowers its hooded head for a moment before dissolving into the shadows. A small sack containing ${gold} gold remains behind on the cold ground.`,
  fifth: (gold: number) =>
    `The figure bows its head in silent reverence before fading completely. A big sack filled with ${gold} lays on the ground where it stood.`,
} as const;

// Wrong answer messages
const WRONG_ANSWER_MESSAGES = {
  first: (deaths: number) =>
    `The figure slowly shakes its head before vanishing into the night. By morning, ${deaths} villagers are found in their beds with slit throats.`,
  second: () =>
    "The figure turns its hooded head side to side, then disappears without a sound. The next day, a dense fog creeps into the village. Villagers claim to see shifting shapes within it, many are too fearful to leave their huts.",
  third: (deaths: number) =>
    `The figure gives a slow, disapproving shake of the head before fading away. When dawn breaks, ${deaths} villagers are found dead, mouths frozen in silent screams.`,
  fourth: () =>
    "The figure shakes its head faintly, then fades from sight. The following day, a heavy fog engulfs the village. Shadows seemt to move within the mist, many villagers are too scared to leave their huts.",
  fifth: (deaths: number) =>
    `The figure slowly shakes its head in rejection, then dissolves into the dark. The next day, a fog descends upon the village. ${deaths} villagers perish as the suffocating mist blankets the land.`,
} as const;

// Timeout messages
const TIMEOUT_MESSAGES = WRONG_ANSWER_MESSAGES;

export const riddleEvents: Record<string, GameEvent> = {
  whispererInTheDark: {
    id: "whispererInTheDark",
    condition: (state: GameState) => state.buildings.darkEstate >= 1,
    triggerType: "resource",
    timeProbability: 45,
    title: "Whisperer in the Dark",
    message: START_MESSAGES.first,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [
      {
        id: "answerFire",
        label: "Fire",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.deaths +
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
            RIDDLE_PENALTIES.first.deaths +
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
            RIDDLE_PENALTIES.first.deaths +
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
          RIDDLE_PENALTIES.first.deaths +
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
    title: "Voices in the Dark",
    message: START_MESSAGES.second,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [
      {
        id: "answerEarth",
        label: "Earth",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.second.fogDuration,
              duration: RIDDLE_PENALTIES.second.fogDuration,
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
              duration: RIDDLE_PENALTIES.second.fogDuration,
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
              duration: RIDDLE_PENALTIES.second.fogDuration,
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
            duration: RIDDLE_PENALTIES.second.fogDuration,
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
    title: "A nightly Visitor",
    message: START_MESSAGES.third,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [
      {
        id: "answerMan",
        label: "Man",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.deaths +
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
            RIDDLE_PENALTIES.third.deaths +
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
            RIDDLE_PENALTIES.third.deaths +
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
          RIDDLE_PENALTIES.third.deaths +
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
    title: "A hooded Guest",
    message: START_MESSAGES.fourth,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [
      {
        id: "answerNight",
        label: "Night",
        effect: (state: GameState) => {
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fourth.fogDuration,
              duration: RIDDLE_PENALTIES.fourth.fogDuration,
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
              duration: RIDDLE_PENALTIES.fourth.fogDuration,
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
              duration: RIDDLE_PENALTIES.fourth.fogDuration,
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
            duration: RIDDLE_PENALTIES.fourth.fogDuration,
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
    title: "The unknown Guest",
    message: START_MESSAGES.fifth,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [
      {
        id: "answerLight",
        label: "Light",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
              duration: RIDDLE_PENALTIES.fifth.fogDuration,
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
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
              duration: RIDDLE_PENALTIES.fifth.fogDuration,
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
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
              duration: RIDDLE_PENALTIES.fifth.fogDuration,
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
          RIDDLE_PENALTIES.fifth.deaths +
          RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
        const deathResult = killVillagers(state, deaths);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + RIDDLE_PENALTIES.fifth.fogDuration,
            duration: RIDDLE_PENALTIES.fifth.fogDuration,
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