
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

// Riddle rewards (gold amounts)
const RIDDLE_REWARDS = {
  first: 150,
  second: 150,
  third: 150,
  fourth: 150,
  fifth: 150,
} as const;

// Riddle penalties
const RIDDLE_PENALTIES = {
  first: {
    deaths: 12,
    cmMultiplier: 6,
  },
  second: {
    fogDuration: 10 * 60 * 1000,
    fogDurationCM: 5 * 60 * 1000,
  },
  third: {
    deaths: 18,
    cmMultiplier: 6,
  },
  fourth: {
    fogDuration: 15 * 60 * 1000,
    fogDurationCM: 5 * 60 * 1000,
  },
  fifth: {
    fogDuration: 15 * 60 * 1000,
    fogDurationCM: 5 * 60 * 1000,
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

// Original riddle choices
const ORIGINAL_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark: [
    { id: "answerFire", label: "Fire", isCorrect: false },
    { id: "answerTree", label: "Tree", isCorrect: false },
    { id: "answerWind", label: "Wind", isCorrect: true },
    { id: "answerBones", label: "Bones", isCorrect: false },
  ],
  riddleOfAges: [
    { id: "answerEarth", label: "Earth", isCorrect: false },
    { id: "answerWolf", label: "Wolf", isCorrect: false },
    { id: "answerMan", label: "Man", isCorrect: true },
    { id: "answerBird", label: "Bird", isCorrect: false },
  ],
  riddleOfDevourer: [
    { id: "answerMan", label: "Man", isCorrect: false },
    { id: "answerWater", label: "Water", isCorrect: false },
    { id: "answerTime", label: "Time", isCorrect: true },
    { id: "answerFire", label: "Fire", isCorrect: false },
  ],
  riddleOfTears: [
    { id: "answerNight", label: "Night", isCorrect: false },
    { id: "answerWind", label: "Wind", isCorrect: false },
    { id: "answerClouds", label: "Clouds", isCorrect: true },
    { id: "answerShadow", label: "Shadow", isCorrect: false },
  ],
  riddleOfEternal: [
    { id: "answerLight", label: "Light", isCorrect: false },
    { id: "answerLife", label: "Life", isCorrect: false },
    { id: "answerDarkness", label: "Darkness", isCorrect: true },
    { id: "answerDeath", label: "Death", isCorrect: false },
  ],
};

// Variant Questions
const VARIANT_MESSAGES = {
  first:
    "A knock comes from the estate door. A figure completely hulled in dark robes stands in the shadows outside. It whispers: 'A lady's desire, grown in darkness, shining with pale light.'",
  second:
    "The cloaked figure returns to the estate under the pale moonlight. Its voice echoes: 'Can't hurt you, but leaves you with scars.'",
  third:
    "Once again, the mysterious figure appears at the estate. It whispers with a low voice: 'Has fingers yet no flesh, no feathers, no scales, no bone.'",
  fourth:
    "The hulled figure appears once more at the estate. It whispers: 'Soft, delicate, silky, but if you're wrapped in me, you scream.'",
  fifth:
    "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: 'Poor have me, rich have me. Eat me, you die.'",
};

// Variant riddle choices
const VARIANT_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark: [
    { id: "answerSilver", label: "Silver", isCorrect: false },
    { id: "answerPearl", label: "Pearl", isCorrect: true },
    { id: "answerGold", label: "Gold", isCorrect: false },
    { id: "answerDiamond", label: "Diamond", isCorrect: false },
  ],
  riddleOfAges: [
    { id: "answerNightmares", label: "Nightmares", isCorrect: true },
    { id: "answerTime", label: "Touch", isCorrect: false },
    { id: "answerLove", label: "Knife", isCorrect: false },
    { id: "answerDeath", label: "Lust", isCorrect: false },
  ],
  riddleOfDevourer: [
    { id: "answerFin", label: "Fin", isCorrect: false },
    { id: "answerWing", label: "Wing", isCorrect: false },
    { id: "answerGlove", label: "Glove", isCorrect: true },
    { id: "answerHand", label: "Hand", isCorrect: false },
  ],
  riddleOfTears: [
    { id: "answerNightmares", label: "Nightmares", isCorrect: false },
    { id: "answerCobweb", label: "Cobweb", isCorrect: true },
    { id: "answerSilk", label: "Silk", isCorrect: false },
    { id: "answerDeath", label: "Death", isCorrect: false },
  ],
  riddleOfEternal: [
    { id: "answerPoison", label: "Poison", isCorrect: false },
    { id: "answerAir", label: "Gold", isCorrect: false },
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

// Riddle configurations
interface RiddleChoice {
  id: string;
  label: string;
  isCorrect: boolean;
}

interface RiddleConfig {
  eventId: string;
  level: "first" | "second" | "third" | "fourth" | "fifth";
  title: string;
  originalMessage: string;
  variantMessage: string;
  precondition: (state: GameState) => boolean;
}

const RIDDLE_CONFIGS: RiddleConfig[] = [
  {
    eventId: "whispererInTheDark",
    level: "first",
    title: "Whisperer in the Dark",
    originalMessage: START_MESSAGES.first,
    variantMessage: VARIANT_MESSAGES.first,
    precondition: (state: GameState) => state.buildings.darkEstate >= 1,
  },
  {
    eventId: "riddleOfAges",
    level: "second",
    title: "Voices in the Dark",
    originalMessage: START_MESSAGES.second,
    variantMessage: VARIANT_MESSAGES.second,
    precondition: (state: GameState) =>
      state.events.whispererInTheDark === true,
  },
  {
    eventId: "riddleOfDevourer",
    level: "third",
    title: "A nightly Visitor",
    originalMessage: START_MESSAGES.third,
    variantMessage: VARIANT_MESSAGES.third,
    precondition: (state: GameState) => state.events.riddleOfAges === true,
  },
  {
    eventId: "riddleOfTears",
    level: "fourth",
    title: "A hooded Guest",
    originalMessage: START_MESSAGES.fourth,
    variantMessage: VARIANT_MESSAGES.fourth,
    precondition: (state: GameState) => state.events.riddleOfDevourer === true,
  },
  {
    eventId: "riddleOfEternal",
    level: "fifth",
    title: "The unknown Guest",
    originalMessage: START_MESSAGES.fifth,
    variantMessage: VARIANT_MESSAGES.fifth,
    precondition: (state: GameState) => state.events.riddleOfTears === true,
  },
];

// Helper function to apply penalties
function applyPenalty(
  state: GameState,
  eventId: string,
  penalties: (typeof RIDDLE_PENALTIES)[keyof typeof RIDDLE_PENALTIES],
  level: keyof typeof RIDDLE_PENALTIES,
  messageGetter: typeof WRONG_ANSWER_MESSAGES | typeof TIMEOUT_MESSAGES,
) {
  const hasFog = "fogDuration" in penalties;
  const hasDeaths = "deaths" in penalties;

  let result: Partial<GameState> & { _logMessage?: string } = {
    events: {
      ...state.events,
      [eventId]: true,
    } as any,
  };

  let deaths = 0;

  if (hasDeaths) {
    deaths = penalties.deaths + penalties.cmMultiplier * state.CM;
    result = { ...result, ...killVillagers(state, deaths) };
  }

  if (hasFog) {
    const fogDuration =
      penalties.fogDuration + penalties.fogDurationCM * state.CM;
    result.fogState = {
      isActive: true,
      endTime: Date.now() + fogDuration,
      duration: fogDuration,
    };
  }

  result._logMessage = messageGetter[level](deaths);
  return result;
}

function createRiddleEvent(
  config: RiddleConfig,
  isVariant: boolean,
): GameEvent {
  const baseEventId = config.eventId;
  const eventId = isVariant ? `${baseEventId}_variant` : baseEventId;
  const oppositeEventId = isVariant ? baseEventId : `${baseEventId}_variant`;
  const message = isVariant ? config.variantMessage : config.originalMessage;
  const choices = isVariant
    ? VARIANT_CHOICES[config.eventId]
    : ORIGINAL_CHOICES[config.eventId];
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
          [baseEventId]: true,
          [`${baseEventId}_correct`]: true,
          [eventId]: true,
          [oppositeEventId]: true, // Block the opposite variant
        } as any,
        _logMessage: SUCCESS_MESSAGES[level](reward),
      });
    }

    return (state: GameState) => {
      const penaltyResult = applyPenalty(state, eventId, penalties, level, WRONG_ANSWER_MESSAGES);
      return {
        ...penaltyResult,
        events: {
          ...penaltyResult.events,
          [baseEventId]: true,
          [oppositeEventId]: true, // Block the opposite variant
        } as any,
      };
    };
  };

  const createFallbackEffect = () => {
    return (state: GameState) => {
      const penaltyResult = applyPenalty(state, eventId, penalties, level, TIMEOUT_MESSAGES);
      return {
        ...penaltyResult,
        events: {
          ...penaltyResult.events,
          [baseEventId]: true,
          [oppositeEventId]: true, // Block the opposite variant
        } as any,
      };
    };
  };

  return {
    id: eventId,
    condition: (state: GameState) => {
      // Block if the opposite variant has already triggered
      if ((state.events as any)[oppositeEventId]) return false;
      // Block if this event has already triggered
      if ((state.events as any)[eventId]) return false;
      // Check base precondition
      return config.precondition(state);
    },
    triggerType: "resource",
    timeProbability: level === "first" ? 30 : 45,
    title: config.title,
    message,
    triggered: false,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 25,
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
  // Generate both original and variant riddle events
  ...Object.fromEntries(
    RIDDLE_CONFIGS.flatMap((config) => [
      [config.eventId, createRiddleEvent(config, false)],
      [`${config.eventId}_variant`, createRiddleEvent(config, true)],
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
      "The cloaked figure appears again. His whispers drift through the cold night one last time before he vanishes, 'Your wisdom has been weighed and found worthy. May shadows guard your path, and fortune follow your name.'",
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
