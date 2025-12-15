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

// Variant Questions
const VARIANT_MESSAGES = {
  first:
    "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'A lady's desire, grown in darkness, shining with pale light.'",
  second:
    "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: 'Can't hurt you, but leaves you with scars.'",
  third:
    "Once again, the mysterious figure appears at the estate. It whispers with a low voice: 'It has fingers yet no flesh, no feathers, no scales, no bone.'",
  fourth:
    "The hulled figure appears once more at the estate. It whispers: 'Soft, delicate, silky, but if you're wrapped in me, you scream.'",
  fifth:
    "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: 'Poor have me, rich have me. Eat me, you die.'",
};

// Variant riddle choices for new riddles
const VARIANT_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark_variant: [
    { id: "answerSilver", label: "Silver", isCorrect: false },
    { id: "answerPearl", label: "Pearl", isCorrect: true },
    { id: "answerGold", label: "Gold", isCorrect: false },
    { id: "answerDiamond", label: "Diamond", isCorrect: false },
  ],
  riddleOfAges_variant: [
    { id: "answerNightmares", label: "Nightmares", isCorrect: false },
    { id: "answerTime", label: "Time", isCorrect: true },
    { id: "answerLove", label: "Love", isCorrect: false },
    { id: "answerDeath", label: "Death", isCorrect: false },
  ],
  riddleOfDevourer_variant: [
    { id: "answerFin", label: "Fin", isCorrect: false },
    { id: "answerWing", label: "Wing", isCorrect: false },
    { id: "answerGlove", label: "Glove", isCorrect: true },
    { id: "answerHand", label: "Hand", isCorrect: false },
  ],
  riddleOfTears_variant: [
    { id: "answerNightmares", label: "Nightmares", isCorrect: false },
    { id: "answerCobweb", label: "Cobweb", isCorrect: true },
    { id: "answerSilk", label: "Silk", isCorrect: false },
    { id: "answerDeath", label: "Death", isCorrect: false },
  ],
  riddleOfEternal_variant: [
    { id: "answerPoison", label: "Poison", isCorrect: false },
    { id: "answerAir", label: "Air", isCorrect: false },
    { id: "answerNothing", label: "Nothing", isCorrect: true },
    { id: "answerTime", label: "Time", isCorrect: false },
  ],
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
  second: (deaths: number) =>
    "The figure turns its hooded head side to side, then disappears without a sound. The next day, a dense fog creeps into the village. Villagers claim to see shifting shapes within it, many are too fearful to leave their huts.",
  third: (deaths: number) =>
    `The figure gives a slow, disapproving shake of the head before fading away. When dawn breaks, ${deaths} villagers are found dead, mouths frozen in silent screams.`,
  fourth: (deaths: number) =>
    "The figure shakes its head faintly, then fades from sight. The following day, a heavy fog engulfs the village. Shadows seemt to move within the mist, many villagers are too scared to leave their huts.",
  fifth: (deaths: number) =>
    `The figure slowly shakes its head in rejection, then dissolves into the dark. The next day, a fog descends upon the village. ${deaths} villagers perish as the suffocating mist blankets the land.`,
} as const;

// Timeout messages
const TIMEOUT_MESSAGES = WRONG_ANSWER_MESSAGES;

// Riddle configurations
interface RiddleChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface RiddleConfig {
  eventId: string;
  variantEventId: string;
  level: "first" | "second" | "third" | "fourth" | "fifth";
  title: string;
  originalMessage: string;
  variantMessage: string;
  choices: RiddleChoice[];
  precondition: (state: GameState) => boolean;
}

const RIDDLE_CONFIGS: RiddleConfig[] = [
  {
    eventId: "whispererInTheDark",
    variantEventId: "whispererInTheDark_variant",
    level: "first",
    title: "Whisperer in the Dark",
    originalMessage: START_MESSAGES.first,
    variantMessage: VARIANT_MESSAGES.first,
    choices: [
      { id: "answerFire", label: "Fire", isCorrect: false },
      { id: "answerTree", label: "Tree", isCorrect: false },
      { id: "answerWind", label: "Wind", isCorrect: true },
      { id: "answerBones", label: "Bones", isCorrect: false },
    ],
    precondition: (state: GameState) => state.buildings.darkEstate >= 1,
  },
  {
    eventId: "riddleOfAges",
    variantEventId: "riddleOfAges_variant",
    level: "second",
    title: "Voices in the Dark",
    originalMessage: START_MESSAGES.second,
    variantMessage: VARIANT_MESSAGES.second,
    choices: [
      { id: "answerEarth", label: "Earth", isCorrect: false },
      { id: "answerWolf", label: "Wolf", isCorrect: false },
      { id: "answerMan", label: "Man", isCorrect: true },
      { id: "answerBird", label: "Bird", isCorrect: false },
    ],
    precondition: (state: GameState) =>
      state.events.whispererInTheDark === true,
  },
  {
    eventId: "riddleOfDevourer",
    variantEventId: "riddleOfDevourer_variant",
    level: "third",
    title: "A nightly Visitor",
    originalMessage: START_MESSAGES.third,
    variantMessage: VARIANT_MESSAGES.third,
    choices: [
      { id: "answerMan", label: "Man", isCorrect: false },
      { id: "answerWater", label: "Water", isCorrect: false },
      { id: "answerTime", label: "Time", isCorrect: true },
      { id: "answerFire", label: "Fire", isCorrect: false },
    ],
    precondition: (state: GameState) => state.events.riddleOfAges === true,
  },
  {
    eventId: "riddleOfTears",
    variantEventId: "riddleOfTears_variant",
    level: "fourth",
    title: "A hooded Guest",
    originalMessage: START_MESSAGES.fourth,
    variantMessage: VARIANT_MESSAGES.fourth,
    choices: [
      { id: "answerNight", label: "Night", isCorrect: false },
      { id: "answerWind", label: "Wind", isCorrect: false },
      { id: "answerClouds", label: "Clouds", isCorrect: true },
      { id: "answerShadow", label: "Shadow", isCorrect: false },
    ],
    precondition: (state: GameState) => state.events.riddleOfDevourer === true,
  },
  {
    eventId: "riddleOfEternal",
    variantEventId: "riddleOfEternal_variant",
    level: "fifth",
    title: "The unknown Guest",
    originalMessage: START_MESSAGES.fifth,
    variantMessage: VARIANT_MESSAGES.fifth,
    choices: [
      { id: "answerLight", label: "Light", isCorrect: false },
      { id: "answerLife", label: "Life", isCorrect: false },
      { id: "answerDarkness", label: "Darkness", isCorrect: true },
      { id: "answerDeath", label: "Death", isCorrect: false },
    ],
    precondition: (state: GameState) => state.events.riddleOfTears === true,
  },
];

