import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";

interface BoneDevourerConfig {
  level: number;
  woodenHuts?: number;
  stoneHuts?: number;
  boneCost: number;
  silverReward: number;
}

const boneDevourerConfigs: BoneDevourerConfig[] = [
  { level: 1, woodenHuts: 3, boneCost: 100, silverReward: 25 },
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
    triggerType: "resource",
    timeProbability: (state: GameState) => {
      // First appearance of this level: 10 minutes
      // After being seen (regardless of accept/decline): 25 minutes
      const hasBeenSeen = state.triggeredEvents?.[`${eventId}_seen`];
      return hasBeenSeen ? 0.25 : 0.10;
    },
    title: "The Bone Devourer",
    message: (state: GameState) => {
      const hasBeenTriggered = state.triggeredEvents?.[eventId];
      if (hasBeenTriggered) {
        return `The creature returns to the village gates, its hunched form still covered in pale, stretched skin. It speaks in its familiar rasping voice: 'I seek bones. ${boneCost} bones. I pay ${silverReward} silver.'`;
      }
      return `A deformed creature shuffles to the village gates, its hunched form covered in pale, stretched skin. It speaks in a rasping voice: 'I seek bones. ${boneCost} bones. I pay ${silverReward} silver.'`;
    },
    triggered: false,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "sellBones",
        label: `Sell bones`,
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
            _logMessage: `The creature takes the bones with its gnarled hands, as if attempting to count them. It places a pouch of silver at your feet and disappears into the darkness.`,
          };
        },
      },
      {
        id: "refuse",
        label: "Refuse the trade",
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
  };
}

// Generate all bone devourer events
export const boneDevourerEvents: Record<string, GameEvent> = {};
boneDevourerConfigs.forEach((config) => {
  const event = createBoneDevourerEvent(config);
  boneDevourerEvents[event.id] = event;
});

