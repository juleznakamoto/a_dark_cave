
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";

// ============================================================================
// EVENT PARAMETERS
// ============================================================================

// Wolf Attack Parameters
const WOLF_ATTACK = {
  BASE_VICTORY_CHANCE: 0.15,
  VICTORY_CHANCE_PER_STRENGTH: 0.01,
  TRAP_VICTORY_BONUS: 0.1,
  BASE_CASUALTY_CHANCE: 0.6,
  CASUALTY_REDUCTION_PER_STRENGTH: 0.02,
  MIN_CASUALTY_CHANCE: 0.2,
  TRAP_CASUALTY_REDUCTION: 0.1,
  CM_CASUALTY_INCREASE: 0.05,
  BASE_MAX_DEATHS: 4,
  DEATHS_PER_HUT: 1,
  CM_DEATHS_INCREASE: 2,
  TRAP_DEATHS_REDUCTION: 3,
  BASE_FOOD_LOSS: 25,
  FOOD_LOSS_PER_HUT: 25,
  FOOD_LOSS_RANDOM_MULTIPLIER: 8,
  CM_FOOD_LOSS: 100,
  HUT_DESTRUCTION_THRESHOLD: 2,
  HUT_DESTRUCTION_CHANCE_CM: 0.25,
  TRAP_HUT_DESTRUCTION_REDUCTION: 0.05,
  HIDE_BASE_SUCCESS_CHANCE: 0.15,
  HIDE_SUCCESS_CHANCE_PER_LUCK: 0.02,
  TRAP_HIDE_SUCCESS_BONUS: 0.1,
  HIDE_BASE_CASUALTY_CHANCE: 0.35,
  HIDE_CASUALTY_REDUCTION_PER_LUCK: 0.02,
  HIDE_MIN_CASUALTY_CHANCE: 0.1,
  HIDE_TRAP_CASUALTY_REDUCTION: 0.05,
  HIDE_CM_CASUALTY_INCREASE: 0.05,
  HIDE_BASE_MAX_DEATHS: 2,
  HIDE_DEATHS_PER_HUT: 0.5,
  HIDE_TRAP_DEATHS_REDUCTION: 1,
  HIDE_CM_DEATHS_INCREASE: 2,
  HIDE_BASE_FOOD_LOSS: 25,
  HIDE_FOOD_LOSS_PER_HUT: 25,
  HIDE_FOOD_LOSS_RANDOM_MULTIPLIER: 16,
  HIDE_CM_FOOD_LOSS: 2,
};

// Cannibal Raid Parameters
const CANNIBAL_RAID = {
  BASE_VICTORY_CHANCE: 0.1,
  VICTORY_CHANCE_PER_STRENGTH: 0.01,
  TRAP_VICTORY_BONUS: 0.1,
  VICTORY_MIN_DEATHS: 0,
  VICTORY_MAX_DEATHS: 2,
  CM_VICTORY_DEATHS: 1,
  VICTORY_SILVER_REWARD: 500,
  BASE_CASUALTY_CHANCE: 0.5,
  CASUALTY_REDUCTION_PER_STRENGTH: 0.01,
  MIN_CASUALTY_CHANCE: 0.15,
  TRAP_CASUALTY_REDUCTION: 0.1,
  CM_CASUALTY_INCREASE: 0.1,
  BASE_MAX_CASUALTIES: 4,
  CASUALTIES_PER_HUT: 1,
  TRAP_CASUALTIES_REDUCTION: 3,
  CM_CASUALTIES_INCREASE: 2,
  BASE_SILVER_LOSS: 25,
  SILVER_LOSS_RANDOM_MULTIPLIER: 4,
  SILVER_LOSS_MULTIPLIER: 25,
  CM_SILVER_LOSS: 100,
  BASE_FOOD_LOSS: 50,
  FOOD_LOSS_RANDOM_MULTIPLIER: 6,
  FOOD_LOSS_MULTIPLIER: 50,
  CM_FOOD_LOSS: 250,
  HIDE_BASE_SUCCESS_CHANCE: 0.05,
  HIDE_SUCCESS_CHANCE_PER_LUCK: 0.01,
  HIDE_TRAP_SUCCESS_BONUS: 0.1,
  HIDE_BASE_CASUALTY_CHANCE: 0.3,
  HIDE_CASUALTY_REDUCTION_PER_LUCK: 0.01,
  HIDE_MIN_CASUALTY_CHANCE: 0.1,
  HIDE_TRAP_CASUALTY_REDUCTION: 0.05,
  HIDE_CM_CASUALTY_INCREASE: 0.05,
  HIDE_BASE_MAX_CASUALTIES: 4,
  HIDE_CASUALTIES_PER_HUT: 0.5,
  HIDE_TRAP_CASUALTIES_REDUCTION: 2,
  HIDE_CM_CASUALTIES_INCREASE: 2,
  HIDE_BASE_SILVER_LOSS: 50,
  HIDE_SILVER_LOSS_RANDOM_MULTIPLIER: 4,
  HIDE_SILVER_LOSS_MULTIPLIER: 50,
  HIDE_CM_SILVER_LOSS: 200,
  HIDE_BASE_FOOD_LOSS: 100,
  HIDE_FOOD_LOSS_RANDOM_MULTIPLIER: 6,
  HIDE_FOOD_LOSS_MULTIPLIER: 100,
  HIDE_CM_FOOD_LOSS: 500,
};

