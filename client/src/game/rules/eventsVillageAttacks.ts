
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";

// Bone Army Attack Parameters
const BONE_ARMY_PARAMS = {
  defendVictory: {
    baseChance: 0.12,
    strengthMultiplier: 0.01,
    trapsBonus: 0.1,
  },
  defendCasualty: {
    baseChance: 0.75,
    strengthReduction: 0.02,
    minChance: 0.25,
    trapsReduction: 0.1,
    maxDeaths: {
      base: 5,
      perHut: 1,
      perTrap: -3,
    },
    hutDestructionChance: 0.3,
    hutDestructionMinDeaths: 3,
    trapsHutReduction: 0.05,
  },
  hideCasualty: {
    baseChance: 0.4,
    luckReduction: 0.02,
    minChance: 0.15,
    trapsReduction: 0.05,
    maxDeaths: {
      base: 3,
      perHut: 0.5,
      perTrap: -1,
    },
  },
  hideSuccess: {
    baseChance: 0.1,
    luckMultiplier: 0.02,
    trapsBonus: 0.1,
  },
  foodLoss: {
    base: 50,
    perHut: 30,
    randomRange: 10,
  },
};

// Wolf Attack Parameters
const WOLF_ATTACK_PARAMS = {
  defendVictory: {
    baseChance: 0.15,
    strengthMultiplier: 0.01,
    trapsBonus: 0.1,
  },
  defendCasualty: {
    baseChance: 0.6,
    strengthReduction: 0.02,
    minChance: 0.2,
    trapsReduction: 0.1,
    maxDeaths: {
      base: 4,
      perHut: 1,
      perTrap: -3,
    },
    hutDestructionChance: 0,
    hutDestructionMinDeaths: 2,
    trapsHutReduction: 0.05,
  },
  hideCasualty: {
    baseChance: 0.35,
    luckReduction: 0.02,
    minChance: 0.1,
    trapsReduction: 0.05,
    maxDeaths: {
      base: 2,
      perHut: 0.5,
      perTrap: -1,
    },
  },
  hideSuccess: {
    baseChance: 0.15,
    luckMultiplier: 0.02,
    trapsBonus: 0.1,
  },
  foodLoss: {
    base: 25,
    perHut: 25,
    randomRange: 8,
  },
};

// Cannibal Raid Parameters
const CANNIBAL_RAID_PARAMS = {
  defendVictory: {
    baseChance: 0.1,
    strengthMultiplier: 0.01,
    trapsBonus: 0.1,
    minimalDeaths: {
      base: 0,
      randomRange: 2,
    },
    silverReward: 500,
  },
  defendCasualty: {
    baseChance: 0.5,
    strengthReduction: 0.01,
    minChance: 0.15,
    trapsReduction: 0.1,
    maxDeaths: {
      base: 4,
      perHut: 1,
      perTrap: -3,
    },
  },
  hideCasualty: {
    baseChance: 0.3,
    luckReduction: 0.01,
    minChance: 0.1,
    trapsReduction: 0.05,
    maxDeaths: {
      base: 4,
      perHut: 0.5,
      perTrap: -2,
    },
  },
  hideSuccess: {
    baseChance: 0.05,
    luckMultiplier: 0.01,
    trapsBonus: 0.1,
  },
  resourceLoss: {
    silver: {
      base: 25,
      randomMultiplier: 25,
      randomRange: 4,
    },
    food: {
      base: 50,
      randomMultiplier: 50,
      randomRange: 6,
    },
    silverHiding: {
      base: 50,
      randomMultiplier: 50,
      randomRange: 4,
    },
    foodHiding: {
      base: 100,
      randomMultiplier: 100,
      randomRange: 6,
    },
  },
};

