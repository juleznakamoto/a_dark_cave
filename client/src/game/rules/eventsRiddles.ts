
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { riddleFogDurationMs, cruelModeScale } from "../cruelMode";
import { stackTimedDebuff } from "@/game/stateHelpers";

const RIDDLE_REWARD = 150;

// Original riddle choices
const ORIGINAL_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark: [
    { id: "answerFire", isCorrect: false },
    { id: "answerWaves", isCorrect: false },
    { id: "answerWind", isCorrect: true },
    { id: "answerDarkness", isCorrect: false },
  ],
  riddleOfAges: [
    { id: "answerEarth", isCorrect: false },
    { id: "answerWolf", isCorrect: false },
    { id: "answerMan", isCorrect: true },
    { id: "answerBird", isCorrect: false },
  ],
  riddleOfDevourer: [
    { id: "answerMan", isCorrect: false },
    { id: "answerWater", isCorrect: false },
    { id: "answerTime", isCorrect: true },
    { id: "answerFire", isCorrect: false },
  ],
  riddleOfTears: [
    { id: "answerNight", isCorrect: false },
    { id: "answerWind", isCorrect: false },
    { id: "answerClouds", isCorrect: true },
    { id: "answerShadow", isCorrect: false },
  ],
  riddleOfEternal: [
    { id: "answerLight", isCorrect: false },
    { id: "answerLife", isCorrect: false },
    { id: "answerDarkness", isCorrect: true },
    { id: "answerDeath", isCorrect: false },
  ],
};

// Variant riddle choices
const VARIANT_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark: [
    { id: "answerSilver", isCorrect: false },
    { id: "answerPearl", isCorrect: true },
    { id: "answerGold", isCorrect: false },
    { id: "answerDiamond", isCorrect: false },
  ],
  riddleOfAges: [
    { id: "answerNightmares", isCorrect: true },
    { id: "answerTime", isCorrect: false },
    { id: "answerLove", isCorrect: false },
    { id: "answerDeath", isCorrect: false },
  ],
  riddleOfDevourer: [
    { id: "answerFin", isCorrect: false },
    { id: "answerWing", isCorrect: false },
    { id: "answerGlove", isCorrect: true },
    { id: "answerHand", isCorrect: false },
  ],
  riddleOfTears: [
    { id: "answerNightmares", isCorrect: false },
    { id: "answerCobweb", isCorrect: true },
    { id: "answerSilk", isCorrect: false },
    { id: "answerDeath", isCorrect: false },
  ],
  riddleOfEternal: [
    { id: "answerPoison", isCorrect: false },
    { id: "answerAir", isCorrect: false },
    { id: "answerNothing", isCorrect: true },
    { id: "answerTime", isCorrect: false },
  ],
};

// Riddle configurations
interface RiddleChoice {
  id: string;
  isCorrect: boolean;
}

interface RiddleConfig {
  eventId: string;
  level: "first" | "second" | "third" | "fourth" | "fifth";
  precondition: (state: GameState) => boolean;
}

const RIDDLE_CONFIGS: RiddleConfig[] = [
  {
    eventId: "whispererInTheDark",
    level: "first",
    precondition: (state: GameState) => state.buildings.darkEstate >= 1,
  },
  {
    eventId: "riddleOfAges",
    level: "second",
    precondition: (state: GameState) =>
      state.events.whispererInTheDark === true,
  },
  {
    eventId: "riddleOfDevourer",
    level: "third",
    precondition: (state: GameState) => state.events.riddleOfAges === true,
  },
  {
    eventId: "riddleOfTears",
    level: "fourth",
    precondition: (state: GameState) => state.events.riddleOfDevourer === true,
  },
  {
    eventId: "riddleOfEternal",
    level: "fifth",
    precondition: (state: GameState) => state.events.riddleOfTears === true,
  },
];

function applyPenalty(
  state: GameState,
  eventId: string,
  baseEventId: string,
  oppositeEventId: string,
): Partial<GameState> & { _logMessageKey?: string } {
  const fogDuration = riddleFogDurationMs(cruelModeScale(state));
  return {
    events: {
      ...state.events,
      [eventId]: true,
      [baseEventId]: true,
      [oppositeEventId]: true,
    } as any,
    fogState: stackTimedDebuff(state.fogState, fogDuration),
    _logMessageKey: "wrong",
  };
}

function createRiddleEvent(
  config: RiddleConfig,
  isVariant: boolean,
): GameEvent {
  const baseEventId = config.eventId;
  const eventId = isVariant ? `${baseEventId}_variant` : baseEventId;
  const oppositeEventId = isVariant ? baseEventId : `${baseEventId}_variant`;
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
        _logMessageKey: `success_${level}`,
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
    message: isVariant ? "variant" : "original",
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 25,
    choices: choices.map((choice) => ({
      id: choice.id,
      effect: createChoiceEffect(choice),
    })),
    fallbackChoice: {
      id: "timeout",
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

    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "accept",
        effect: (state: GameState) => ({
          blessings: { ...state.blessings, whisperers_mark: true },
          events: { ...state.events, whisperersReward: true },
          _logMessageKey: "outcome0",
        }),
      },
    ],
  },
};
