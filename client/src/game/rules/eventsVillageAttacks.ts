
import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";

// ============================================================================
// WOLF ATTACK EVENT PARAMETERS
// ============================================================================
const WOLF_ATTACK = {
  DEFEND: {
    BASE_SUCCESS_CHANCE: 0.15,
    TRAP_SUCCESS_BONUS: 0.1,
    STRENGTH_MULTIPLIER: 0.01,
    BASE_CASUALTY_CHANCE: 0.6,
    MIN_CASUALTY_CHANCE: 0.2,
    STRENGTH_CASUALTY_REDUCTION: 0.02,
    TRAP_CASUALTY_REDUCTION: 0.1,
    CM_CASUALTY_INCREASE: 0.05,
    BASE_MAX_DEATHS: 4,
    TRAP_DEATH_REDUCTION: 3,
    CM_DEATH_INCREASE: 2,
    BASE_FOOD_LOSS: 25,
    RANDOM_FOOD_MULTIPLIER: 8,
    CM_FOOD_INCREASE: 100,
    HUT_DESTRUCTION_THRESHOLD: 2,
    HUT_DESTRUCTION_CHANCE_CM: 0.25,
    TRAP_HUT_DESTRUCTION_REDUCTION: 0.05,
  },
  HIDE: {
    BASE_SUCCESS_CHANCE: 0.15,
    TRAP_SUCCESS_BONUS: 0.1,
    LUCK_MULTIPLIER: 0.02,
    BASE_CASUALTY_CHANCE: 0.35,
    MIN_CASUALTY_CHANCE: 0.1,
    LUCK_CASUALTY_REDUCTION: 0.02,
    TRAP_CASUALTY_REDUCTION: 0.05,
    CM_CASUALTY_INCREASE: 0.05,
    BASE_MAX_DEATHS: 2,
    TRAP_DEATH_REDUCTION: 1,
    CM_DEATH_INCREASE: 2,
    BASE_FOOD_LOSS: 25,
    RANDOM_FOOD_MULTIPLIER: 16,
    CM_FOOD_MULTIPLIER: 2,
  },
};

// ============================================================================
// CANNIBAL RAID EVENT PARAMETERS
// ============================================================================
const CANNIBAL_RAID = {
  DEFEND: {
    BASE_SUCCESS_CHANCE: 0.1,
    TRAP_SUCCESS_BONUS: 0.1,
    STRENGTH_MULTIPLIER: 0.01,
    BASE_CASUALTY_CHANCE: 0.5,
    MIN_CASUALTY_CHANCE: 0.15,
    STRENGTH_CASUALTY_REDUCTION: 0.01,
    TRAP_CASUALTY_REDUCTION: 0.1,
    CM_CASUALTY_INCREASE: 0.1,
    BASE_MAX_DEATHS: 4,
    TRAP_DEATH_REDUCTION: 3,
    CM_DEATH_INCREASE: 2,
    VICTORY_MIN_DEATHS: 0,
    VICTORY_MAX_DEATHS_RANDOM: 2,
    CM_VICTORY_DEATHS: 1,
    SILVER_LOSS_BASE: 25,
    SILVER_LOSS_RANDOM: 4,
    SILVER_LOSS_MULTIPLIER: 25,
    CM_SILVER_LOSS: 100,
    FOOD_LOSS_BASE: 50,
    FOOD_LOSS_RANDOM: 6,
    FOOD_LOSS_MULTIPLIER: 50,
    CM_FOOD_LOSS: 250,
    VICTORY_SILVER_REWARD: 500,
  },
  HIDE: {
    BASE_SUCCESS_CHANCE: 0.05,
    TRAP_SUCCESS_BONUS: 0.1,
    LUCK_MULTIPLIER: 0.01,
    BASE_CASUALTY_CHANCE: 0.3,
    MIN_CASUALTY_CHANCE: 0.1,
    LUCK_CASUALTY_REDUCTION: 0.01,
    TRAP_CASUALTY_REDUCTION: 0.05,
    CM_CASUALTY_INCREASE: 0.05,
    BASE_MAX_DEATHS: 4,
    TRAP_DEATH_REDUCTION: 2,
    CM_DEATH_INCREASE: 2,
    SILVER_LOSS_BASE: 50,
    SILVER_LOSS_RANDOM: 4,
    SILVER_LOSS_MULTIPLIER: 50,
    CM_SILVER_LOSS: 200,
    FOOD_LOSS_BASE: 100,
    FOOD_LOSS_RANDOM: 6,
    FOOD_LOSS_MULTIPLIER: 100,
    CM_FOOD_LOSS: 500,
  },
};