export const villageAttackEvents: Record<string, GameEvent> = {
  boneArmyAttack: {
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
            BONE_ARMY_PARAMS.defendVictory.baseChance + traps * BONE_ARMY_PARAMS.defendVictory.trapsBonus,
            {
              type: "strength",
              multiplier: BONE_ARMY_PARAMS.defendVictory.strengthMultiplier,
            }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            BONE_ARMY_PARAMS.defendVictory.baseChance + traps * BONE_ARMY_PARAMS.defendVictory.trapsBonus,
            { type: "strength", multiplier: BONE_ARMY_PARAMS.defendVictory.strengthMultiplier },
          );

          if (Math.random() < victoryChance) {
            return {
              clothing: {
                ...state.clothing,
                devourer_crown: true,
              },
              _logMessage:
                "The village defeats the bone army! The skeletal creatures shatter into fragments. Among the remains, you find the Devourer's Crown, pulsing with dark knowledge.",
            };
          }

          const casualtyChance =
            Math.max(
              BONE_ARMY_PARAMS.defendCasualty.minChance,
              BONE_ARMY_PARAMS.defendCasualty.baseChance - strength * BONE_ARMY_PARAMS.defendCasualty.strengthReduction
            ) -
            traps * BONE_ARMY_PARAMS.defendCasualty.trapsReduction +
            state.CM * 0.05;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * BONE_ARMY_PARAMS.foodLoss.randomRange)) *
              BONE_ARMY_PARAMS.foodLoss.perHut +
              BONE_ARMY_PARAMS.foodLoss.base +
              state.CM * 150,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            BONE_ARMY_PARAMS.defendCasualty.maxDeaths.base +
              state.buildings.woodenHut * BONE_ARMY_PARAMS.defendCasualty.maxDeaths.perHut +
              state.CM * 2 +
              traps * BONE_ARMY_PARAMS.defendCasualty.maxDeaths.perTrap,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          if (
            villagerDeaths >= BONE_ARMY_PARAMS.defendCasualty.hutDestructionMinDeaths &&
            state.buildings.woodenHut > 0
          ) {
            if (
              Math.random() <
              BONE_ARMY_PARAMS.defendCasualty.hutDestructionChance +
                state.CM * 0.25 -
                traps * BONE_ARMY_PARAMS.defendCasualty.trapsHutReduction
            ) {
              hutDestroyed = true;
            }
          }

          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

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
            BONE_ARMY_PARAMS.hideSuccess.baseChance + traps * BONE_ARMY_PARAMS.hideSuccess.trapsBonus,
            {
              type: "luck",
              multiplier: BONE_ARMY_PARAMS.hideSuccess.luckMultiplier,
            }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            BONE_ARMY_PARAMS.hideSuccess.baseChance + traps * BONE_ARMY_PARAMS.hideSuccess.trapsBonus,
            { type: "luck", multiplier: BONE_ARMY_PARAMS.hideSuccess.luckMultiplier },
          );

          let villagerDeaths = 0;
          let foodLoss = 0;
          let deathResult = {};

          if (Math.random() < success_chance) {
            return {
              _logMessage:
                "The villagers hide in terror as the bone army searches the village. The skeletal creatures eventually march away, their purpose unfulfilled.",
            };
          } else {
            const luck = getTotalLuck(state);
            const casualtyChance =
              Math.max(
                BONE_ARMY_PARAMS.hideCasualty.minChance,
                BONE_ARMY_PARAMS.hideCasualty.baseChance - luck * BONE_ARMY_PARAMS.hideCasualty.luckReduction
              ) -
              traps * BONE_ARMY_PARAMS.hideCasualty.trapsReduction +
              state.CM * 0.05;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * 20)) * 40 +
                50 +
                state.CM * 3,
            );

            const maxPotentialDeaths = Math.min(
              BONE_ARMY_PARAMS.hideCasualty.maxDeaths.base +
                state.buildings.woodenHut * BONE_ARMY_PARAMS.hideCasualty.maxDeaths.perHut +
                traps * BONE_ARMY_PARAMS.hideCasualty.maxDeaths.perTrap +
                state.CM * 2,
              state.current_population,
            );
            for (let i = 0; i < maxPotentialDeaths; i++) {
              if (Math.random() < casualtyChance) {
                villagerDeaths++;
              }
            }

            deathResult = killVillagers(state, villagerDeaths);
          }

          const actualDeaths = deathResult.villagersKilled || 0;

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
  },

  wolfAttack: {
    id: "wolfAttack",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 3 &&
      !state.clothing.alphas_hide &&
      state.current_population > 10,
    triggerType: "resource",
    timeProbability: 40,
    title: "Wolf Attack",
    message:
      "Close to midnight, wolves emerge from the darkness, their eyes glowing with unnatural hunger. Their howls echo filled with malice as they circle the village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        label: "Defend village",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;

          if (!state.story.seen.firstWolfAttack) {
            return 0;
          }

          return calculateSuccessChance(
            state,
            WOLF_ATTACK_PARAMS.defendVictory.baseChance + traps * WOLF_ATTACK_PARAMS.defendVictory.trapsBonus,
            { type: 'strength', multiplier: WOLF_ATTACK_PARAMS.defendVictory.strengthMultiplier }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          let victoryChance;
          if (!state.story.seen.firstWolfAttack) {
            victoryChance = 0;
          } else {
            victoryChance = calculateSuccessChance(
              state,
              WOLF_ATTACK_PARAMS.defendVictory.baseChance + traps * WOLF_ATTACK_PARAMS.defendVictory.trapsBonus,
              { type: 'strength', multiplier: WOLF_ATTACK_PARAMS.defendVictory.strengthMultiplier }
            );
          }

          if (Math.random() < victoryChance) {
            return {
              clothing: {
                ...state.clothing,
                alphas_hide: true,
              },
              _logMessage:
                "The village defeats the wolf pack! You slay the alpha wolf and claim its hide as a trophy. It radiates with primal power.",
            };
          }

          const casualtyChance =
            Math.max(
              WOLF_ATTACK_PARAMS.defendCasualty.minChance,
              WOLF_ATTACK_PARAMS.defendCasualty.baseChance - strength * WOLF_ATTACK_PARAMS.defendCasualty.strengthReduction
            ) -
            traps * WOLF_ATTACK_PARAMS.defendCasualty.trapsReduction +
            state.CM * 0.05;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * WOLF_ATTACK_PARAMS.foodLoss.randomRange)) *
              WOLF_ATTACK_PARAMS.foodLoss.perHut +
              WOLF_ATTACK_PARAMS.foodLoss.base +
              state.CM * 100,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            WOLF_ATTACK_PARAMS.defendCasualty.maxDeaths.base +
              state.buildings.woodenHut * WOLF_ATTACK_PARAMS.defendCasualty.maxDeaths.perHut +
              state.CM * 2 +
              traps * WOLF_ATTACK_PARAMS.defendCasualty.maxDeaths.perTrap,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          if (
            villagerDeaths >= WOLF_ATTACK_PARAMS.defendCasualty.hutDestructionMinDeaths &&
            state.buildings.woodenHut > 0
          ) {
            if (Math.random() < state.CM * 0.25 - traps * WOLF_ATTACK_PARAMS.defendCasualty.trapsHutReduction) {
              hutDestroyed = true;
            }
          }

          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          let message = "The village fights desperately against the wolves. ";

          if (actualDeaths === 0) {
            message += "The villagers survive the attack.";
          } else if (actualDeaths === 1) {
            message += "One villager falls to the wolves' supernatural fury.";
          } else {
            message += `${actualDeaths} villagers are claimed by the wolves' unnatural hunger.`;
          }

          if (foodLoss > 0) {
            message += ` The wolves also devour ${foodLoss} food from the stores.`;
          }

          if (hutDestroyed) {
            message +=
              " In their rampage, the wolves destroy one of the huts, leaving only splintered wood.";
          }

          if (!state.story.seen.firstWolfAttack)
            message +=
              " Villagers suggest to lay traps around the village to protect better from wolfs and other foes.";

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
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWolfAttack: true,
              },
            },
            _logMessage: message,
          };
        },
      },
      {
        id: "hideAndWait",
        label: "Hide",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(
            state,
            WOLF_ATTACK_PARAMS.hideSuccess.baseChance + traps * WOLF_ATTACK_PARAMS.hideSuccess.trapsBonus,
            { type: 'luck', multiplier: WOLF_ATTACK_PARAMS.hideSuccess.luckMultiplier }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            WOLF_ATTACK_PARAMS.hideSuccess.baseChance + traps * WOLF_ATTACK_PARAMS.hideSuccess.trapsBonus,
            { type: 'luck', multiplier: WOLF_ATTACK_PARAMS.hideSuccess.luckMultiplier }
          );

          let villagerDeaths = 0;
          let foodLoss = 0;
          let deathResult = {};

          if (Math.random() < success_chance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  firstWolfAttack: true,
                },
              },
              _logMessage:
                "The villagers huddle in their huts as the wolves prowl outside. By dawn, the wolves have departed without finding anyone, leaving only scratches and terror behind.",
            };
          } else {
            const luck = getTotalLuck(state);
            const casualtyChance =
              Math.max(
                WOLF_ATTACK_PARAMS.hideCasualty.minChance,
                WOLF_ATTACK_PARAMS.hideCasualty.baseChance - luck * WOLF_ATTACK_PARAMS.hideCasualty.luckReduction
              ) -
              traps * WOLF_ATTACK_PARAMS.hideCasualty.trapsReduction +
              state.CM * 0.05;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * 16)) * 25 +
                25 +
                state.CM * 2,
            );

            const maxPotentialDeaths = Math.min(
              WOLF_ATTACK_PARAMS.hideCasualty.maxDeaths.base +
                state.buildings.woodenHut * WOLF_ATTACK_PARAMS.hideCasualty.maxDeaths.perHut +
                traps * WOLF_ATTACK_PARAMS.hideCasualty.maxDeaths.perTrap +
                state.CM * 2,
              state.current_population,
            );
            for (let i = 0; i < maxPotentialDeaths; i++) {
              if (Math.random() < casualtyChance) {
                villagerDeaths++;
              }
            }

            deathResult = killVillagers(state, villagerDeaths);
          }

          const actualDeaths = deathResult.villagersKilled || 0;

          let message =
            "The villagers huddle in their huts as the wolves prowl outside. ";

          if (actualDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (actualDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message += `${actualDeaths} villagers are dragged from their huts, their screams echoing through the night.`;
          }

          message += ` The wolves ransack your supplies, consuming ${foodLoss} food.`;

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - foodLoss),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWolfAttack: true,
              },
            },
            _logMessage: message,
          };
        },
      },
    ],
  },

  cannibalRaid: {
    id: "cannibalRaid",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 &&
      state.current_population > 10 &&
      !state.story.seen.cannibalRaidVictory,
    triggerType: "resource",
    timeProbability: 40,
    title: "Cannibal Raid",
    message:
      "War drums echo through the night as tribe of cannibals emerges from the wilderness. They advance on the village with crude weapons and terrible intent.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "fightCannibals",
        label: "Defend village",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(
            state,
            CANNIBAL_RAID_PARAMS.defendVictory.baseChance + traps * CANNIBAL_RAID_PARAMS.defendVictory.trapsBonus,
            { type: 'strength', multiplier: CANNIBAL_RAID_PARAMS.defendVictory.strengthMultiplier }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            CANNIBAL_RAID_PARAMS.defendVictory.baseChance + traps * CANNIBAL_RAID_PARAMS.defendVictory.trapsBonus,
            { type: 'strength', multiplier: CANNIBAL_RAID_PARAMS.defendVictory.strengthMultiplier }
          );

          if (Math.random() < victoryChance) {
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * CANNIBAL_RAID_PARAMS.defendVictory.minimalDeaths.randomRange) +
                CANNIBAL_RAID_PARAMS.defendVictory.minimalDeaths.base +
                state.CM * 1,
              state.current_population,
            );
            const deathResult = killVillagers(state, minimalDeaths);
            const actualDeaths = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              resources: {
                ...state.resources,
                silver: state.resources.silver + CANNIBAL_RAID_PARAMS.defendVictory.silverReward,
              },
              clothing: {
                ...state.clothing,
                bone_necklace: true,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  cannibalRaidVictory: true,
                },
              },
              _logMessage:
                actualDeaths === 1
                  ? `The villagers drive back the cannibals! One villager falls in the battle, but the tribe retreats in defeat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID_PARAMS.defendVictory.silverReward} silver.`
                  : `The villagers fight valiantly and repel the cannibals! ${actualDeaths} villagers fall in the battle, but the tribe is forced to retreat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID_PARAMS.defendVictory.silverReward} silver.`,
            };
          }

          const casualtyChance =
            Math.max(
              CANNIBAL_RAID_PARAMS.defendCasualty.minChance,
              CANNIBAL_RAID_PARAMS.defendCasualty.baseChance - strength * CANNIBAL_RAID_PARAMS.defendCasualty.strengthReduction
            ) -
            traps * CANNIBAL_RAID_PARAMS.defendCasualty.trapsReduction +
            state.CM * 0.1;

          let totalLost = 0;

          const maxPotentialCasualties = Math.min(
            CANNIBAL_RAID_PARAMS.defendCasualty.maxDeaths.base +
              state.buildings.woodenHut * CANNIBAL_RAID_PARAMS.defendCasualty.maxDeaths.perHut +
              traps * CANNIBAL_RAID_PARAMS.defendCasualty.maxDeaths.perTrap +
              state.CM * 2,
            state.current_population,
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * CANNIBAL_RAID_PARAMS.resourceLoss.silver.randomRange) *
              CANNIBAL_RAID_PARAMS.resourceLoss.silver.randomMultiplier +
              CANNIBAL_RAID_PARAMS.resourceLoss.silver.base +
              state.CM * 100,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * CANNIBAL_RAID_PARAMS.resourceLoss.food.randomRange) *
              CANNIBAL_RAID_PARAMS.resourceLoss.food.randomMultiplier +
              CANNIBAL_RAID_PARAMS.resourceLoss.food.base +
              state.CM * 250,
          );

          const deathResult = killVillagers(state, totalLost);
          const actualLost = deathResult.villagersKilled || 0;

          let message = "The cannibals overwhelm your defenses. ";

          if (actualLost === 0) {
            message += "The villagers manage to survive, though barely.";
          } else if (actualLost === 1) {
            message += "One villager is abducted by the cannibals.";
          } else {
            message += `${actualLost} villagers are killed or abducted by the cannibals.`;
          }

          if (silverLoss > 0 || foodLoss > 0) {
            message += " The cannibals ransack your stores";
            if (silverLoss > 0 && foodLoss > 0) {
              message += `, stealing ${silverLoss} silver and ${foodLoss} food`;
            } else if (silverLoss > 0) {
              message += `, stealing ${silverLoss} silver`;
            } else {
              message += `, stealing ${foodLoss} food`;
            }
            message += ".";
          }

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              silver: Math.max(0, state.resources.silver - silverLoss),
              food: Math.max(0, state.resources.food - foodLoss),
            },
            _logMessage: message,
          };
        },
      },
      {
        id: "hideFromCannibals",
        label: "Hide",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(
            state,
            CANNIBAL_RAID_PARAMS.hideSuccess.baseChance + traps * CANNIBAL_RAID_PARAMS.hideSuccess.trapsBonus,
            { type: 'luck', multiplier: CANNIBAL_RAID_PARAMS.hideSuccess.luckMultiplier }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            CANNIBAL_RAID_PARAMS.hideSuccess.baseChance + traps * CANNIBAL_RAID_PARAMS.hideSuccess.trapsBonus,
            { type: 'luck', multiplier: CANNIBAL_RAID_PARAMS.hideSuccess.luckMultiplier }
          );

          let totalLost = 0;
          let silverLoss = 0;
          let foodLoss = 0;
          let deathResult = {};

          if (Math.random() < success_chance) {
            return {
              _logMessage:
                "The villagers hide in terror as the cannibals search the village. By dawn, the cannibals have left without finding anyone.",
            };
          } else {
            const luck = getTotalLuck(state);
            const casualtyChance =
              Math.max(
                CANNIBAL_RAID_PARAMS.hideCasualty.minChance,
                CANNIBAL_RAID_PARAMS.hideCasualty.baseChance - luck * CANNIBAL_RAID_PARAMS.hideCasualty.luckReduction
              ) -
              traps * CANNIBAL_RAID_PARAMS.hideCasualty.trapsReduction +
              state.CM * 0.05;

            const maxPotentialCasualties = Math.min(
              CANNIBAL_RAID_PARAMS.hideCasualty.maxDeaths.base +
                Math.floor(state.buildings.woodenHut * CANNIBAL_RAID_PARAMS.hideCasualty.maxDeaths.perHut) +
                traps * CANNIBAL_RAID_PARAMS.hideCasualty.maxDeaths.perTrap +
                state.CM * 2,
              state.current_population,
            );

            for (let i = 0; i < maxPotentialCasualties; i++) {
              if (Math.random() < casualtyChance) {
                totalLost++;
              }
            }

            silverLoss = Math.min(
              state.resources.silver,
              Math.floor(Math.random() * CANNIBAL_RAID_PARAMS.resourceLoss.silverHiding.randomRange) *
                CANNIBAL_RAID_PARAMS.resourceLoss.silverHiding.randomMultiplier +
                CANNIBAL_RAID_PARAMS.resourceLoss.silverHiding.base +
                state.CM * 200,
            );
            foodLoss = Math.min(
              state.resources.food,
              Math.floor(Math.random() * CANNIBAL_RAID_PARAMS.resourceLoss.foodHiding.randomRange) *
                CANNIBAL_RAID_PARAMS.resourceLoss.foodHiding.randomMultiplier +
                CANNIBAL_RAID_PARAMS.resourceLoss.foodHiding.base +
                state.CM * 500,
            );

            deathResult = killVillagers(state, totalLost);
          }

          let message =
            "The villagers hide in terror as the cannibals search the village. ";

          if (totalLost === 0) {
            message +=
              "By dawn, the cannibals have left without finding anyone.";
          } else if (totalLost === 1) {
            message += "One villager gets abducted.";
          } else {
            message += `${totalLost} villagers are killed or abducted.`;
          }

          message += ` The cannibals plunder your stores freely, taking ${silverLoss} silver and ${foodLoss} food.`;

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              silver: Math.max(0, state.resources.silver - silverLoss),
              food: Math.max(0, state.resources.food - foodLoss),
            },
            _logMessage: message,
          };
        },
      },
    ],
  },
};
