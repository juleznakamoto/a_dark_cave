import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

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
    deaths: 12,
    cmMultiplier: 6,
  },
  second: {
    fogDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
    fogDurationCM: 5 * 60 * 1000, // Additional 5 minutes per CM
  },
  third: {
    deaths: 18,
    cmMultiplier: 6,
  },
  fourth: {
    fogDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    fogDurationCM: 5 * 60 * 1000, // Additional 5 minutes per CM
  },
  fifth: {
    fogDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    fogDurationCM: 5 * 60 * 1000, // Additional 5 minutes per CM
    deaths: 24,
    cmMultiplier: 6,
  },
} as const;

// Questions
const START_MESSAGES = {
  first:
    "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.'",
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
  // Variant riddles - mutually exclusive with originals
  whispererInTheDark_variant: {
    id: "whispererInTheDark_variant",
    condition: (state: GameState) => 
      state.buildings.darkEstate >= 1 && 
      !state.events.whispererInTheDark, // Only if original hasn't triggered
    triggerType: "resource",
    timeProbability: 30,
    title: "Whisperer in the Dark",
    message: "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'A lady's desire, grown in darkness, shining with pale light.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerSilver",
        label: "Silver",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.deaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.first(deaths),
          };
        },
      },
      {
        id: "answerPearl",
        label: "Pearl",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + RIDDLE_REWARDS.first,
            },
            events: {
              ...state.events,
              whispererInTheDark_variant: true,
              whispererInTheDark_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.first(RIDDLE_REWARDS.first),
          };
        },
      },
      {
        id: "answerGold",
        label: "Gold",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.deaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.first(deaths),
          };
        },
      },
      {
        id: "answerDiamond",
        label: "Diamond",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.first.deaths +
            RIDDLE_PENALTIES.first.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              whispererInTheDark_variant: true,
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
            whispererInTheDark_variant: true,
          },
          _logMessage: TIMEOUT_MESSAGES.first(deaths),
        };
      },
    },
  },

  riddleOfAges_variant: {
    id: "riddleOfAges_variant",
    condition: (state: GameState) => 
      state.events.whispererInTheDark === true && 
      !state.events.riddleOfAges, // Only if original hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "Voices in the Dark",
    message: "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: 'Can't hurt you, but leaves you with scars.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerNightmares",
        label: "Nightmares",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.second(),
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
              gold: state.resources.gold + RIDDLE_REWARDS.second,
            },
            events: {
              ...state.events,
              riddleOfAges_variant: true,
              riddleOfAges_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.second(RIDDLE_REWARDS.second),
          };
        },
      },
      {
        id: "answerLove",
        label: "Love",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.second(),
          };
        },
      },
      {
        id: "answerDeath",
        label: "Death",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfAges_variant: true,
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
        const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
          (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            riddleOfAges_variant: true,
          },
          _logMessage: TIMEOUT_MESSAGES.second(),
        };
      },
    },
  },

  riddleOfDevourer_variant: {
    id: "riddleOfDevourer_variant",
    condition: (state: GameState) => 
      state.events.riddleOfAges === true && 
      !state.events.riddleOfDevourer, // Only if original hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "A nightly Visitor",
    message: "Once again, the mysterious figure appears at the estate. It whispers with a low voice: 'It has fingers yet no flesh, no feathers, no scales, no bone.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerFin",
        label: "Fin",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.deaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.third(deaths),
          };
        },
      },
      {
        id: "answerWing",
        label: "Wing",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.deaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.third(deaths),
          };
        },
      },
      {
        id: "answerGlove",
        label: "Glove",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + RIDDLE_REWARDS.third,
            },
            events: {
              ...state.events,
              riddleOfDevourer_variant: true,
              riddleOfDevourer_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.third(RIDDLE_REWARDS.third),
          };
        },
      },
      {
        id: "answerHand",
        label: "Hand",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.third.deaths +
            RIDDLE_PENALTIES.third.cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              riddleOfDevourer_variant: true,
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
            riddleOfDevourer_variant: true,
          },
          _logMessage: TIMEOUT_MESSAGES.third(deaths),
        };
      },
    },
  },

  riddleOfTears_variant: {
    id: "riddleOfTears_variant",
    condition: (state: GameState) => 
      state.events.riddleOfDevourer === true && 
      !state.events.riddleOfTears, // Only if original hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "A hooded Guest",
    message: "The hulled figure appears once more at the estate. It whispers: 'Soft, delicate, silky, but if you're wrapped in me, you scream.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerNightmares",
        label: "Nightmares",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fourth(),
          };
        },
      },
      {
        id: "answerCobweb",
        label: "Cobweb",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + RIDDLE_REWARDS.fourth,
            },
            events: {
              ...state.events,
              riddleOfTears_variant: true,
              riddleOfTears_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.fourth(RIDDLE_REWARDS.fourth),
          };
        },
      },
      {
        id: "answerSilk",
        label: "Silk",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fourth(),
          };
        },
      },
      {
        id: "answerDeath",
        label: "Death",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfTears_variant: true,
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
        const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
          (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            riddleOfTears_variant: true,
          },
          _logMessage: TIMEOUT_MESSAGES.fourth(),
        };
      },
    },
  },

  riddleOfEternal_variant: {
    id: "riddleOfEternal_variant",
    condition: (state: GameState) => 
      state.events.riddleOfTears === true && 
      !state.events.riddleOfEternal, // Only if original hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "The unknown Guest",
    message: "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: 'Poor have me, rich have me. Eat me, you die.'",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerPoison",
        label: "Poison",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fifth(deaths),
          };
        },
      },
      {
        id: "answerAir",
        label: "Air",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal_variant: true,
            },
            _logMessage: WRONG_ANSWER_MESSAGES.fifth(deaths),
          };
        },
      },
      {
        id: "answerNothing",
        label: "Nothing",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold + RIDDLE_REWARDS.fifth,
            },
            events: {
              ...state.events,
              riddleOfEternal_variant: true,
              riddleOfEternal_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.fifth(RIDDLE_REWARDS.fifth),
          };
        },
      },
      {
        id: "answerTime",
        label: "Time",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              riddleOfEternal_variant: true,
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
        const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
          (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            riddleOfEternal_variant: true,
          },
          _logMessage: TIMEOUT_MESSAGES.fifth(deaths),
        };
      },
    },
  },

  whisperersReward: {
    id: "whisperersReward",
    condition: (state: GameState) => 
      state.events.whispererInTheDark_correct === true &&
      state.events.riddleOfAges_correct === true &&
      state.events.riddleOfDevourer_correct === true &&
      state.events.riddleOfTears_correct === true &&
      state.events.riddleOfEternal_correct === true &&
      !state.events.whisperersReward,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Whisperer's Gift",
    message: "The cloaked figure appears again. His whispers drift through the cold night air one last time before he vanishes, 'Your wisdom has been weighed and found worthy. May shadows guard your path, and fortune follow your name.'",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "accept",
        label: "Accept gift",
        effect: (state: GameState) => {
          return {
            blessings: {
              ...state.blessings,
              whisperers_mark: true,
            },
            events: {
              ...state.events,
              whisperersReward: true,
            },
            _logMessage: "As the figure fades into the dark, a faint euphoria washes over you, quiet and fleeting, like a half-remembered memory of a better time.",
          };
        },
      },
    ],
  },

  whispererInTheDark: {
    id: "whispererInTheDark",
    condition: (state: GameState) => 
      state.buildings.darkEstate >= 1 && 
      !state.events.whispererInTheDark_variant, // Only if variant hasn't triggered
    triggerType: "resource",
    timeProbability: 30,
    title: "Whisperer in the Dark",
    message: START_MESSAGES.first,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
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
              whispererInTheDark_correct: true,
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
    condition: (state: GameState) => 
      state.events.whispererInTheDark === true && 
      !state.events.riddleOfAges_variant, // Only if variant hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "Voices in the Dark",
    message: START_MESSAGES.second,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerEarth",
        label: "Earth",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
              riddleOfAges_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.second(RIDDLE_REWARDS.second),
          };
        },
      },
      {
        id: "answerBird",
        label: "Bird",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
            (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
        const fogDuration = RIDDLE_PENALTIES.second.fogDuration + 
          (RIDDLE_PENALTIES.second.fogDurationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
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
    condition: (state: GameState) => 
      state.events.riddleOfAges === true && 
      !state.events.riddleOfDevourer_variant, // Only if variant hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "A nightly Visitor",
    message: START_MESSAGES.third,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
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
              riddleOfDevourer_correct: true,
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
    condition: (state: GameState) => 
      state.events.riddleOfDevourer === true && 
      !state.events.riddleOfTears_variant, // Only if variant hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "A hooded Guest",
    message: START_MESSAGES.fourth,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerNight",
        label: "Night",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
              riddleOfTears_correct: true,
            },
            _logMessage: SUCCESS_MESSAGES.fourth(RIDDLE_REWARDS.fourth),
          };
        },
      },
      {
        id: "answerShadow",
        label: "Shadow",
        effect: (state: GameState) => {
          const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
            (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
        const fogDuration = RIDDLE_PENALTIES.fourth.fogDuration + 
          (RIDDLE_PENALTIES.fourth.fogDurationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
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
    condition: (state: GameState) => 
      state.events.riddleOfTears === true && 
      !state.events.riddleOfEternal_variant, // Only if variant hasn't triggered
    triggerType: "resource",
    timeProbability: 45,
    title: "The unknown Guest",
    message: START_MESSAGES.fifth,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: [
      {
        id: "answerLight",
        label: "Light",
        effect: (state: GameState) => {
          const deaths =
            RIDDLE_PENALTIES.fifth.deaths +
            RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
              riddleOfEternal_correct: true,
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
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
            (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
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
        const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + 
          (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
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