// Bone Army Parameters
const BONE_ARMY = {
  BASE_VICTORY_CHANCE: 0.12,
  VICTORY_CHANCE_PER_STRENGTH: 0.01,
  TRAP_VICTORY_BONUS: 0.1,
  BASE_CASUALTY_CHANCE: 0.75,
  CASUALTY_REDUCTION_PER_STRENGTH: 0.02,
  MIN_CASUALTY_CHANCE: 0.25,
  TRAP_CASUALTY_REDUCTION: 0.1,
  CM_CASUALTY_INCREASE: 0.05,
  BASE_MAX_DEATHS: 5,
  DEATHS_PER_HUT: 1,
  CM_DEATHS_INCREASE: 2,
  TRAP_DEATHS_REDUCTION: 3,
  BASE_FOOD_LOSS: 50,
  FOOD_LOSS_PER_HUT: 30,
  FOOD_LOSS_RANDOM_MULTIPLIER: 10,
  CM_FOOD_LOSS: 150,
  HUT_DESTRUCTION_THRESHOLD: 3,
  HUT_DESTRUCTION_BASE_CHANCE_CM: 0.3,
  HUT_DESTRUCTION_CM_INCREASE: 0.25,
  TRAP_HUT_DESTRUCTION_REDUCTION: 0.05,
  HIDE_BASE_SUCCESS_CHANCE: 0.1,
  HIDE_SUCCESS_CHANCE_PER_LUCK: 0.02,
  HIDE_TRAP_SUCCESS_BONUS: 0.1,
  HIDE_BASE_CASUALTY_CHANCE: 0.4,
  HIDE_CASUALTY_REDUCTION_PER_LUCK: 0.02,
  HIDE_MIN_CASUALTY_CHANCE: 0.15,
  HIDE_TRAP_CASUALTY_REDUCTION: 0.05,
  HIDE_CM_CASUALTY_INCREASE: 0.05,
  HIDE_BASE_MAX_DEATHS: 3,
  HIDE_DEATHS_PER_HUT: 0.5,
  HIDE_TRAP_DEATHS_REDUCTION: 1,
  HIDE_CM_DEATHS_INCREASE: 2,
  HIDE_BASE_FOOD_LOSS: 50,
  HIDE_FOOD_LOSS_PER_HUT: 40,
  HIDE_FOOD_LOSS_RANDOM_MULTIPLIER: 20,
  HIDE_CM_FOOD_LOSS: 3,
};

// ============================================================================
// EVENTS
// ============================================================================

