import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

interface FeastConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  secondWaveVictory?: number;
  fourthWaveVictory?: number;
  foodCost: number;
}

const feastConfigs: FeastConfig[] = [
  { level: 1, woodenHuts: 2, foodCost: 100 },
  { level: 2, woodenHuts: 4, foodCost: 250 },
  { level: 3, woodenHuts: 6, foodCost: 500 },
  { level: 4, woodenHuts: 8, foodCost: 1000 },
  { level: 5, stoneHuts: 1, foodCost: 2500 },
  { level: 6, stoneHuts: 5, foodCost: 5000 },
  { level: 7, stoneHuts: 9, foodCost: 7500 },
  { level: 8, secondWaveVictory: 1, foodCost: 10000 },
  { level: 9, fourthWaveVictory: 1, foodCost: 15000 },
];

function createFeastEvent(config: FeastConfig): GameEvent {
  const {
    level,
    woodenHuts,
    stoneHuts,
    secondWaveVictory,
    fourthWaveVictory,
    foodCost,
  } = config;
  const eventId = `feast${level}`;

  return {
    id: eventId,
    condition: (state: GameState) => {
      // No feast events can trigger while a feast is active
      if (state.feastState?.isActive && state.feastState.endTime > Date.now()) {
        return false;
      }

      // No feast events can trigger while a Great Feast is active
      if (
        state.greatFeastState?.isActive &&
        state.greatFeastState.endTime > Date.now()
      ) {
        return false;
      }

      // Check if previous feast was accepted (or if this is the first feast)
      if (state.feastState.lastAcceptedLevel < level - 1) {
        return false;
      }

      // Check if this feast was already accepted (only block if accepted, not denied)
      if (state.feastState.lastAcceptedLevel >= level) {
        return false;
      }

      // Check building requirements
      if (woodenHuts !== undefined) {
        return state.buildings.woodenHut >= woodenHuts;
      }
      if (stoneHuts !== undefined) {
        return state.buildings.stoneHut >= stoneHuts;
      }
      if (secondWaveVictory !== undefined) {
        return state.story.seen.secondWaveVictory == true;
      }
      if (fourthWaveVictory !== undefined) {
        return state.story.seen.fourthWaveVictory == true;
      }

      return false;
    },

    timeProbability: 20,
    title: "Village Feast",
    message: `The villagers propose organizing a feast. A short comfort to ease their weariness and quiet their minds.`,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    choices: [
      {
        id: "makeFeast",
        label: `Consume ${foodCost} Food`,
        cost: `${foodCost} food`,
        effect: (
          state: GameState,
        ): Partial<GameState> & { _logMessage?: string } => {
          if (state.resources.food < foodCost) {
            return {
              _logMessage: "You don't have enough food for the feast.",
            };
          }

          // Base duration is 10 minutes, +5 minutes if BTP mode is active
          const baseDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
          const btpBonus = state.BTP === 1 ? 5 * 60 * 1000 : 0; // +5 minutes for BTP
          const feastDuration = baseDuration + btpBonus;
          const endTime = Date.now() + feastDuration;

          return {
            resources: {
              ...state.resources,
              food: state.resources.food - foodCost,
            },
            feastState: {
              isActive: true,
              endTime: endTime,
              lastAcceptedLevel: level,
            },
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              [eventId]: true,
            },
            _logMessage: `The villagers gather for a feast! Weariness fades and spirits rise, if only briefly.`,
          };
        },
      },
      {
        id: "noFeast",
        label: "Refuse feast",
        effect: (
          state: GameState,
        ): Partial<GameState> & { _logMessage?: string } => {
          return {
            _logMessage:
              "You decline the feast proposal. The villagers accept your decision, though disappointed.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "doNothing",
      label: "No Decision Made",
      effect: (
        state: GameState,
      ): Partial<GameState> & { _logMessage?: string } => {
        return {
          _logMessage:
            "Your indecision frustrates the villagers. They abandon the feast proposal and return to their duties, disappointed.",
        };
      },
    },
  };
}

// Generate all feast events
export const feastEvents: Record<string, GameEvent> = {};
feastConfigs.forEach((config) => {
  const event = createFeastEvent(config);
  feastEvents[event.id] = event;
});
