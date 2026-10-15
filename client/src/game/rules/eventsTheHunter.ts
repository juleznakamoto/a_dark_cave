import type { GameEvent } from "./eventTypes";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

interface TheHunterConfig {
  level: number;
  woodenHuts: number;
  boneCost: number;
  foodReward: number;
}

const theHunterConfigs: TheHunterConfig[] = [
  { level: 1, woodenHuts: 3, boneCost: 250, foodReward: 125 },
  { level: 2, woodenHuts: 4, boneCost: 500, foodReward: 250 },
  { level: 3, woodenHuts: 5, boneCost: 750, foodReward: 375 },
  { level: 4, woodenHuts: 6, boneCost: 1000, foodReward: 500 },
  { level: 5, woodenHuts: 7, boneCost: 1500, foodReward: 750 },
];

function acceptedLevel(state: GameState): number {
  return state.theHunterState?.lastAcceptedLevel ?? 0;
}

function createTheHunterEvent(config: TheHunterConfig): GameEvent {
  const { level, woodenHuts, boneCost, foodReward } = config;
  const eventId = `theHunter${level}`;
  const formattedBoneCost = formatNumber(boneCost);

  return {
    id: eventId,
    i18nKey: "theHunter",
    i18nVars: { boneCost: formattedBoneCost, foodReward },
    condition: (state: GameState) => {
      const accepted = acceptedLevel(state);
      if (accepted < level - 1) return false;
      if (accepted >= level) return false;
      return (state.buildings?.woodenHut ?? 0) >= woodenHuts;
    },
    timeProbability: 20,
    cooldownPercent: 0.7,
    // `_seen` is set on refuse, so a return visit uses the follow-up line.
    // Accepting advances lastAcceptedLevel and this visit does not come back.
    message: (state: GameState) =>
      state.triggeredEvents?.[`${eventId}_seen`]
        ? `level${level}Repeat`
        : `level${level}`,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 4 * 60 * 1000,
    skipEventLog: true,
    choices: [
      {
        id: "giveBones",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            bones: state.resources.bones - boneCost,
            food: state.resources.food + foodReward,
          },
          theHunterState: {
            lastAcceptedLevel: level,
          },
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            [eventId]: true,
            [`${eventId}_seen`]: true,
          },
          _logMessageKey: "outcome1",
        }),
      },
      {
        id: "refuse",
        effect: (state: GameState) => ({
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            [`${eventId}_seen`]: true,
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
    fallbackChoice: {
      id: "refuse",
      effect: (state: GameState) => ({
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          [`${eventId}_seen`]: true,
        },
        _logMessageKey: "outcome3",
      }),
    },
  };
}

const theHunterCabin: GameEvent = {
  id: "theHunterCabin",
  i18nKey: "theHunterCabin",
  condition: (state: GameState) =>
    acceptedLevel(state) >= 5 && !state.story?.seen?.woodenCabinUnlocked,
  timeProbability: 15,
  cooldownPercent: 0.5,
  priority: 4,
  repeatable: false,
  choices: [
    {
      id: "continue",
      effect: (state: GameState) => ({
        story: {
          ...state.story,
          seen: {
            ...state.story?.seen,
            woodenCabinUnlocked: true,
          },
        },
        triggeredEvents: {
          ...(state.triggeredEvents || {}),
          theHunterCabin: true,
          theHunterCabin_seen: true,
        },
        _logMessageKey: "outcome1",
      }),
    },
  ],
};

export const theHunterEvents: Record<string, GameEvent> = {
  theHunterCabin,
};
theHunterConfigs.forEach((config) => {
  const event = createTheHunterEvent(config);
  theHunterEvents[event.id] = event;
});
