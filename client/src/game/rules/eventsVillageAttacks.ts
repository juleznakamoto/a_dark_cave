
import { GameEvent } from "./events";
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
          let victoryChance;
          const traps = state.buildings.traps * 0.1;
          const strength = getTotalStrength(state);
          if (!state.story.seen.firstWolfAttack) {
            victoryChance = 0;
          } else {
            // Check for victory: 15% base chance + 1% per strength point
            // Traps increase victory chance by 10%
            victoryChance =
              0.15 + strength * 0.01 + traps * 0.1 - state.CM * 0.05;
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
          const victoryChance =
            0.1 + strength * 0.01 + traps * 0.1 - state.CM * 0.05;

          if (Math.random() < victoryChance) {
            // Victory - minimal losses
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * 2) + state.CM * 1,
              state.current_population,
            );
            const deathResult = killVillagers(state, minimalDeaths);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  cannibalRaidVictory: true,
                },
              },
              _logMessage:
                minimalDeaths > 0
                  ? `After a fierce battle, the village drives off the cannibals! ${minimalDeaths} villager${minimalDeaths === 1 ? "" : "s"} fell in the defense, but the threat is ended.`
                  : "After a fierce battle, the village drives off the cannibals! No villagers were lost in the defense.",
            };
          }

          // Defeat - heavy casualties
          const baseDeaths = Math.floor(state.current_population * 0.3);
          const actualDeaths = Math.min(
            baseDeaths + Math.floor(Math.random() * 5) + state.CM * 2,
            state.current_population,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(state.resources.food * 0.5) + state.CM * 150,
          );
          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(state.resources.silver * 0.3) + state.CM * 50,
          );

          const deathResult = killVillagers(state, actualDeaths);

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              silver: Math.max(0, state.resources.silver - silverLoss),
              food: Math.max(0, state.resources.food - foodLoss),
            },
            _logMessage: `The cannibals overwhelm the village defenses. ${actualDeaths} villagers are killed or taken. The raiders make off with ${foodLoss} food and ${silverLoss} silver.`,
          };
        },
      },
    ],
  },
};
