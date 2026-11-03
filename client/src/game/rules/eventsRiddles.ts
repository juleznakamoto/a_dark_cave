import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { riddleFogDurationMs, cruelModeScale } from "../cruelMode";
import { stackTimedDebuff } from "@/game/stateHelpers";
const RIDDLE_REWARD = 150;
/** Store builds (BTP) pay a flat 200, not the usual double of the web amount. */
const RIDDLE_REWARD_BTP = 200;

function riddleGoldReward(state: { BTP?: number }): number {
  return state.BTP === 1 ? RIDDLE_REWARD_BTP : RIDDLE_REWARD;
}

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

// Third riddle for the same visit. Hearing any one of the three closes the visit.
const ALT_CHOICES: Record<string, RiddleChoice[]> = {
  whispererInTheDark: [
    { id: "answerFire", isCorrect: true },
    { id: "answerBlood", isCorrect: false },
    { id: "answerPaint", isCorrect: false },
    { id: "answerHeart", isCorrect: false },
  ],
  riddleOfAges: [
    { id: "answerSleep", isCorrect: false },
    { id: "answerShadow", isCorrect: true },
    { id: "answerHunger", isCorrect: false },
    { id: "answerFootsteps", isCorrect: false },
  ],
  riddleOfDevourer: [
    { id: "answerReflection", isCorrect: false },
    { id: "answerBell", isCorrect: false },
    { id: "answerEcho", isCorrect: true },
    { id: "answerSilence", isCorrect: false },
  ],
  riddleOfTears: [
    { id: "answerCrown", isCorrect: false },
    { id: "answerSword", isCorrect: false },
    { id: "answerCoffin", isCorrect: true },
    { id: "answerCompass", isCorrect: false },
  ],
  riddleOfEternal: [
    { id: "answerFlesh", isCorrect: false },
    { id: "answerBone", isCorrect: false },
    { id: "answerShield", isCorrect: true },
    { id: "answerSkin", isCorrect: false },
  ],
};

interface RiddleChoice {
  id: string;
  isCorrect: boolean;
}

interface RiddleConfig {
  eventId: string;
  level: "first" | "second" | "third" | "fourth" | "fifth";
  precondition: (state: GameState) => boolean;
}

type RiddleForm = "original" | "variant" | "alt";

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

function formEventId(baseEventId: string, form: RiddleForm): string {
  return form === "original" ? baseEventId : `${baseEventId}_${form}`;
}

function visitFormIds(baseEventId: string): string[] {
  return [
    baseEventId,
    `${baseEventId}_variant`,
    `${baseEventId}_alt`,
  ];
}

function eventHeard(state: GameState, eventId: string): boolean {
  return (state.events as Record<string, boolean | undefined>)[eventId] === true;
}

function visitAlreadyHeard(state: GameState, baseEventId: string): boolean {
  return visitFormIds(baseEventId).some((eventId) => eventHeard(state, eventId));
}

function visitHeardFlags(baseEventId: string): Record<string, true> {
  return Object.fromEntries(visitFormIds(baseEventId).map((eventId) => [eventId, true]));
}

function choicesFor(baseEventId: string, form: RiddleForm): RiddleChoice[] {
  if (form === "alt") return ALT_CHOICES[baseEventId];
  if (form === "variant") return VARIANT_CHOICES[baseEventId];
  return ORIGINAL_CHOICES[baseEventId];
}

function applyPenalty(
  state: GameState,
  baseEventId: string,
): Partial<GameState> & { _logMessageKey?: string } {
  const fogDuration = riddleFogDurationMs(cruelModeScale(state));
  return {
    events: {
      ...state.events,
      ...visitHeardFlags(baseEventId),
    } as GameState["events"],
    fogState: stackTimedDebuff(state.fogState, fogDuration),
    _logMessageKey: "wrong",
  };
}

function createRiddleEvent(config: RiddleConfig, form: RiddleForm): GameEvent {
  const baseEventId = config.eventId;
  const eventId = formEventId(baseEventId, form);
  const choices = choicesFor(baseEventId, form);
  const level = config.level;

  const createChoiceEffect = (choice: RiddleChoice) => {
    if (choice.isCorrect) {
      return (state: GameState) => ({
        resources: {
          ...state.resources,
          gold: state.resources.gold + riddleGoldReward(state),
        },
        events: {
          ...state.events,
          ...visitHeardFlags(baseEventId),
          [`${baseEventId}_correct`]: true,
        } as GameState["events"],
        _logMessageKey: `success_${level}`,
      });
    }
    return (state: GameState) => applyPenalty(state, baseEventId);
  };

  return {
    id: eventId,
    condition: (state: GameState) =>
      !visitAlreadyHeard(state, baseEventId) && config.precondition(state),

    // The old pair used 30 / 45. Three forms share that same visit, so each
    // waits 1.5 times as long and the figure still arrives about as often.
    timeProbability: level === "first" ? 45 : 67.5,
    cooldownPercent: 0.3,
    message: form === "variant" ? "variant" : "original",
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
      effect: (state: GameState) => applyPenalty(state, baseEventId),
    },
  };
}

export const riddleEvents: Record<string, GameEvent> = {
  ...Object.fromEntries(
    RIDDLE_CONFIGS.flatMap((config) => {
      const forms: RiddleForm[] = ["original", "variant", "alt"];
      return forms.map(
        (form) =>
          [formEventId(config.eventId, form), createRiddleEvent(config, form)] as const,
      );
    }),
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
    cooldownPercent: 0.3,

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
