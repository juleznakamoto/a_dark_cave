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
  deaths: {
    base: 12,
    cmMultiplier: 6,
  },
  fog: {
    baseDuration: 10 * 60 * 1000, // 10 minutes in milliseconds
    durationCM: 5 * 60 * 1000, // Additional 5 minutes per CM
  },
  deathsHeavy: {
    base: 18,
    cmMultiplier: 6,
  },
  fogHeavy: {
    baseDuration: 15 * 60 * 1000, // 15 minutes in milliseconds
    durationCM: 5 * 60 * 1000, // Additional 5 minutes per CM
  },
  combined: {
    deaths: 24,
    cmMultiplier: 6,
    fogDuration: 15 * 60 * 1000,
    fogDurationCM: 5 * 60 * 1000,
  },
} as const;

// Riddle pool
interface Riddle {
  id: string;
  question: string;
  correctAnswer: string;
  wrongAnswers: string[];
  penaltyType: 'deaths' | 'fog' | 'deathsHeavy' | 'fogHeavy' | 'combined';
}

const RIDDLE_POOL: Riddle[] = [
  {
    id: "riddle_wind",
    question: "Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.",
    correctAnswer: "Wind",
    wrongAnswers: ["Fire", "Tree", "Bones"],
    penaltyType: 'deaths',
  },
  {
    id: "riddle_man",
    question: "Goes on four feet in the morning, two feet at noon, and three feet in the evening.",
    correctAnswer: "Man",
    wrongAnswers: ["Earth", "Wolf", "Bird"],
    penaltyType: 'fog',
  },
  {
    id: "riddle_time",
    question: "All things it devours, turns bones to dust, slays kings, wears mountains down, erases towns.",
    correctAnswer: "Time",
    wrongAnswers: ["Man", "Water", "Fire"],
    penaltyType: 'deathsHeavy',
  },
  {
    id: "riddle_clouds",
    question: "Flies without wings, cries without eyes, darkness follows wherever it goes.",
    correctAnswer: "Clouds",
    wrongAnswers: ["Night", "Wind", "Shadow"],
    penaltyType: 'fogHeavy',
  },
  {
    id: "riddle_darkness",
    question: "Your eyes are open, I am there, your eyes are closed, I am there too.",
    correctAnswer: "Darkness",
    wrongAnswers: ["Light", "Life", "Death"],
    penaltyType: 'combined',
  },
];

// Success messages
const getSuccessMessage = (gold: number, riddleNumber: number): string => {
  const messages = [
    `The figure nods its head slightly before fading into the darkness. By morning, a small bag with ${gold} gold rests upon the estate's doorstep.`,
    `The figure gives a faint nod and vanishes into the night. At dawn, a weathered leather pouch with ${gold} gold lies where it stood.`,
    `The figure tilts its head in quiet acknowledgment before stepping back into the dim. When morning comes, a worn coin purse with ${gold} gold is found outside the door.`,
    `The figure lowers its hooded head for a moment before dissolving into the shadows. A small sack containing ${gold} gold remains behind on the cold ground.`,
    `The figure bows its head in silent reverence before fading completely. A big sack filled with ${gold} lays on the ground where it stood.`,
  ];
  return messages[riddleNumber - 1] || messages[0];
};

// Wrong answer messages
const getWrongAnswerMessage = (penaltyType: string, deaths?: number): string => {
  switch (penaltyType) {
    case 'deaths':
      return `The figure slowly shakes its head before vanishing into the night. By morning, ${deaths} villagers are found in their beds with slit throats.`;
    case 'fog':
      return "The figure turns its hooded head side to side, then disappears without a sound. The next day, a dense fog creeps into the village. Villagers claim to see shifting shapes within it, many are too fearful to leave their huts.";
    case 'deathsHeavy':
      return `The figure gives a slow, disapproving shake of the head before fading away. When dawn breaks, ${deaths} villagers are found dead, mouths frozen in silent screams.`;
    case 'fogHeavy':
      return "The figure shakes its head faintly, then fades from sight. The following day, a heavy fog engulfs the village. Shadows seemt to move within the mist, many villagers are too scared to leave their huts.";
    case 'combined':
      return `The figure slowly shakes its head in rejection, then dissolves into the dark. The next day, a fog descends upon the village. ${deaths} villagers perish as the suffocating mist blankets the land.`;
    default:
      return "The figure vanishes into the darkness.";
  }
};

// Start messages
const START_MESSAGES = [
  "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: ",
  "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: ",
  "Once again, the mysterious figure appears at the estate. It whispers with a low voice: ",
  "The hulled figure appears once more at the estate. It whispers: ",
  "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: ",
];

// Helper function to get unused riddle
const getUnusedRiddle = (state: GameState): Riddle | null => {
  const usedRiddleIds = state.events.usedRiddleIds || [];
  const availableRiddles = RIDDLE_POOL.filter(r => !usedRiddleIds.includes(r.id));

  if (availableRiddles.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * availableRiddles.length);
  return availableRiddles[randomIndex];
};