function createRiddleEvent(
  config: RiddleConfig,
  isVariant: boolean,
): GameEvent {
  const eventId = isVariant ? config.variantEventId : config.eventId;
  const oppositeEventId = isVariant ? config.eventId : config.variantEventId;
  const message = isVariant ? config.variantMessage : config.originalMessage;
  const choices = isVariant
    ? VARIANT_CHOICES[config.variantEventId]
    : config.choices;
  const level = config.level;
  const penalties = RIDDLE_PENALTIES[level];
  const reward = RIDDLE_REWARDS[level];

  const createChoiceEffect = (choice: RiddleChoice) => {
    if (choice.isCorrect) {
      return (state: GameState) => ({
        resources: {
          ...state.resources,
          gold: state.resources.gold + reward,
        },
        events: {
          ...state.events,
          [eventId]: true,
          [oppositeEventId]: true, // Block opposite variant
          [`${eventId}_correct`]: true,
        },
        _logMessage: SUCCESS_MESSAGES[level](reward),
      });
    }

    // Wrong answer logic
    if ("deaths" in penalties && "fogDuration" in penalties) {
      // Fifth riddle - both fog and deaths
      return (state: GameState) => {
        const deaths = penalties.deaths + penalties.cmMultiplier * state.CM;
        const deathResult = killVillagers(state, deaths);
        const fogDuration =
          penalties.fogDuration + penalties.fogDurationCM * state.CM;
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
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: WRONG_ANSWER_MESSAGES[level](deaths),
        };
      };
    } else if ("deaths" in penalties) {
      // Death penalty only (first and third)
      return (state: GameState) => {
        const deaths = penalties.deaths + penalties.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            [eventId]: true,
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: WRONG_ANSWER_MESSAGES[level](deaths),
        };
      };
    } else {
      // Fog penalty only (second and fourth)
      return (state: GameState) => {
        const fogDuration =
          penalties.fogDuration + penalties.fogDurationCM * state.CM;
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            [eventId]: true,
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: WRONG_ANSWER_MESSAGES[level](0) as string,
        };
      };
    }
  };

  const createFallbackEffect = () => {
    if ("deaths" in penalties && "fogDuration" in penalties) {
      // Fifth riddle - both fog and deaths
      return (state: GameState) => {
        const deaths = penalties.deaths + penalties.cmMultiplier * state.CM;
        const deathResult = killVillagers(state, deaths);
        const fogDuration =
          penalties.fogDuration + penalties.fogDurationCM * state.CM;
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
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: TIMEOUT_MESSAGES[level](deaths),
        };
      };
    } else if ("deaths" in penalties) {
      // Death penalty only (first and third)
      return (state: GameState) => {
        const deaths = penalties.deaths + penalties.cmMultiplier * state.CM;
        return {
          ...killVillagers(state, deaths),
          events: {
            ...state.events,
            [eventId]: true,
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: TIMEOUT_MESSAGES[level](deaths),
        };
      };
    } else {
      // Fog penalty only (second and fourth)
      return (state: GameState) => {
        const fogDuration =
          penalties.fogDuration + penalties.fogDurationCM * state.CM;
        return {
          fogState: {
            isActive: true,
            endTime: Date.now() + fogDuration,
            duration: fogDuration,
          },
          events: {
            ...state.events,
            [eventId]: true,
            [oppositeEventId]: true, // Block opposite variant
          },
          _logMessage: TIMEOUT_MESSAGES[level](0) as string,
        };
      };
    }
  };

  return {
    id: eventId,
    condition: (state: GameState) =>
      config.precondition(state) &&
      !(state.events as Record<string, any>)[oppositeEventId],
    triggerType: "resource",
    timeProbability: level === "first" ? 30 : 45,
    title: config.title,
    message,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 40,
    choices: choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      effect: createChoiceEffect(choice),
    })),
    fallbackChoice: {
      id: "timeout",
      label: "No answer given",
      effect: createFallbackEffect(),
    },
  };
}

export const riddleEvents: Record<string, GameEvent> = {
  // Generate all original and variant riddles using the factory function
  ...Object.fromEntries(
    RIDDLE_CONFIGS.flatMap((config) => [
      [config.eventId, createRiddleEvent(config, false)],
      [config.variantEventId, createRiddleEvent(config, true)],
    ]),
  ),

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
    message:
      "The cloaked figure appears again. His whispers drift through the cold night air one last time before he vanishes, 'Your wisdom has been weighed and found worthy. May shadows guard your path, and fortune follow your name.'",
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
            _logMessage:
              "As the figure fades into the dark, a faint euphoria washes over you, quiet and fleeting, like a half-remembered memory of a better time.",
          };
        },
      },
    ],
  },
};
