import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";

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
      "Close to midnight, wolves emerge from the darkness, their eyes glowing with unnatural hunger. Their howls echo filled with malice as they circle your village.",
    triggered: false,
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendVillage",
        label: "Defend village",
        relevant_stats: ["strength"],
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);
          
          let victoryChance;
          if (!state.story.seen.firstWolfAttack) {
            victoryChance = 0;
          } else {
            // Check for victory: 15% base chance + 1% per strength point
            // Traps increase victory chance by 10%
            victoryChance = calculateSuccessChance(
              state,
              0.15 + traps * 0.1,
              { type: 'strength', multiplier: 0.01 }
            );
          }

          if (Math.random() < victoryChance) {
            // Victory! Get Alpha's Hide
            return {
              clothing: {
                ...state.clothing,
                alphas_hide: true,
              },
              _logMessage:
                "The village defeats the wolf pack! You slay the alpha wolf and claim its hide as a trophy. It radiates with primal power.",
            };
          }

          // Base chance of casualties (70%), reduced by 2% per strength point, minimum 20%
          // Traps reduce death chance by 10%
          const casualtyChance =
            Math.max(0.2, 0.6 - strength * 0.02) -
            traps * 0.1 +
            state.CM * 0.05;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 8)) * 25 +
              25 +
              state.CM * 100,
          );
          let hutDestroyed = false;

          // Determine villager casualties
          // Traps reduce max deaths by 3
          const maxPotentialDeaths = Math.min(
            4 + state.buildings.woodenHut + state.CM * 2 - traps * 3,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // If 2+ villagers die and there's a hut, 25% chance to destroy it
          if (villagerDeaths >= 2 && state.buildings.woodenHut > 0) {
            if (Math.random() < 0.25 - traps * 0.05 + state.CM * 0.1) {
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);

          // Construct result message
          let message = "The village fights desperately against the wolves. ";

          if (villagerDeaths === 0) {
            message += "The villagers survive the attack.";
          } else if (villagerDeaths === 1) {
            message += "One villager falls to the wolves' supernatural fury.";
          } else {
            message += `${villagerDeaths} villagers are claimed by the wolves' unnatural hunger.`;
          }

          if (foodLoss > 0) {
            message += ` The wolves also devour ${foodLoss} units of food from your stores.`;
          }

          if (hutDestroyed) {
            message +=
              " In their rampage, the wolves destroy one of your huts, leaving only splintered wood.";
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
        effect: (state: GameState) => {
          const traps = state.buildings.traps * 0.1;
          const luck = getTotalLuck(state);
          const casualtyChance =
            Math.max(0.1, 0.35 - luck * 0.02) - traps * 0.05 + state.CM * 0.05;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 16)) * 25 +
              25 +
              state.CM * 2,
          );
          let hutDestroyed = false;

          // Determine villager casualties
          const maxPotentialDeaths = Math.min(
            2 + state.buildings.woodenHut / 2 - traps * 1 + state.CM * 2,
            state.current_population,
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);

          // Construct result message
          let message =
            "The villagers huddle in their huts as the wolves prowl outside. ";

          if (villagerDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (villagerDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message += `${villagerDeaths} villagers are dragged from their huts, their screams echoing through the night.`;
          }

          message += ` The wolves ransack your food stores, consuming ${foodLoss} units.`;

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
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          // Check for victory: 10% base chance + 1% per strength point
          const victoryChance = calculateSuccessChance(
            state,
            0.1 + traps * 0.1,
            { type: 'strength', multiplier: 0.01 }
          );

          if (Math.random() < victoryChance) {
            // Victory - minimal losses
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * 2) + state.CM * 1,
              state.current_population,
            );
            const deathResult = killVillagers(state, minimalDeaths);

            return {
              ...deathResult,
              resources: {
                ...state.resources,
                silver: state.resources.silver + 500,
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
                minimalDeaths === 1
                  ? `Your villagers drive back the cannibals! One villager falls in the battle, but the tribe retreats in defeat. Among the bodies, you find a primitive necklace made of human bones and 500 silver.`
                  : `Your villagers fight valiantly and repel the cannibals! ${minimalDeaths} villagers fall in the battle, but the tribe is forced to retreat. Among the bodies, you find a primitive necklace made of human bones and 500 silver.`,
            };
          }

          // Defeat - casualties and resource loss
          // Base 50% casualty chance, reduced by 2% per strength point, minimum 15%
          const casualtyChance =
            Math.max(0.15, 0.5 - strength * 0.01) -
            traps * 0.1 +
            state.CM * 0.1;

          let totalLost = 0;

          // Determine casualties
          const maxPotentialCasualties = Math.min(
            4 + state.buildings.woodenHut - traps * 3 + state.CM * 2,
            state.current_population,
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          // Calculate resource losses
          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * 4) * 25 + 25 + state.CM * 100,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * 6) * 50 + 50 + state.CM * 250,
          );

          // Apply deaths to villagers
          const deathResult = killVillagers(state, totalLost);

          // Construct result message
          let message = "The cannibals overwhelm your defenses. ";

          if (totalLost === 0) {
            message += "Your villagers manage to survive, though barely.";
          } else if (totalLost === 1) {
            message += "One villager is abducted by the cannibals.";
          } else {
            message += `${totalLost} villagers are killed or abducted by the cannibals.`;
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
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const luck = getTotalLuck(state);
          // Base 30% casualty chance, reduced by 1% per luck point, minimum 10%
          const casualtyChance =
            Math.max(0.1, 0.3 - luck * 0.01) - traps * 0.05 + state.CM * 0.05;

          let totalLost = 0;

          // Fewer potential casualties when hiding
          const maxPotentialCasualties = Math.min(
            4 +
              Math.floor(state.buildings.woodenHut / 2) -
              traps * 2 +
              state.CM * 2,
            state.current_population,
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          // Higher resource losses when not defending
          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * 4) * 50 + 50 + state.CM * 200,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * 6) * 100 + 100 + state.CM * 500,
          );

          // Apply deaths to villagers
          const deathResult = killVillagers(state, totalLost);

          // Construct result message
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
