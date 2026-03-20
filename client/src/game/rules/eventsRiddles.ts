
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { riddleFogDurationMs, cruelModeScale } from "../cruelMode";

const RIDDLE_REWARD = 150;

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
    { id: "answerWaves", label: "Waves", isCorrect: false },
    { id: "answerWind", label: "Wind", isCorrect: true },
    { id: "answerDarkness", label: "Darkness", isCorrect: false },
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
    "The nightly figure appears one more time at the estate. Its voice silently echoes through the night: 'Poor have me, rich need me. Eat me, you die.'",
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

// Success messages (amounts shown in reward dialog)
const SUCCESS_MESSAGES = {
  first: () =>
    "The figure nods its head slightly before fading into the darkness. By morning, a small bag of gold rests upon the estate's doorstep.",
  second: () =>
    "The figure gives a faint nod and vanishes into the night. At dawn, a weathered leather pouch of gold lies where it stood.",
  third: () =>
    "The figure tilts its head in quiet acknowledgment before stepping back into the dim. When morning comes, a worn coin purse of gold is found outside the door.",
  fourth: () =>
    "The figure lowers its hooded head for a moment before dissolving into the shadows. A small sack of gold remains behind on the cold ground.",
  fifth: () =>
    "The figure bows its head in silent reverence before fading completely. A big sack of gold lays on the ground where it stood.",
} as const;

const WRONG_ANSWER_MESSAGE =
  "The figure shakes its head before vanishing. The next day, a dense fog creeps into the village. Villagers claim to see shifting shapes within it, many are too fearful to leave their huts.";

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

function applyPenalty(
  state: GameState,
  eventId: string,
  baseEventId: string,
  oppositeEventId: string,
): Partial<GameState> & { _logMessage?: string } {
  const fogDuration = riddleFogDurationMs(cruelModeScale(state));
  return {
    events: {
      ...state.events,
      [eventId]: true,
      [baseEventId]: true,
      [oppositeEventId]: true,
    } as any,
    fogState: {
      isActive: true,
      endTime: Date.now() + fogDuration,
      duration: fogDuration,
    },
    _logMessage: WRONG_ANSWER_MESSAGE,
  };
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

  const createChoiceEffect = (choice: RiddleChoice) => {
    if (choice.isCorrect) {
      return (state: GameState) => ({
        resources: {
          ...state.resources,
          gold: state.resources.gold + RIDDLE_REWARD + (state.BTP === 1 ? 100 : 0),
        },
        events: {
          ...state.events,
          [baseEventId]: true,
          [`${baseEventId}_correct`]: true,
          [eventId]: true,
          [oppositeEventId]: true,
        } as any,
        _logMessage: SUCCESS_MESSAGES[level](),
      });
    }
    return (state: GameState) => applyPenalty(state, eventId, baseEventId, oppositeEventId);
  };

  return {
    id: eventId,
    condition: (state: GameState) =>
      !(state.events as any)[oppositeEventId] &&
      !(state.events as any)[eventId] &&
      config.precondition(state),

    timeProbability: level === "first" ? 30 : 45,
    title: config.title,
    message,
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
      effect: (state: GameState) => applyPenalty(state, eventId, baseEventId, oppositeEventId),
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

    timeProbability: 5,
    title: "The Whisperer's Gift",
    message:
      "The cloaked figure appears again. His whispers drift through the cold night one last time before he vanishes, 'Your wisdom has been weighed and found worthy. May shadows guard your path, and fortune follow your name.'",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "accept",
        label: "Accept gift",
        effect: (state: GameState) => ({
          blessings: { ...state.blessings, whisperers_mark: true },
          events: { ...state.events, whisperersReward: true },
          _logMessage:
            "As the figure fades into the dark, a faint euphoria washes over you, quiet and fleeting, like a half-remembered memory of a better time.",
        }),
      },
    ],
  },
};