// ============================================================================
// BONE ARMY EVENT PARAMETERS
// ============================================================================
const BONE_ARMY = {
  DEFEND: {
    BASE_SUCCESS_CHANCE: 0.0,
    TRAP_SUCCESS_BONUS: 0.1,
    STRENGTH_MULTIPLIER: 0.075,
    BASE_CASUALTY_CHANCE: 0.75,
    MIN_CASUALTY_CHANCE: 0.25,
    STRENGTH_CASUALTY_REDUCTION: 0.02,
    TRAP_CASUALTY_REDUCTION: 0.1,
    CM_CASUALTY_INCREASE: 0.05,
    BASE_MAX_DEATHS: 5,
    TRAP_DEATH_REDUCTION: 3,
    CM_DEATH_INCREASE: 2,
    BASE_FOOD_LOSS: 50,
    RANDOM_FOOD_MULTIPLIER: 10,
    FOOD_LOSS_MULTIPLIER: 30,
    CM_FOOD_LOSS: 150,
    HUT_DESTRUCTION_THRESHOLD: 3,
    HUT_DESTRUCTION_CHANCE_CM: 0.45,
    TRAP_HUT_DESTRUCTION_REDUCTION: 0.05,
  },
  HIDE: {
    BASE_SUCCESS_CHANCE: 0.1,
    TRAP_SUCCESS_BONUS: 0.1,
    LUCK_MULTIPLIER: 0.01,
    BASE_CASUALTY_CHANCE: 0.4,
    MIN_CASUALTY_CHANCE: 0.15,
    LUCK_CASUALTY_REDUCTION: 0.02,
    TRAP_CASUALTY_REDUCTION: 0.05,
    CM_CASUALTY_INCREASE: 0.05,
    BASE_MAX_DEATHS: 3,
    TRAP_DEATH_REDUCTION: 1,
    CM_DEATH_INCREASE: 2,
    BASE_FOOD_LOSS: 50,
    RANDOM_FOOD_MULTIPLIER: 20,
    FOOD_LOSS_MULTIPLIER: 40,
    CM_FOOD_MULTIPLIER: 3,
  },
};

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
            WOLF_ATTACK.DEFEND.BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.DEFEND.TRAP_SUCCESS_BONUS,
            { type: 'strength', multiplier: WOLF_ATTACK.DEFEND.STRENGTH_MULTIPLIER }
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
              WOLF_ATTACK.DEFEND.BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.DEFEND.TRAP_SUCCESS_BONUS,
              { type: 'strength', multiplier: WOLF_ATTACK.DEFEND.STRENGTH_MULTIPLIER }
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
              WOLF_ATTACK.DEFEND.MIN_CASUALTY_CHANCE,
              WOLF_ATTACK.DEFEND.BASE_CASUALTY_CHANCE - strength * WOLF_ATTACK.DEFEND.STRENGTH_CASUALTY_REDUCTION
            ) -
            traps * WOLF_ATTACK.DEFEND.TRAP_CASUALTY_REDUCTION +
            state.CM * WOLF_ATTACK.DEFEND.CM_CASUALTY_INCREASE;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * WOLF_ATTACK.DEFEND.RANDOM_FOOD_MULTIPLIER)) * WOLF_ATTACK.DEFEND.BASE_FOOD_LOSS +
              WOLF_ATTACK.DEFEND.BASE_FOOD_LOSS +
              state.CM * WOLF_ATTACK.DEFEND.CM_FOOD_INCREASE,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            WOLF_ATTACK.DEFEND.BASE_MAX_DEATHS + state.buildings.woodenHut + state.CM * WOLF_ATTACK.DEFEND.CM_DEATH_INCREASE - traps * WOLF_ATTACK.DEFEND.TRAP_DEATH_REDUCTION,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          if (villagerDeaths >= WOLF_ATTACK.DEFEND.HUT_DESTRUCTION_THRESHOLD && state.buildings.woodenHut > 0 && state.CM === 1) {
            if (Math.random() < WOLF_ATTACK.DEFEND.HUT_DESTRUCTION_CHANCE_CM - traps * WOLF_ATTACK.DEFEND.TRAP_HUT_DESTRUCTION_REDUCTION) {
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
            WOLF_ATTACK.HIDE.BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.HIDE.TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: WOLF_ATTACK.HIDE.LUCK_MULTIPLIER }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            WOLF_ATTACK.HIDE.BASE_SUCCESS_CHANCE + traps * WOLF_ATTACK.HIDE.TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: WOLF_ATTACK.HIDE.LUCK_MULTIPLIER }
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
                WOLF_ATTACK.HIDE.MIN_CASUALTY_CHANCE,
                WOLF_ATTACK.HIDE.BASE_CASUALTY_CHANCE - luck * WOLF_ATTACK.HIDE.LUCK_CASUALTY_REDUCTION
              ) - traps * WOLF_ATTACK.HIDE.TRAP_CASUALTY_REDUCTION + state.CM * WOLF_ATTACK.HIDE.CM_CASUALTY_INCREASE;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * WOLF_ATTACK.HIDE.RANDOM_FOOD_MULTIPLIER)) * WOLF_ATTACK.HIDE.BASE_FOOD_LOSS +
                WOLF_ATTACK.HIDE.BASE_FOOD_LOSS +
                state.CM * WOLF_ATTACK.HIDE.CM_FOOD_MULTIPLIER,
            );

            const maxPotentialDeaths = Math.min(
              WOLF_ATTACK.HIDE.BASE_MAX_DEATHS + state.buildings.woodenHut / 2 - traps * WOLF_ATTACK.HIDE.TRAP_DEATH_REDUCTION + state.CM * WOLF_ATTACK.HIDE.CM_DEATH_INCREASE,
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
            CANNIBAL_RAID.DEFEND.BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.DEFEND.TRAP_SUCCESS_BONUS,
            { type: 'strength', multiplier: CANNIBAL_RAID.DEFEND.STRENGTH_MULTIPLIER }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            CANNIBAL_RAID.DEFEND.BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.DEFEND.TRAP_SUCCESS_BONUS,
            { type: 'strength', multiplier: CANNIBAL_RAID.DEFEND.STRENGTH_MULTIPLIER }
          );

          if (Math.random() < victoryChance) {
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * CANNIBAL_RAID.DEFEND.VICTORY_MAX_DEATHS_RANDOM) + state.CM * CANNIBAL_RAID.DEFEND.CM_VICTORY_DEATHS,
              state.current_population,
            );
            const deathResult = killVillagers(state, minimalDeaths);
            const actualDeaths = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              resources: {
                ...state.resources,
                silver: state.resources.silver + CANNIBAL_RAID.DEFEND.VICTORY_SILVER_REWARD,
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
                  ? `The villagers drive back the cannibals! One villager falls in the battle, but the tribe retreats in defeat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID.DEFEND.VICTORY_SILVER_REWARD} silver.`
                  : `The villagers fight valiantly and repel the cannibals! ${actualDeaths} villagers fall in the battle, but the tribe is forced to retreat. Among the bodies, you find a primitive necklace made of human bones and ${CANNIBAL_RAID.DEFEND.VICTORY_SILVER_REWARD} silver.`,
            };
          }

          const casualtyChance =
            Math.max(
              CANNIBAL_RAID.DEFEND.MIN_CASUALTY_CHANCE,
              CANNIBAL_RAID.DEFEND.BASE_CASUALTY_CHANCE - strength * CANNIBAL_RAID.DEFEND.STRENGTH_CASUALTY_REDUCTION
            ) -
            traps * CANNIBAL_RAID.DEFEND.TRAP_CASUALTY_REDUCTION +
            state.CM * CANNIBAL_RAID.DEFEND.CM_CASUALTY_INCREASE;

          let totalLost = 0;

          const maxPotentialCasualties = Math.min(
            CANNIBAL_RAID.DEFEND.BASE_MAX_DEATHS + state.buildings.woodenHut - traps * CANNIBAL_RAID.DEFEND.TRAP_DEATH_REDUCTION + state.CM * CANNIBAL_RAID.DEFEND.CM_DEATH_INCREASE,
            state.current_population,
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * CANNIBAL_RAID.DEFEND.SILVER_LOSS_RANDOM) * CANNIBAL_RAID.DEFEND.SILVER_LOSS_MULTIPLIER + CANNIBAL_RAID.DEFEND.SILVER_LOSS_BASE + state.CM * CANNIBAL_RAID.DEFEND.CM_SILVER_LOSS,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * CANNIBAL_RAID.DEFEND.FOOD_LOSS_RANDOM) * CANNIBAL_RAID.DEFEND.FOOD_LOSS_MULTIPLIER + CANNIBAL_RAID.DEFEND.FOOD_LOSS_BASE + state.CM * CANNIBAL_RAID.DEFEND.CM_FOOD_LOSS,
          );

          const deathResult = killVillagers(state, totalLost);
          const actualLost = deathResult.villagersKilled || 0;

          let message = "The cannibals overwhelm your defenses. ";

          if (actualLost === 0) {
            message += "The villagers manage to survive, though barely.";
          } else if (actualLost === 1) {
            message += "One villager is killed by the cannibals.";
          } else {
            message += `${actualLost} villagers are killed by the cannibals.`;
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
            CANNIBAL_RAID.HIDE.BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.HIDE.TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: CANNIBAL_RAID.HIDE.LUCK_MULTIPLIER }
          );
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            CANNIBAL_RAID.HIDE.BASE_SUCCESS_CHANCE + traps * CANNIBAL_RAID.HIDE.TRAP_SUCCESS_BONUS,
            { type: 'luck', multiplier: CANNIBAL_RAID.HIDE.LUCK_MULTIPLIER }
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
                CANNIBAL_RAID.HIDE.MIN_CASUALTY_CHANCE,
                CANNIBAL_RAID.HIDE.BASE_CASUALTY_CHANCE - luck * CANNIBAL_RAID.HIDE.LUCK_CASUALTY_REDUCTION
              ) - traps * CANNIBAL_RAID.HIDE.TRAP_CASUALTY_REDUCTION + state.CM * CANNIBAL_RAID.HIDE.CM_CASUALTY_INCREASE;

            const maxPotentialCasualties = Math.min(
              CANNIBAL_RAID.HIDE.BASE_MAX_DEATHS +
                Math.floor(state.buildings.woodenHut / 2) -
                traps * CANNIBAL_RAID.HIDE.TRAP_DEATH_REDUCTION +
                state.CM * CANNIBAL_RAID.HIDE.CM_DEATH_INCREASE,
              state.current_population,
            );

            for (let i = 0; i < maxPotentialCasualties; i++) {
              if (Math.random() < casualtyChance) {
                totalLost++;
              }
            }

            silverLoss = Math.min(
              state.resources.silver,
              Math.floor(Math.random() * CANNIBAL_RAID.HIDE.SILVER_LOSS_RANDOM) * CANNIBAL_RAID.HIDE.SILVER_LOSS_MULTIPLIER + CANNIBAL_RAID.HIDE.SILVER_LOSS_BASE + state.CM * CANNIBAL_RAID.HIDE.CM_SILVER_LOSS,
            );
            foodLoss = Math.min(
              state.resources.food,
              Math.floor(Math.random() * CANNIBAL_RAID.HIDE.FOOD_LOSS_RANDOM) * CANNIBAL_RAID.HIDE.FOOD_LOSS_MULTIPLIER + CANNIBAL_RAID.HIDE.FOOD_LOSS_BASE + state.CM * CANNIBAL_RAID.HIDE.CM_FOOD_LOSS,
            );

            deathResult = killVillagers(state, totalLost);
          }

          let message =
            "The villagers hide in terror as the cannibals search the village. ";

          if (totalLost === 0) {
            message +=
              "By dawn, the cannibals have left without finding anyone.";
          } else if (totalLost === 1) {
            message += "One villager is killed.";
          } else {
            message += `${totalLost} villagers are killed.`;
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
      "The earth trembles as an army of skeletal creatures appears from the forest. The Bone Devourer has used the bones you traded to build an unholy legion. With hollow eyes and weapons of sharpened bone they approach the city.",
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
          return calculateSuccessChance(state, BONE_ARMY.DEFEND.BASE_SUCCESS_CHANCE + traps * BONE_ARMY.DEFEND.TRAP_SUCCESS_BONUS, {
            type: "strength",
            multiplier: BONE_ARMY.DEFEND.STRENGTH_MULTIPLIER,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          const victoryChance = calculateSuccessChance(
            state,
            BONE_ARMY.DEFEND.BASE_SUCCESS_CHANCE + traps * BONE_ARMY.DEFEND.TRAP_SUCCESS_BONUS,
            { type: "strength", multiplier: BONE_ARMY.DEFEND.STRENGTH_MULTIPLIER },
          );

          if (Math.random() < victoryChance) {
            return {
              clothing: {
                ...state.clothing,
                devourer_crown: true,
              },
              _logMessage:
                "The village defeats the bone army! Bone and silence litter the battlefield. Among the remains, you find the Devourer's Crown.",
            };
          }

          const casualtyChance =
            Math.max(
              BONE_ARMY.DEFEND.MIN_CASUALTY_CHANCE,
              BONE_ARMY.DEFEND.BASE_CASUALTY_CHANCE - strength * BONE_ARMY.DEFEND.STRENGTH_CASUALTY_REDUCTION
            ) -
            traps * BONE_ARMY.DEFEND.TRAP_CASUALTY_REDUCTION +
            state.CM * BONE_ARMY.DEFEND.CM_CASUALTY_INCREASE;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * BONE_ARMY.DEFEND.RANDOM_FOOD_MULTIPLIER)) * BONE_ARMY.DEFEND.FOOD_LOSS_MULTIPLIER +
              BONE_ARMY.DEFEND.BASE_FOOD_LOSS +
              state.CM * BONE_ARMY.DEFEND.CM_FOOD_LOSS,
          );
          let hutDestroyed = false;

          const maxPotentialDeaths = Math.min(
            BONE_ARMY.DEFEND.BASE_MAX_DEATHS + state.buildings.woodenHut + state.CM * BONE_ARMY.DEFEND.CM_DEATH_INCREASE - traps * BONE_ARMY.DEFEND.TRAP_DEATH_REDUCTION,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          if (villagerDeaths >= BONE_ARMY.DEFEND.HUT_DESTRUCTION_THRESHOLD && state.buildings.woodenHut > 0 && state.CM === 1) {
            if (Math.random() < BONE_ARMY.DEFEND.HUT_DESTRUCTION_CHANCE_CM - traps * BONE_ARMY.DEFEND.TRAP_HUT_DESTRUCTION_REDUCTION) {
              hutDestroyed = true;
            }
          }

          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          let message = "The village fights desperately against the bone army. ";

          if (actualDeaths === 0) {
            message += "The villagers survive the onslaught.";
          } else if (actualDeaths === 1) {
            message += "One villager is slain by the skeletal warriors.";
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
          return calculateSuccessChance(state, BONE_ARMY.HIDE.BASE_SUCCESS_CHANCE + traps * BONE_ARMY.HIDE.TRAP_SUCCESS_BONUS, {
            type: "luck",
            multiplier: BONE_ARMY.HIDE.LUCK_MULTIPLIER,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            BONE_ARMY.HIDE.BASE_SUCCESS_CHANCE + traps * BONE_ARMY.HIDE.TRAP_SUCCESS_BONUS,
            { type: "luck", multiplier: BONE_ARMY.HIDE.LUCK_MULTIPLIER },
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
                BONE_ARMY.HIDE.MIN_CASUALTY_CHANCE,
                BONE_ARMY.HIDE.BASE_CASUALTY_CHANCE - luck * BONE_ARMY.HIDE.LUCK_CASUALTY_REDUCTION
              ) - traps * BONE_ARMY.HIDE.TRAP_CASUALTY_REDUCTION + state.CM * BONE_ARMY.HIDE.CM_CASUALTY_INCREASE;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * BONE_ARMY.HIDE.RANDOM_FOOD_MULTIPLIER)) * BONE_ARMY.HIDE.FOOD_LOSS_MULTIPLIER +
                BONE_ARMY.HIDE.BASE_FOOD_LOSS +
                state.CM * BONE_ARMY.HIDE.CM_FOOD_MULTIPLIER,
            );

            const maxPotentialDeaths = Math.min(
              BONE_ARMY.HIDE.BASE_MAX_DEATHS + state.buildings.woodenHut / 2 - traps * BONE_ARMY.HIDE.TRAP_DEATH_REDUCTION + state.CM * BONE_ARMY.HIDE.CM_DEATH_INCREASE,
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
              "One villager who tried to flee is killed by bony hands.";
          } else {
            message += `${actualDeaths} villagers are killed by the bone creatures.`;
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