export const villageAttackEvents: Record<string, GameEvent> = {
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
            WOLF_ATTACK.BASE_VICTORY_CHANCE + traps * WOLF_ATTACK.TRAP_VICTORY_BONUS,
            { type: 'strength', multiplier: WOLF_ATTACK.VICTORY_CHANCE_PER_STRENGTH }
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
              WOLF_ATTACK.BASE_VICTORY_CHANCE + traps * WOLF_ATTACK.TRAP_VICTORY_BONUS,
              { type: 'strength', multiplier: WOLF_ATTACK.VICTORY_CHANCE_PER_STRENGTH }
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
              WOLF_ATTACK.MIN_CASUALTY_CHANCE,
              WOLF_ATTACK.BASE_CASUALTY_CHANCE - strength * WOLF_ATTACK.CASUALTY_REDUCTION_PER_STRENGTH
            ) -
            traps * WOLF_ATTACK.TRAP_CASUALTY_REDUCTION +
            state.CM * WOLF_ATTACK.CM_CASUALTY_INCREASE;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * WOLF_ATTACK.FOOD_LOSS_RANDOM_MULTIPLIER)) * WOLF_ATTACK.FOOD_LOSS_PER_HUT +
              WOLF_ATTACK.BASE_FOOD_LOSS +
              state.CM * WOLF_ATTACK.CM_FOOD_LOSS,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            WOLF_ATTACK.BASE_MAX_DEATHS + state.buildings.woodenHut * WOLF_ATTACK.DEATHS_PER_HUT + state.CM * WOLF_ATTACK.CM_DEATHS_INCREASE - traps * WOLF_ATTACK.TRAP_DEATHS_REDUCTION,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Huts can only be destroyed in Cruel Mode
          if (state.CM === 1 && villagerDeaths >= WOLF_ATTACK.HUT_DESTRUCTION_THRESHOLD && state.buildings.woodenHut > 0) {
            if (Math.random() < WOLF_ATTACK.HUT_DESTRUCTION_CHANCE_CM - traps * WOLF_ATTACK.TRAP_HUT_DESTRUCTION_REDUCTION) {
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
            WOLF_ATTACK.HIDE_BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.HIDE_TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: WOLF_ATTACK.HIDE_SUCCESS_CHANCE_PER_LUCK }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            WOLF_ATTACK.HIDE_BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.HIDE_TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: WOLF_ATTACK.HIDE_SUCCESS_CHANCE_PER_LUCK }
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
                WOLF_ATTACK.HIDE_MIN_CASUALTY_CHANCE,
                WOLF_ATTACK.HIDE_BASE_CASUALTY_CHANCE - luck * WOLF_ATTACK.HIDE_CASUALTY_REDUCTION_PER_LUCK
              ) - traps * WOLF_ATTACK.HIDE_TRAP_CASUALTY_REDUCTION + state.CM * WOLF_ATTACK.HIDE_CM_CASUALTY_INCREASE;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * WOLF_ATTACK.HIDE_FOOD_LOSS_RANDOM_MULTIPLIER)) * WOLF_ATTACK.HIDE_FOOD_LOSS_PER_HUT +
                WOLF_ATTACK.HIDE_BASE_FOOD_LOSS +
                state.CM * WOLF_ATTACK.HIDE_CM_FOOD_LOSS,
            );

            const maxPotentialDeaths = Math.min(
              WOLF_ATTACK.HIDE_BASE_MAX_DEATHS + state.buildings.woodenHut * WOLF_ATTACK.HIDE_DEATHS_PER_HUT - traps * WOLF_ATTACK.HIDE_TRAP_DEATHS_REDUCTION + state.CM * WOLF_ATTACK.HIDE_CM_DEATHS_INCREASE,
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
            CANNIBAL_RAID.BASE_VICTORY_CHANCE + traps * CANNIBAL_RAID.TRAP_VICTORY_BONUS,
            { type: 'strength', multiplier: CANNIBAL_RAID.VICTORY_CHANCE_PER_STRENGTH }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            CANNIBAL_RAID.BASE_VICTORY_CHANCE + traps * CANNIBAL_RAID.TRAP_VICTORY_BONUS,
            { type: 'strength', multiplier: CANNIBAL_RAID.VICTORY_CHANCE_PER_STRENGTH }
          );

          if (Math.random() < victoryChance) {
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * CANNIBAL_RAID.VICTORY_MAX_DEATHS) + CANNIBAL_RAID.VICTORY_MIN_DEATHS + state.CM * CANNIBAL_RAID.CM_VICTORY_DEATHS,
              state.current_population,
            );
            const deathResult = killVillagers(state, minimalDeaths);
            const actualDeaths = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              resources: {
                ...state.resources,
                silver: state.resources.silver + CANNIBAL_RAID.VICTORY_SILVER_REWARD,
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
                  ? `The villagers drive back the cannibals! One villager falls in the battle, but the tribe retreats in defeat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID.VICTORY_SILVER_REWARD} silver.`
                  : `The villagers fight valiantly and repel the cannibals! ${actualDeaths} villagers fall in the battle, but the tribe is forced to retreat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID.VICTORY_SILVER_REWARD} silver.`,
            };
          }

          const casualtyChance =
            Math.max(
              CANNIBAL_RAID.MIN_CASUALTY_CHANCE,
              CANNIBAL_RAID.BASE_CASUALTY_CHANCE - strength * CANNIBAL_RAID.CASUALTY_REDUCTION_PER_STRENGTH
            ) -
            traps * CANNIBAL_RAID.TRAP_CASUALTY_REDUCTION +
            state.CM * CANNIBAL_RAID.CM_CASUALTY_INCREASE;

          let totalLost = 0;

          const maxPotentialCasualties = Math.min(
            CANNIBAL_RAID.BASE_MAX_CASUALTIES + state.buildings.woodenHut * CANNIBAL_RAID.CASUALTIES_PER_HUT - traps * CANNIBAL_RAID.TRAP_CASUALTIES_REDUCTION + state.CM * CANNIBAL_RAID.CM_CASUALTIES_INCREASE,
            state.current_population,
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * CANNIBAL_RAID.SILVER_LOSS_RANDOM_MULTIPLIER) * CANNIBAL_RAID.SILVER_LOSS_MULTIPLIER + CANNIBAL_RAID.BASE_SILVER_LOSS + state.CM * CANNIBAL_RAID.CM_SILVER_LOSS,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * CANNIBAL_RAID.FOOD_LOSS_RANDOM_MULTIPLIER) * CANNIBAL_RAID.FOOD_LOSS_MULTIPLIER + CANNIBAL_RAID.BASE_FOOD_LOSS + state.CM * CANNIBAL_RAID.CM_FOOD_LOSS,
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
            CANNIBAL_RAID.HIDE_BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.HIDE_TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: CANNIBAL_RAID.HIDE_SUCCESS_CHANCE_PER_LUCK }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            CANNIBAL_RAID.HIDE_BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.HIDE_TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: CANNIBAL_RAID.HIDE_SUCCESS_CHANCE_PER_LUCK }
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
                CANNIBAL_RAID.HIDE_MIN_CASUALTY_CHANCE,
                CANNIBAL_RAID.HIDE_BASE_CASUALTY_CHANCE - luck * CANNIBAL_RAID.HIDE_CASUALTY_REDUCTION_PER_LUCK
              ) - traps * CANNIBAL_RAID.HIDE_TRAP_CASUALTY_REDUCTION + state.CM * CANNIBAL_RAID.HIDE_CM_CASUALTY_INCREASE;

            const maxPotentialCasualties = Math.min(
              CANNIBAL_RAID.HIDE_BASE_MAX_CASUALTIES +
                Math.floor(state.buildings.woodenHut * CANNIBAL_RAID.HIDE_CASUALTIES_PER_HUT) -
                traps * CANNIBAL_RAID.HIDE_TRAP_CASUALTIES_REDUCTION +
                state.CM * CANNIBAL_RAID.HIDE_CM_CASUALTIES_INCREASE,
              state.current_population,
            );

            for (let i = 0; i < maxPotentialCasualties; i++) {
              if (Math.random() < casualtyChance) {
                totalLost++;
              }
            }

            silverLoss = Math.min(
              state.resources.silver,
              Math.floor(Math.random() * CANNIBAL_RAID.HIDE_SILVER_LOSS_RANDOM_MULTIPLIER) * CANNIBAL_RAID.HIDE_SILVER_LOSS_MULTIPLIER + CANNIBAL_RAID.HIDE_BASE_SILVER_LOSS + state.CM * CANNIBAL_RAID.HIDE_CM_SILVER_LOSS,
            );
            foodLoss = Math.min(
              state.resources.food,
              Math.floor(Math.random() * CANNIBAL_RAID.HIDE_FOOD_LOSS_RANDOM_MULTIPLIER) * CANNIBAL_RAID.HIDE_FOOD_LOSS_MULTIPLIER + CANNIBAL_RAID.HIDE_BASE_FOOD_LOSS + state.CM * CANNIBAL_RAID.HIDE_CM_FOOD_LOSS,
            );

            deathResult = killVillagers(state, totalLost);
          }

          const actualLost = deathResult.villagersKilled || 0;

          let message =
            "The villagers hide in terror as the cannibals search the village. ";

          if (actualLost === 0) {
            message +=
              "By dawn, the cannibals have left without finding anyone.";
          } else if (actualLost === 1) {
            message += "One villager gets abducted.";
          } else {
            message += `${actualLost} villagers are killed or abducted.`;
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
            BONE_ARMY.BASE_VICTORY_CHANCE + traps * BONE_ARMY.TRAP_VICTORY_BONUS,
            { type: "strength", multiplier: BONE_ARMY.VICTORY_CHANCE_PER_STRENGTH }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            BONE_ARMY.BASE_VICTORY_CHANCE + traps * BONE_ARMY.TRAP_VICTORY_BONUS,
            { type: "strength", multiplier: BONE_ARMY.VICTORY_CHANCE_PER_STRENGTH }
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
              BONE_ARMY.MIN_CASUALTY_CHANCE,
              BONE_ARMY.BASE_CASUALTY_CHANCE - strength * BONE_ARMY.CASUALTY_REDUCTION_PER_STRENGTH
            ) -
            traps * BONE_ARMY.TRAP_CASUALTY_REDUCTION +
            state.CM * BONE_ARMY.CM_CASUALTY_INCREASE;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * BONE_ARMY.FOOD_LOSS_RANDOM_MULTIPLIER)) * BONE_ARMY.FOOD_LOSS_PER_HUT +
              BONE_ARMY.BASE_FOOD_LOSS +
              state.CM * BONE_ARMY.CM_FOOD_LOSS,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            BONE_ARMY.BASE_MAX_DEATHS + state.buildings.woodenHut * BONE_ARMY.DEATHS_PER_HUT + state.CM * BONE_ARMY.CM_DEATHS_INCREASE - traps * BONE_ARMY.TRAP_DEATHS_REDUCTION,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Huts can only be destroyed in Cruel Mode
          if (state.CM === 1 && villagerDeaths >= BONE_ARMY.HUT_DESTRUCTION_THRESHOLD && state.buildings.woodenHut > 0) {
            if (Math.random() < BONE_ARMY.HUT_DESTRUCTION_BASE_CHANCE_CM + state.CM * BONE_ARMY.HUT_DESTRUCTION_CM_INCREASE - traps * BONE_ARMY.TRAP_HUT_DESTRUCTION_REDUCTION) {
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
            BONE_ARMY.HIDE_BASE_SUCCESS_CHANCE + traps * BONE_ARMY.HIDE_TRAP_SUCCESS_BONUS,
            { type: "luck", multiplier: BONE_ARMY.HIDE_SUCCESS_CHANCE_PER_LUCK }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            BONE_ARMY.HIDE_BASE_SUCCESS_CHANCE + traps * BONE_ARMY.HIDE_TRAP_SUCCESS_BONUS,
            { type: "luck", multiplier: BONE_ARMY.HIDE_SUCCESS_CHANCE_PER_LUCK }
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
                BONE_ARMY.HIDE_MIN_CASUALTY_CHANCE,
                BONE_ARMY.HIDE_BASE_CASUALTY_CHANCE - luck * BONE_ARMY.HIDE_CASUALTY_REDUCTION_PER_LUCK
              ) - traps * BONE_ARMY.HIDE_TRAP_CASUALTY_REDUCTION + state.CM * BONE_ARMY.HIDE_CM_CASUALTY_INCREASE;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * BONE_ARMY.HIDE_FOOD_LOSS_RANDOM_MULTIPLIER)) * BONE_ARMY.HIDE_FOOD_LOSS_PER_HUT +
                BONE_ARMY.HIDE_BASE_FOOD_LOSS +
                state.CM * BONE_ARMY.HIDE_CM_FOOD_LOSS,
            );

            const maxPotentialDeaths = Math.min(
              BONE_ARMY.HIDE_BASE_MAX_DEATHS + state.buildings.woodenHut * BONE_ARMY.HIDE_DEATHS_PER_HUT - traps * BONE_ARMY.HIDE_TRAP_DEATHS_REDUCTION + state.CM * BONE_ARMY.HIDE_CM_DEATHS_INCREASE,
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
};