// Helper function to create riddle choices
const createRiddleChoices = (riddle: Riddle, riddleNumber: number, reward: number) => {
  const allAnswers = [riddle.correctAnswer, ...riddle.wrongAnswers];
  // Shuffle answers
  const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

  return shuffledAnswers.map(answer => ({
    id: `answer${answer.replace(/\s+/g, '')}`,
    label: answer,
    effect: (state: GameState) => {
      const isCorrect = answer === riddle.correctAnswer;

      if (isCorrect) {
        return {
          resources: {
            ...state.resources,
            gold: state.resources.gold + reward,
          },
          events: {
            ...state.events,
            [`riddle${riddleNumber}_correct`]: true,
            usedRiddleIds: [...(state.events.usedRiddleIds || []), riddle.id],
          },
          _logMessage: getSuccessMessage(reward, riddleNumber),
        };
      } else {
        // Apply penalty based on riddle type
        const usedRiddleIds = [...(state.events.usedRiddleIds || []), riddle.id];

        switch (riddle.penaltyType) {
          case 'deaths': {
            const deaths = RIDDLE_PENALTIES.deaths.base + RIDDLE_PENALTIES.deaths.cmMultiplier * state.CM;
            return {
              ...killVillagers(state, deaths),
              events: {
                ...state.events,
                usedRiddleIds,
              },
              _logMessage: getWrongAnswerMessage('deaths', deaths),
            };
          }
          case 'fog': {
            const fogDuration = RIDDLE_PENALTIES.fog.baseDuration + (RIDDLE_PENALTIES.fog.durationCM * state.CM);
            return {
              fogState: {
                isActive: true,
                endTime: Date.now() + fogDuration,
                duration: fogDuration,
              },
              events: {
                ...state.events,
                usedRiddleIds,
              },
              _logMessage: getWrongAnswerMessage('fog'),
            };
          }
          case 'deathsHeavy': {
            const deaths = RIDDLE_PENALTIES.deathsHeavy.base + RIDDLE_PENALTIES.deathsHeavy.cmMultiplier * state.CM;
            return {
              ...killVillagers(state, deaths),
              events: {
                ...state.events,
                usedRiddleIds,
              },
              _logMessage: getWrongAnswerMessage('deathsHeavy', deaths),
            };
          }
          case 'fogHeavy': {
            const fogDuration = RIDDLE_PENALTIES.fogHeavy.baseDuration + (RIDDLE_PENALTIES.fogHeavy.durationCM * state.CM);
            return {
              fogState: {
                isActive: true,
                endTime: Date.now() + fogDuration,
                duration: fogDuration,
              },
              events: {
                ...state.events,
                usedRiddleIds,
              },
              _logMessage: getWrongAnswerMessage('fogHeavy'),
            };
          }
          case 'combined': {
            const deaths = RIDDLE_PENALTIES.combined.deaths + RIDDLE_PENALTIES.combined.cmMultiplier * state.CM;
            const deathResult = killVillagers(state, deaths);
            const fogDuration = RIDDLE_PENALTIES.combined.fogDuration + (RIDDLE_PENALTIES.combined.fogDurationCM * state.CM);
            return {
              ...deathResult,
              fogState: {
                isActive: true,
                endTime: Date.now() + fogDuration,
                duration: fogDuration,
              },
              events: {
                ...state.events,
                usedRiddleIds,
              },
              _logMessage: getWrongAnswerMessage('combined', deaths),
            };
          }
          default:
            return { events: { ...state.events, usedRiddleIds } };
        }
      }
    },
  }));
};

// Helper function to create fallback choice
const createFallbackChoice = (riddle: Riddle) => ({
  id: "timeout",
  label: "No answer given",
  effect: (state: GameState) => {
    const usedRiddleIds = [...(state.events.usedRiddleIds || []), riddle.id];

    switch (riddle.penaltyType) {
      case 'deaths': {
        const deaths = RIDDLE_PENALTIES.deaths.base + RIDDLE_PENALTIES.deaths.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            usedRiddleIds,
          },
          _logMessage: getWrongAnswerMessage('deaths', deaths),
        };
      }
      case 'fog': {
        const fogDuration = RIDDLE_PENALTIES.fog.baseDuration + (RIDDLE_PENALTIES.fog.durationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            usedRiddleIds,
          },
          _logMessage: getWrongAnswerMessage('fog'),
        };
      }
      case 'deathsHeavy': {
        const deaths = RIDDLE_PENALTIES.deathsHeavy.base + RIDDLE_PENALTIES.deathsHeavy.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            usedRiddleIds,
          },
          _logMessage: getWrongAnswerMessage('deathsHeavy', deaths),
        };
      }
      case 'fogHeavy': {
        const fogDuration = RIDDLE_PENALTIES.fogHeavy.baseDuration + (RIDDLE_PENALTIES.fogHeavy.durationCM * state.CM);
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            usedRiddleIds,
          },
          _logMessage: getWrongAnswerMessage('fogHeavy'),
        };
      }
      case 'combined': {
        const deaths = RIDDLE_PENALTIES.combined.deaths + RIDDLE_PENALTIES.combined.cmMultiplier * state.CM;
        const deathResult = killVillagers(state, deaths);
        const fogDuration = RIDDLE_PENALTIES.combined.fogDuration + (RIDDLE_PENALTIES.combined.fogDurationCM * state.CM);
        return {
          ...deathResult,
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            usedRiddleIds,
          },
          _logMessage: getWrongAnswerMessage('combined', deaths),
        };
      }
      default:
        return { events: { ...state.events, usedRiddleIds } };
    }
  },
});

