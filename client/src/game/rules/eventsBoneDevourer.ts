import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

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

  return {
    id: eventId,
    condition: (state: GameState) => {
      // Check if previous level was accepted (or if this is the first level)
      if (state.boneDevourerState.lastAcceptedLevel < level - 1) {
        return false;
      }

      // Check if this level was already accepted
      if (state.boneDevourerState.lastAcceptedLevel >= level) {
        return false;
      }

      // Check building requirements
      if (woodenHuts !== undefined) {
        return state.buildings.woodenHut >= woodenHuts;
      }
      if (stoneHuts !== undefined) {
        return state.buildings.stoneHut >= stoneHuts;
      }

      return false;
    },
    
    timeProbability: (state: GameState) => {
      const hasBeenSeen = state.triggeredEvents?.[`${eventId}_seen`];
      return hasBeenSeen ? 25 : 10;
    },
    title: "The Bone Devourer",
    message: (state: GameState) => {
      const hasBeenTriggered = state.triggeredEvents?.[eventId];
      if (hasBeenTriggered) {
        return `The creature returns to the village gates, its hunched form still covered in pale, stretched skin. It speaks in its familiar rasping voice: 'I seek bones. I pay ${silverReward} silver.'`;
      }
      return `A deformed creature shuffles to the village gates, its hunched form covered in pale, stretched skin. It speaks in a rasping voice: 'I seek bones. I pay ${silverReward} silver.'`;
    },
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true, // Don't add to event log, only show in timed tab
    choices: [
      {
        id: "sellBones",
        label: `Sell ${boneCost} Bones`,
        cost: `${boneCost} bones`,
        effect: (
          state: GameState,
        ): Partial<GameState> & { _logMessage?: string } => {
          if (state.resources.bones < boneCost) {
            return {
              _logMessage: "You don't have enough bones for the trade.",
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
            _logMessage: `The creature takes the bones with its gnarled hands, as if attempting to count them. It places a pouch with ${silverReward} silver at your feet and disappears into the darkness.`,
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse trade",
        effect: (
          state: GameState,
        ): Partial<GameState> & { _logMessage?: string } => {
          return {
            triggeredEvents: {
              ...(state.triggeredEvents || {}),
              [`${eventId}_seen`]: true,
            },
            _logMessage:
              "You refuse the creature's offer. It hisses in displeasure and retreats into the shadows. You sense it will return.",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "refuse",
      label: "Time Expired",
      effect: (
        state: GameState,
      ): Partial<GameState> & { _logMessage?: string } => {
        return {
          triggeredEvents: {
            ...(state.triggeredEvents || {}),
            [`${eventId}_seen`]: true,
          },
          _logMessage:
            "Your indecision frustrates the creature. It hisses in displeasure and retreats into the shadows.",
        };
      },
    },
  };
}

// Generate all bone devourer events
export const boneDevourerEvents: Record<string, GameEvent> = {};
boneDevourerConfigs.forEach((config) => {
  const event = createBoneDevourerEvent(config);
  boneDevourerEvents[event.id] = event;
});