// Bone Army Attack event
boneDevourerEvents.boneArmyAttack = {
  id: "boneArmyAttack",
  condition: (state: GameState) =>
    state.boneDevourerState.lastAcceptedLevel >= 6 &&
    !state.clothing.devourer_crown &&
    state.current_population > 10,
  triggerType: "resource",
  timeProbability: 15,
  title: "The Bone Army",
  message:
    "The earth trembles as an army of skeletal creatures rises from the ground. The Bone Devourer has used the bones you traded to build an unholy legion. They march toward the village with hollow eyes and weapons of sharpened bone.",
  triggered: false,
  priority: 4,
  repeatable: true,
  choices: [
    {
      id: "defendAgainstBoneArmy",
      label: "Defend village",
      relevant_stats: ["strength"],
      success_chance: (state: GameState) => {
        const traps = state.buildings.traps;
        return calculateSuccessChance(
          state,
          0.12 + traps * 0.1,
          { type: 'strength', multiplier: 0.01 }
        );
      },
      effect: (state: GameState) => {
        const traps = state.buildings.traps;
        const strength = getTotalStrength(state);

        // Check for victory: 12% base chance + 1% per strength point
        // Traps increase victory chance by 10%
        const victoryChance = calculateSuccessChance(
          state,
          0.12 + traps * 0.1,
          { type: 'strength', multiplier: 0.01 }
        );

        if (Math.random() < victoryChance) {
          // Victory! Get Devourer Crown
          return {
            clothing: {
              ...state.clothing,
              devourer_crown: true,
            },
            _logMessage:
              "The village defeats the bone army! The skeletal creatures shatter into fragments. Among the remains, you find the Devourer's Crown, pulsing with dark knowledge.",
          };
        }

        // Base chance of casualties (75%), reduced by 2% per strength point, minimum 25%
        // Traps reduce death chance by 10%
        const casualtyChance =
          Math.max(0.25, 0.75 - strength * 0.02) -
          traps * 0.1 +
          state.CM * 0.05;

        let villagerDeaths = 0;
        let foodLoss = Math.min(
          state.resources.food,
          (state.buildings.woodenHut + Math.floor(Math.random() * 10)) * 30 +
            50 +
            state.CM * 150,
        );
        let hutDestroyed = false;

        // Determine villager casualties
        // Traps reduce max deaths by 3
        const maxPotentialDeaths = Math.min(
          5 + state.buildings.woodenHut + state.CM * 2 - traps * 3,
          state.current_population,
        );
        for (let i = 0; i < maxPotentialDeaths; i++) {
          if (Math.random() < casualtyChance) {
            villagerDeaths++;
          }
        }

        // If 3+ villagers die and there's a hut, 30% chance to destroy it
        if (villagerDeaths >= 3 && state.buildings.woodenHut > 0) {
          if (Math.random() < 0.3 + state.CM * 0.25 - traps * 0.05) {
            hutDestroyed = true;
          }
        }

        // Apply deaths to villagers
        const deathResult = killVillagers(state, villagerDeaths);
        const actualDeaths = deathResult.villagersKilled || 0;

        // Construct result message
        let message = "The village fights desperately against the bone army. ";

        if (actualDeaths === 0) {
          message += "The villagers survive the onslaught.";
        } else if (actualDeaths === 1) {
          message += "One villager falls to the skeletal warriors.";
        } else {
          message += `${actualDeaths} villagers are slain by the bone creatures.`;
        }

        if (foodLoss > 0) {
          message += ` The bone army destroys ${foodLoss} food in their rampage.`;
        }

        if (hutDestroyed) {
          message +=
            " The skeletal creatures tear apart one of the huts, reducing it to rubble.";
        }

        return {
          ...deathResult,
          resources: {
            ...state.resources,
            food: Math.max(0, state.resources.food - foodLoss),
          },
          buildings: hutDestroyed
            ? {
                ...state.buildings,
                woodenHut: Math.max(0, state.buildings.woodenHut - 1),
              }
            : state.buildings,
          _logMessage: message,
        };
      },
    },
    {
      id: "hideFromBoneArmy",
      label: "Hide",
      relevant_stats: ["luck"],
      success_chance: (state: GameState) => {
        const traps = state.buildings.traps;
        return calculateSuccessChance(
          state,
          0.1 + traps * 0.1,
          { type: 'luck', multiplier: 0.02 }
        );
      },
      effect: (state: GameState) => {
        const traps = state.buildings.traps;
        const success_chance = calculateSuccessChance(
          state,
          0.1 + traps * 0.1,
          { type: 'luck', multiplier: 0.02 }
        );

        let villagerDeaths = 0;
        let foodLoss = 0;
        let deathResult = {};

        if (Math.random() < success_chance) {
          // Success - bone army passes without finding anyone
          return {
            _logMessage:
              "The villagers hide in terror as the bone army searches the village. The skeletal creatures eventually march away, their purpose unfulfilled.",
          };
        } else {
          const luck = getTotalLuck(state);
          const casualtyChance =
            Math.max(0.15, 0.4 - luck * 0.02) - traps * 0.05 + state.CM * 0.05;

          foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 20)) * 40 +
              50 +
              state.CM * 3,
          );

          // Determine villager casualties
          const maxPotentialDeaths = Math.min(
            3 + state.buildings.woodenHut / 2 - traps * 1 + state.CM * 2,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Apply deaths to villagers
          deathResult = killVillagers(state, villagerDeaths);
        }

        const actualDeaths = deathResult.villagersKilled || 0;

        // Construct result message
        let message =
          "The villagers hide in terror as the bone army searches the village. ";

        if (actualDeaths === 0) {
          message +=
            "By morning, the skeletal army has departed, leaving only bone fragments behind.";
        } else if (actualDeaths === 1) {
          message +=
            "One villager who tried to flee is dragged away by bony hands.";
        } else {
          message += `${actualDeaths} villagers are taken by the bone creatures.`;
        }

        message += ` The army ransacks your supplies, destroying ${foodLoss} food.`;

        return {
          ...deathResult,
          resources: {
            ...state.resources,
            food: Math.max(0, state.resources.food - foodLoss),
          },
          _logMessage: message,
        };
      },
    },
  ],
};