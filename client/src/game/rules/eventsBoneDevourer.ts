import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

interface BoneDevourerConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  boneCost: number;
  silverReward: number;
}

const boneDevourerConfigs: BoneDevourerConfig[] = [
  { level: 1, woodenHuts: 3, boneCost: 250, silverReward: 25 },
  { level: 2, woodenHuts: 5, boneCost: 500, silverReward: 100 },
  { level: 3, woodenHuts: 8, boneCost: 1000, silverReward: 250 },
  { level: 4, stoneHuts: 1, boneCost: 5000, silverReward: 500 },
  { level: 5, stoneHuts: 4, boneCost: 10000, silverReward: 750 },
  { level: 6, stoneHuts: 7, boneCost: 25000, silverReward: 1000 },
];

function createBoneDevourerEvent(config: BoneDevourerConfig): GameEvent {
  const { level, woodenHuts, stoneHuts, boneCost, silverReward } = config;
  const eventId = `boneDevourer${level}`;
  const formattedBoneCost = formatNumber(boneCost);

  return {
    id: eventId,
    i18nKey: "boneDevourer",
    i18nVars: { boneCost: formattedBoneCost, silverReward },
    condition: (state: GameState) => {
      if (state.boneDevourerState.lastAcceptedLevel < level - 1) {
        return false;
      }

      if (state.boneDevourerState.lastAcceptedLevel >= level) {
        return false;
      }

      if (woodenHuts !== undefined) {
        return state.buildings.woodenHut >= woodenHuts;
      }
      if (stoneHuts !== undefined) {
        return state.buildings.stoneHut >= stoneHuts;
      }

      return false;
    },

    timeProbability: 35,
    message: (state: GameState) =>
      state.triggeredEvents?.[eventId] ? "repeat" : "firstTime",
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    skipEventLog: true,
    choices: [
      {
        id: "sellBones",
        effect: (state: GameState) => {
          if (state.resources.bones < boneCost) {
            return {
              _logMessageKey: "outcome0",
            };
          }

          return {
            resources: {
              ...state.resources,
              bones: state.resources.bones - boneCost,
              silver: state.resources.silver + silverReward,
            },
            boneDevourerState: {
              lastAcceptedLevel: level,
            },
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              [eventId]: true,
              [`${eventId}_seen`]: true,
            },
            _logMessageKey: "outcome1",
          };
        },
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

export const boneDevourerEvents: Record<string, GameEvent> = {};
boneDevourerConfigs.forEach((config) => {
  const event = createBoneDevourerEvent(config);
  boneDevourerEvents[event.id] = event;
});
