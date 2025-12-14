import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

// Riddle pool - each riddle has question, correct answer, and wrong answers
const RIDDLE_POOL = [
  {
    id: "wind",
    question: "Voiceless it cries, wingless flutters, toothless bites, mouthless mutters.",
    correctAnswer: "Wind",
    wrongAnswers: ["Fire", "Tree", "Bones"],
  },
  {
    id: "man",
    question: "Goes on four feet in the morning, two feet at noon, and three feet in the evening.",
    correctAnswer: "Man",
    wrongAnswers: ["Earth", "Wolf", "Bird"],
  },
  {
    id: "time",
    question: "All things it devours, turns bones to dust, slays kings, wears mountains down, erases towns.",
    correctAnswer: "Time",
    wrongAnswers: ["Man", "Water", "Fire"],
  },
  {
    id: "clouds",
    question: "Flies without wings, cries without eyes, darkness follows wherever it goes.",
    correctAnswer: "Clouds",
    wrongAnswers: ["Night", "Wind", "Shadow"],
  },
  {
    id: "darkness",
    question: "Your eyes are open, I am there, your eyes are closed, I am there too.",
    correctAnswer: "Darkness",
    wrongAnswers: ["Light", "Life", "Death"],
  },
] as const;

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

const getStartMessage = (riddleQuestion: string, visitNumber: number) => {
  const prefixes = [
    "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: '",
    "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: '",
    "Once again, the mysterious figure appears at the estate. It whispers with a low voice: '",
    "The hulled figure appears once more at the estate. It whispers: '",
    "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: '",
  ];
  return prefixes[visitNumber - 1] + riddleQuestion + "'";
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

// Simple seeded random number generator
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Helper function to get an unused riddle deterministically
const getUnusedRiddle = (state: GameState, eventId: string): typeof RIDDLE_POOL[number] | null => {
  const usedRiddles = state.events.usedRiddleIds || [];
  const availableRiddles = RIDDLE_POOL.filter(riddle => !usedRiddles.includes(riddle.id));

  if (availableRiddles.length === 0) {
    return null;
  }

  // Create a deterministic seed from game state
  const seed = state.resources.gold + state.current_population + usedRiddles.length + eventId.length;
  const index = Math.floor(seededRandom(seed) * availableRiddles.length);
  
  return availableRiddles[index];
};

// Helper function to create riddle choices
const createRiddleChoices = (
  riddle: typeof RIDDLE_POOL[number],
  riddleNumber: "first" | "second" | "third" | "fourth" | "fifth",
  eventId: string,
  eventIdCorrect: string,
  state: GameState
) => {
  // Deterministically shuffle the answers using game state as seed
  const allAnswers = [riddle.correctAnswer, ...riddle.wrongAnswers];
  const seed = state.resources.gold + state.current_population + riddle.id.length;
  
  // Fisher-Yates shuffle with seeded random
  const shuffledAnswers = [...allAnswers];
  for (let i = shuffledAnswers.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffledAnswers[i], shuffledAnswers[j]] = [shuffledAnswers[j], shuffledAnswers[i]];
  }

  // Capture the correct answer in the closure
  const correctAnswer = riddle.correctAnswer;
  const riddleId = riddle.id;

  return shuffledAnswers.map(answer => ({
    id: `answer${answer}`,
    label: answer,
    effect: (state: GameState) => {
      const isCorrect = answer === correctAnswer;

      if (isCorrect) {
        return {
          resources: {
            ...state.resources,
            gold: state.resources.gold + RIDDLE_REWARDS[riddleNumber],
          },
          events: {
            ...state.events,
            [eventId]: true,
            [eventIdCorrect]: true,
            usedRiddleIds: [...(state.events.usedRiddleIds || []), riddleId],
          },
        } as Partial<GameState>;
      } else {
        // Wrong answer - apply penalty based on riddle number
        if (riddleNumber === "first" || riddleNumber === "third") {
          const deaths = RIDDLE_PENALTIES[riddleNumber].deaths + RIDDLE_PENALTIES[riddleNumber].cmMultiplier * state.CM;
          return {
            ...killVillagers(state, deaths),
            events: {
              ...state.events,
              [eventId]: true,
              usedRiddleIds: [...(state.events.usedRiddleIds || []), riddleId],
            },
          } as Partial<GameState>;
        } else if (riddleNumber === "second" || riddleNumber === "fourth") {
          const fogDuration = RIDDLE_PENALTIES[riddleNumber].fogDuration + (RIDDLE_PENALTIES[riddleNumber].fogDurationCM * state.CM);
          return {
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              [eventId]: true,
              usedRiddleIds: [...(state.events.usedRiddleIds || []), riddleId],
            },
          } as Partial<GameState>;
        } else if (riddleNumber === "fifth") {
          const deaths = RIDDLE_PENALTIES.fifth.deaths + RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
          const deathResult = killVillagers(state, deaths);
          const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
          return {
            ...deathResult,
            fogState: {
              isActive: true,
              endTime: Date.now() + fogDuration,
              duration: fogDuration,
            },
            events: {
              ...state.events,
              [eventId]: true,
              usedRiddleIds: [...(state.events.usedRiddleIds || []), riddleId],
            },
          } as Partial<GameState>;
        }
      }
      return {} as Partial<GameState>;
    },
  }));
};