export const riddleEvents: Record<string, GameEvent> = {
  whisperersReward: {
    id: "whisperersReward",
    condition: (state: GameState) => {
      const usedRiddleIds = state.events.usedRiddleIds || [];
      return usedRiddleIds.length >= 5 && !state.events.whisperersReward;
    },
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
    condition: (state: GameState) => {
      return state.buildings.darkEstate >= 1 && !(state.events.usedRiddleIds || []).length;
    },
    triggerType: "resource",
    timeProbability: 30,
    title: "Whisperer in the Dark",
    message: "",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [],
    fallbackChoice: { id: "timeout", label: "No answer given", effect: () => ({}) },
    dynamicSetup: (state: GameState) => {
      const riddle = getUnusedRiddle(state);
      if (!riddle) return null;

      return {
        message: START_MESSAGES[0] + `'${riddle.question}'`,
        choices: createRiddleChoices(riddle, 1, RIDDLE_REWARDS.first),
        fallbackChoice: createFallbackChoice(riddle),
      };
    },
  },

  riddleOfAges: {
    id: "riddleOfAges",
    condition: (state: GameState) => {
      const usedRiddleIds = state.events.usedRiddleIds || [];
      return usedRiddleIds.length === 1;
    },
    triggerType: "resource",
    timeProbability: 45,
    title: "Voices in the Dark",
    message: "",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [],
    fallbackChoice: { id: "timeout", label: "No answer given", effect: () => ({}) },
    dynamicSetup: (state: GameState) => {
      const riddle = getUnusedRiddle(state);
      if (!riddle) return null;

      return {
        message: START_MESSAGES[1] + `'${riddle.question}'`,
        choices: createRiddleChoices(riddle, 2, RIDDLE_REWARDS.second),
        fallbackChoice: createFallbackChoice(riddle),
      };
    },
  },

  riddleOfDevourer: {
    id: "riddleOfDevourer",
    condition: (state: GameState) => {
      const usedRiddleIds = state.events.usedRiddleIds || [];
      return usedRiddleIds.length === 2;
    },
    triggerType: "resource",
    timeProbability: 45,
    title: "A nightly Visitor",
    message: "",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [],
    fallbackChoice: { id: "timeout", label: "No answer given", effect: () => ({}) },
    dynamicSetup: (state: GameState) => {
      const riddle = getUnusedRiddle(state);
      if (!riddle) return null;

      return {
        message: START_MESSAGES[2] + `'${riddle.question}'`,
        choices: createRiddleChoices(riddle, 3, RIDDLE_REWARDS.third),
        fallbackChoice: createFallbackChoice(riddle),
      };
    },
  },

  riddleOfTears: {
    id: "riddleOfTears",
    condition: (state: GameState) => {
      const usedRiddleIds = state.events.usedRiddleIds || [];
      return usedRiddleIds.length === 3;
    },
    triggerType: "resource",
    timeProbability: 45,
    title: "A hooded Guest",
    message: "",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [],
    fallbackChoice: { id: "timeout", label: "No answer given", effect: () => ({}) },
    dynamicSetup: (state: GameState) => {
      const riddle = getUnusedRiddle(state);
      if (!riddle) return null;

      return {
        message: START_MESSAGES[3] + `'${riddle.question}'`,
        choices: createRiddleChoices(riddle, 4, RIDDLE_REWARDS.fourth),
        fallbackChoice: createFallbackChoice(riddle),
      };
    },
  },

  riddleOfEternal: {
    id: "riddleOfEternal",
    condition: (state: GameState) => {
      const usedRiddleIds = state.events.usedRiddleIds || [];
      return usedRiddleIds.length === 4;
    },
    triggerType: "resource",
    timeProbability: 45,
    title: "The unknown Guest",
    message: "",
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: [],
    fallbackChoice: { id: "timeout", label: "No answer given", effect: () => ({}) },
    dynamicSetup: (state: GameState) => {
      const riddle = getUnusedRiddle(state);
      if (!riddle) return null;

      return {
        message: START_MESSAGES[4] + `'${riddle.question}'`,
        choices: createRiddleChoices(riddle, 5, RIDDLE_REWARDS.fifth),
        fallbackChoice: createFallbackChoice(riddle),
      };
    },
  },
};