// Helper function to create fallback choice
const createFallbackChoice = (
  riddle: typeof RIDDLE_POOL[number],
  riddleNumber: "first" | "second" | "third" | "fourth" | "fifth",
  eventId: string
) => ({
  id: "timeout",
  label: "No answer given",
  effect: (state: GameState) => {
    if (riddleNumber === "first" || riddleNumber === "third") {
      const deaths = RIDDLE_PENALTIES[riddleNumber].deaths + RIDDLE_PENALTIES[riddleNumber].cmMultiplier * state.CM;
      return {
        ...killVillagers(state, deaths),
        events: {
          ...state.events,
          [eventId]: true,
          usedRiddleIds: [...(state.events.usedRiddleIds || []), riddle.id],
        },
      } as Partial<GameState>;
    } else if (riddleNumber === "second" || riddleNumber === "fourth") {
      const fogDuration = RIDDLE_PENALTIES[riddleNumber].fogDuration + (RIDDLE_PENALTIES[riddleNumber].fogDurationCM * state.CM);
      return {
        fogState: {
          isActive: true,
          endTime: Date.now() + fogDuration,
          duration: fogDuration,
        },
        events: {
          ...state.events,
          [eventId]: true,
          usedRiddleIds: [...(state.events.usedRiddleIds || []), riddle.id],
        },
      } as Partial<GameState>;
    } else if (riddleNumber === "fifth") {
      const deaths = RIDDLE_PENALTIES.fifth.deaths + RIDDLE_PENALTIES.fifth.cmMultiplier * state.CM;
      const deathResult = killVillagers(state, deaths);
      const fogDuration = RIDDLE_PENALTIES.fifth.fogDuration + (RIDDLE_PENALTIES.fifth.fogDurationCM * state.CM);
      return {
        ...deathResult,
        fogState: {
          isActive: true,
          endTime: Date.now() + fogDuration,
          duration: fogDuration,
        },
        events: {
          ...state.events,
          [eventId]: true,
          usedRiddleIds: [...(state.events.usedRiddleIds || []), riddle.id],
        },
      } as Partial<GameState>;
    }
    return {} as Partial<GameState>;
  },
});

export const riddleEvents: Record<string, GameEvent> = {
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
          };
        },
      },
    ],
  },

  whispererInTheDark: {
    id: "whispererInTheDark",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 &&
      state.current_population >= 0,
    triggerType: "resource",
    timeProbability: 0.030,
    title: "Whisperer in the Dark",
    message: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "whispererInTheDark");
      if (!riddle) return "";
      return getStartMessage(riddle.question, 1);
    },
    triggered: false,
    priority: 4,
    repeatable: true,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "whispererInTheDark");
      if (!riddle) return [];
      return createRiddleChoices(riddle, "first", "whispererInTheDark", "whispererInTheDark_correct", state);
    },
    fallbackChoice: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "whispererInTheDark");
      if (!riddle) return undefined;
      return createFallbackChoice(riddle, "first", "whispererInTheDark");
    },
  },

  riddleOfAges: {
    id: "riddleOfAges",
    condition: (state: GameState) => state.events.whispererInTheDark === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "Voices in the Dark",
    message: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfAges");
      if (!riddle) return "";
      return getStartMessage(riddle.question, 2);
    },
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfAges");
      if (!riddle) return [];
      return createRiddleChoices(riddle, "second", "riddleOfAges", "riddleOfAges_correct", state);
    },
    fallbackChoice: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfAges");
      if (!riddle) return undefined;
      return createFallbackChoice(riddle, "second", "riddleOfAges");
    },
  },

  riddleOfDevourer: {
    id: "riddleOfDevourer",
    condition: (state: GameState) => state.events.riddleOfAges === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "A nightly Visitor",
    message: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfDevourer");
      if (!riddle) return "";
      return getStartMessage(riddle.question, 3);
    },
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfDevourer");
      if (!riddle) return [];
      return createRiddleChoices(riddle, "third", "riddleOfDevourer", "riddleOfDevourer_correct", state);
    },
    fallbackChoice: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfDevourer");
      if (!riddle) return undefined;
      return createFallbackChoice(riddle, "third", "riddleOfDevourer");
    },
  },

  riddleOfTears: {
    id: "riddleOfTears",
    condition: (state: GameState) => state.events.riddleOfDevourer === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "The hooded Guest",
    message: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfTears");
      if (!riddle) return "";
      return getStartMessage(riddle.question, 4);
    },
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfTears");
      if (!riddle) return [];
      return createRiddleChoices(riddle, "fourth", "riddleOfTears", "riddleOfTears_correct", state);
    },
    fallbackChoice: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfTears");
      if (!riddle) return undefined;
      return createFallbackChoice(riddle, "fourth", "riddleOfTears");
    },
  },

  riddleOfEternal: {
    id: "riddleOfEternal",
    condition: (state: GameState) => state.events.riddleOfTears === true,
    triggerType: "resource",
    timeProbability: 45,
    title: "The unknown Guest",
    message: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfEternal");
      if (!riddle) return "";
      return getStartMessage(riddle.question, 5);
    },
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 45,
    choices: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfEternal");
      if (!riddle) return [];
      return createRiddleChoices(riddle, "fifth", "riddleOfEternal", "riddleOfEternal_correct", state);
    },
    fallbackChoice: (state: GameState) => {
      const riddle = getUnusedRiddle(state, "riddleOfEternal");
      if (!riddle) return undefined;
      return createFallbackChoice(riddle, "fifth", "riddleOfEternal");
    },
  },
};