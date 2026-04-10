import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalLuck } from "./effectsCalculation";
import { CRUEL_MODE, cruelModeScale } from "../cruelMode";
import { getCurrentPopulation, getVillagersInVillage } from "../population";

export const villageAttackEvents: Record<string, GameEvent> = {
  boneArmyAttack: {
    id: "boneArmyAttack",
    condition: (state: GameState) =>
      state.boneDevourerState.lastAcceptedLevel >= 6 &&
      !state.clothing.devourer_crown &&
      !state.relics.bone_devourer_blood &&
      getCurrentPopulation(state) > 10,
    timeProbability: 15,
    title: "The Bone Army",
    message:
      "The earth trembles as skeletal creatures emerge from the forest. The Bone Devourer has used the bones you traded to forge an unholy legion. With hollow eyes and sharpened bone weapons, they approach the city.",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "defendAgainstBoneArmy",
        label: "Defend village",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(state, 0.0 + traps * 0.1, {
            type: "strength",
            multiplier: 0.0075,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          // Check for victory: 12% base chance + 1% per strength point
          // Traps increase victory chance by 10%
          const victoryChance = calculateSuccessChance(
            state,
            0.0 + traps * 0.1,
            { type: "strength", multiplier: 0.075 },
          );

          if (Math.random() < victoryChance) {
            // Victory! Get Devourer Blood and Devourer Crown
            return {
              clothing: {
                ...state.clothing,
                devourer_crown: true,
              },
              relics: {
                ...state.relics,
                bone_devourer_blood: true,
              },
              resources: {
                ...state.resources,
                bones: state.resources.bones + 5000,
                silver: state.resources.silver + 500,
              },
              _logMessage:
                "The villagers defeat the bone army! Bone and silence litter the battlefield. You tear the Devourer’s Crown from its remains and drain a vial of its pale, viscous blood.",
            };
          }

          // Base chance of casualties (75%), reduced by 2% per strength point, minimum 25%
          // Traps reduce death chance by 10%
          const casualtyChance =
            Math.max(0.25, 0.75 - strength * 0.005) -
            traps * 0.1 +
            cruelModeScale(state) * CRUEL_MODE.villageAttacks.boneArmy.defendCasualtyWhenCruel;

          let villagerDeaths = 0;
          const ba = CRUEL_MODE.villageAttacks.boneArmy.defeatSteelLoss;
          let steelLoss = Math.min(
            state.resources.steel,
            Math.floor(Math.random() * ba.randMax) * ba.step + ba.base + cruelModeScale(state) * ba.whenCruel,
          );
          let hutDestroyed = false;

          // Determine villager casualties
          // Traps reduce max deaths by 3
          const mdd = CRUEL_MODE.villageAttacks.boneArmy.maxDeathsDefend;
          const maxPotentialDeaths = Math.min(
            Math.floor(Math.random() * mdd.randMax) + mdd.base + cruelModeScale(state) * mdd.whenCruel,
            getVillagersInVillage(state),
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // If 3+ villagers die and there's a hut
          if (villagerDeaths >= 3 && state.buildings.woodenHut > 0) {
            const hdc = CRUEL_MODE.villageAttacks.boneArmy.hutDestroyChance;
            if (Math.random() < cruelModeScale(state) * hdc.whenCruel - traps * hdc.trapPenalty) {
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          // Construct result message
          let message =
            "The villagers fight desperately against the bone army. ";

          if (actualDeaths === 0) {
            message += "The villagers survive the onslaught.";
          } else if (actualDeaths === 1) {
            message += "One villager falls to the skeletal warriors.";
          } else {
            message += "Several villagers fall to the skeletal warriors.";
          }

          if (steelLoss > 0) {
            message += " The bone army ransacks the stores before leaving.";
          }

          if (hutDestroyed) {
            message +=
              " The skeletal creatures tear apart one of the huts, reducing it to rubble.";
          }

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              steel: Math.max(0, state.resources.steel - steelLoss),
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
          return calculateSuccessChance(state, 0.0 + traps * 0.1, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            0.0 + traps * 0.1,
            { type: "luck", multiplier: 0.01 },
          );

          let villagerDeaths = 0;
          let steelLoss = 0;
          let ironLoss = 0;
          let deathResult: ReturnType<typeof killVillagers> = { villagersKilled: 0 };

          if (Math.random() < success_chance) {
            // Success - bone army passes without finding anyone
            return {
              _logMessage:
                "The villagers hide in terror as the bone army searches the village. The skeletal creatures eventually march away, their purpose unfulfilled.",
            };
          } else {
            const luck = getTotalLuck(state);
            const casualtyChance =
              Math.max(0.15, 0.4 - luck * 0.02) -
              traps * 0.05 +
              cruelModeScale(state) * CRUEL_MODE.villageAttacks.boneArmyHide.casualtyWhenCruel;

            const bh = CRUEL_MODE.villageAttacks.boneArmyHide;
            steelLoss = Math.min(
              state.resources.steel,
              Math.floor(Math.random() * bh.steelLoss.randMax) * bh.steelLoss.step +
              bh.steelLoss.base +
              cruelModeScale(state) * bh.steelLoss.whenCruel,
            );
            ironLoss = Math.min(
              state.resources.iron,
              Math.floor(Math.random() * bh.ironLoss.randMax) * bh.ironLoss.step +
              bh.ironLoss.base +
              cruelModeScale(state) * bh.ironLoss.whenCruel,
            );

            // Determine villager casualties
            const maxPotentialDeaths = Math.min(
              Math.floor(Math.random() * bh.maxDeaths.randMax) +
              bh.maxDeaths.base +
              cruelModeScale(state) * bh.maxDeaths.whenCruel,
              getVillagersInVillage(state),
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
            message += "One villager who tried to flee is killed.";
          } else {
            message += "The villagers who tried to flee are killed by the bone creatures.";
          }

          if (steelLoss > 0 || ironLoss > 0) {
            message += " The army ransacks your supplies before disappearing into the dark.";
          }

          return {
            ...deathResult,
            resources: {
              ...state.resources,
              steel: Math.max(0, state.resources.steel - steelLoss),
              iron: Math.max(0, state.resources.iron - ironLoss),
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
      getCurrentPopulation(state) > 10,
    timeProbability: 40,
    title: "Wolf Attack",
    message:
      "Close to midnight, wolves emerge from the darkness, their eyes glowing with unnatural hunger. Their howls echo filled with malice as they circle the village.",
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

          return calculateSuccessChance(state, 0.15 + traps * 0.1, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          let victoryChance;
          if (!state.story.seen.firstWolfAttack) {
            victoryChance = 0;
          } else {
            // Check for victory: 15% base chance + 1% per strength point
            // Traps increase victory chance by 10%
            victoryChance = calculateSuccessChance(state, 0.15 + traps * 0.1, {
              type: "strength",
              multiplier: 0.01,
            });
          }

          if (Math.random() < victoryChance) {
            // Victory! Get Alpha's Hide
            return {
              clothing: {
                ...state.clothing,
                alphas_hide: true,
              },
              resources: {
                ...state.resources,
                fur: state.resources.fur + 500,
                silver: state.resources.silver + 250,
              },
              _logMessage:
                "The villagers defeat the wolf pack! You slay the alpha wolf and claim its hide as a trophy. It radiates with primal power.",
            };
          }

          // Base chance of casualties (70%), reduced by 2% per strength point, minimum 20%
          // Traps reduce death chance by 10%
          const casualtyChance =
            Math.max(0.2, 0.6 - strength * 0.02) -
            traps * 0.1 +
            cruelModeScale(state) * CRUEL_MODE.villageAttacks.wolf.defendCasualtyWhenCruel;

          let villagerDeaths = 0;
          let foodLoss = Math.min(
            state.resources.food,
            (state.buildings.woodenHut + Math.floor(Math.random() * 8)) * 25 +
            25 +
            cruelModeScale(state) * CRUEL_MODE.villageAttacks.wolf.foodLossTail.whenCruel,
          );
          let hutDestroyed = false;

          // Determine villager casualties
          // Traps reduce max deaths by 3
          const wmd = CRUEL_MODE.villageAttacks.wolf.maxDeathsDefend;
          const maxPotentialDeaths = Math.min(
            wmd.base +
            state.buildings.woodenHut * wmd.perHut +
            cruelModeScale(state) * wmd.whenCruel -
            traps * wmd.trapMult,
            getVillagersInVillage(state),
          );
          for (let i = 0; i < maxPotentialDeaths; i++) {
            if (Math.random() < casualtyChance) {
              villagerDeaths++;
            }
          }

          // If 2+ villagers die and there's a hut, 25% chance to destroy it
          if (villagerDeaths >= 2 && state.buildings.woodenHut > 0) {
            const wh = CRUEL_MODE.villageAttacks.wolf.hutDestroyChance;
            if (Math.random() < cruelModeScale(state) * wh.whenCruel - traps * wh.trapPenalty) {
              hutDestroyed = true;
            }
          }

          // Apply deaths to villagers
          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          // Construct result message
          let message = "The villagers fight desperately against the wolves. ";

          if (actualDeaths === 0) {
            message += "The villagers survive the attack.";
          } else if (actualDeaths === 1) {
            message += "One villager falls to the wolves' supernatural fury.";
          } else {
            message += "THe villagers fall to the wolves' supernatural fury.";
          }

          if (foodLoss > 0) {
            message += " In the chaos, the wolves ravage your stores.";
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
          const traps = state.buildings.traps * 0.1;
          return calculateSuccessChance(state, 0.15 + traps * 0.1, {
            type: "luck",
            multiplier: 0.02,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps * 0.1;
          const success_chance = calculateSuccessChance(
            state,
            0.15 + traps * 0.1,
            { type: "luck", multiplier: 0.02 },
          );

          let villagerDeaths = 0;
          let foodLoss = 0;
          let deathResult: ReturnType<typeof killVillagers> = { villagersKilled: 0 };

          if (Math.random() < success_chance) {
            // Success - wolves leave without causing damage
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
              Math.max(0.1, 0.35 - luck * 0.02) -
              traps * 0.05 +
              cruelModeScale(state) * CRUEL_MODE.villageAttacks.wolfHide.casualtyWhenCruel;

            foodLoss = Math.min(
              state.resources.food,
              (state.buildings.woodenHut + Math.floor(Math.random() * 16)) *
              25 +
              25 +
              cruelModeScale(state) * CRUEL_MODE.villageAttacks.wolfHide.foodLossTail.whenCruel,
            );

            // Determine villager casualties
            const whd = CRUEL_MODE.villageAttacks.wolfHide.maxDeaths;
            const maxPotentialDeaths = Math.min(
              whd.base +
              state.buildings.woodenHut * whd.perHutHalf -
              traps * whd.trapMult +
              cruelModeScale(state) * whd.whenCruel,
              getVillagersInVillage(state),
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
            "The villagers huddle in their huts as the wolves prowl outside. ";

          if (actualDeaths === 0) {
            message +=
              "By dawn, the wolves have departed, leaving only scratches and terror behind.";
          } else if (actualDeaths === 1) {
            message +=
              "One villager who ventured out is found torn apart at sunrise.";
          } else {
            message +=
              "Several villagers are dragged from their huts, their screams echoing through the night.";
          }

          if (foodLoss > 0) {
            message += " The wolves ransack your supplies before vanishing at dawn.";
          }

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
      getCurrentPopulation(state) > 10 &&
      !state.story.seen.cannibalRaidVictory,

    timeProbability: 40,
    title: "Cannibal Raid",
    message:
      "War drums echo through the night as tribe of cannibals emerges from the wilderness. They advance on the village with crude weapons and terrible intent.",
    priority: 4,
    repeatable: true,
    choices: [
      {
        id: "fightCannibals",
        label: "Defend village",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          const traps = state.buildings.traps;
          return calculateSuccessChance(state, 0.1 + traps * 0.1, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const strength = getTotalStrength(state);

          // Check for victory: 10% base chance + 1% per strength point
          const victoryChance = calculateSuccessChance(
            state,
            0.1 + traps * 0.1,
            { type: "strength", multiplier: 0.01 },
          );

          if (Math.random() < victoryChance) {
            // Victory - minimal losses
            const vm = CRUEL_MODE.villageAttacks.cannibal.victoryMinimalDeaths;
            const minimalDeaths = Math.min(
              Math.floor(Math.random() * vm.randMax) + cruelModeScale(state) * vm.whenCruel,
              getVillagersInVillage(state),
            );
            const deathResult = killVillagers(state, minimalDeaths);
            const actualDeaths = deathResult.villagersKilled || 0;

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
                actualDeaths === 1
                  ? "The villagers drive back the cannibals! One villager falls in the battle, but the tribe retreats in defeat. Among the bodies, you find a primitive necklace made of human bones."
                  : "The villagers fight valiantly and repel the cannibals! Multiple illagers fall in the battle, but the tribe is forced to retreat. Among the bodies, you find a primitive necklace made of human bones.",
            };
          }

          // Defeat - casualties and resource loss
          // Base 50% casualty chance, reduced by 2% per strength point, minimum 15%
          const casualtyChance =
            Math.max(0.15, 0.5 - strength * 0.01) -
            traps * 0.1 +
            cruelModeScale(state) * CRUEL_MODE.villageAttacks.cannibal.defeatCasualtyWhenCruel;

          let totalLost = 0;

          // Determine casualties
          const cmd = CRUEL_MODE.villageAttacks.cannibal.maxCasualtiesDefeat;
          const maxPotentialCasualties = Math.min(
            cmd.base +
            state.buildings.woodenHut * cmd.perHut -
            traps * cmd.trapMult +
            cruelModeScale(state) * cmd.whenCruel,
            getVillagersInVillage(state),
          );

          for (let i = 0; i < maxPotentialCasualties; i++) {
            if (Math.random() < casualtyChance) {
              totalLost++;
            }
          }

          // Calculate resource losses
          const cl = CRUEL_MODE.villageAttacks.cannibal;
          const silverLoss = Math.min(
            state.resources.silver,
            Math.floor(Math.random() * cl.silverLoss.randMax) * cl.silverLoss.step +
            cl.silverLoss.base +
            cruelModeScale(state) * cl.silverLoss.whenCruel,
          );
          const foodLoss = Math.min(
            state.resources.food,
            Math.floor(Math.random() * cl.foodLoss.randMax) * cl.foodLoss.step +
            cl.foodLoss.base +
            cruelModeScale(state) * cl.foodLoss.whenCruel,
          );

          // Apply deaths to villagers
          const deathResult = killVillagers(state, totalLost);
          const actualLost = deathResult.villagersKilled || 0;

          // Construct result message
          let message = "The cannibals overwhelm your defenses. ";

          if (actualLost === 0) {
            message += "The villagers manage to survive, though barely.";
          } else if (actualLost === 1) {
            message += "One villager is abducted by the cannibals.";
          } else {
            message += "Several villagers are killed or abducted by the cannibals.";
          }

          if (silverLoss > 0 || foodLoss > 0) {
            message += " The cannibals ransack your stores before retreating to the wilds.";
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
          return calculateSuccessChance(state, 0.05 + traps * 0.1, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const success_chance = calculateSuccessChance(
            state,
            0.05 + traps * 0.1,
            { type: "luck", multiplier: 0.01 },
          );

          let totalLost = 0;
          let silverLoss = 0;
          let foodLoss = 0;
          let deathResult: ReturnType<typeof killVillagers> = { villagersKilled: 0 };

          if (Math.random() < success_chance) {
            // Success - cannibals leave without causing major damage
            return {
              _logMessage:
                "The villagers hide in terror as the cannibals search the village. By dawn, the cannibals have left without finding anyone.",
            };
          } else {
            const luck = getTotalLuck(state);
            // Base 30% casualty chance, reduced by 1% per luck point, minimum 10%
            const casualtyChance =
              Math.max(0.1, 0.3 - luck * 0.01) -
              traps * 0.05 +
              cruelModeScale(state) * CRUEL_MODE.villageAttacks.cannibalHide.casualtyWhenCruel;

            // Fewer potential casualties when hiding
            const ch = CRUEL_MODE.villageAttacks.cannibalHide;
            const maxPotentialCasualties = Math.min(
              ch.maxCasualties.base +
              Math.floor(state.buildings.woodenHut * ch.maxCasualties.perHutHalf) -
              traps * ch.maxCasualties.trapMult +
              cruelModeScale(state) * ch.maxCasualties.whenCruel,
              getVillagersInVillage(state),
            );

            for (let i = 0; i < maxPotentialCasualties; i++) {
              if (Math.random() < casualtyChance) {
                totalLost++;
              }
            }

            // Higher resource losses when not defending
            silverLoss = Math.min(
              state.resources.silver,
              Math.floor(Math.random() * ch.silverLoss.randMax) * ch.silverLoss.step +
              ch.silverLoss.base +
              cruelModeScale(state) * ch.silverLoss.whenCruel,
            );
            foodLoss = Math.min(
              state.resources.food,
              Math.floor(Math.random() * ch.foodLoss.randMax) * ch.foodLoss.step +
              ch.foodLoss.base +
              cruelModeScale(state) * ch.foodLoss.whenCruel,
            );

            // Apply deaths to villagers
            deathResult = killVillagers(state, totalLost);
          }

          // Construct result message
          let message =
            "The villagers hide in terror as the cannibals search the village. ";

          if (totalLost === 0) {
            message +=
              "By dawn, the cannibals have left without finding anyone.";
          } else if (totalLost === 1) {
            message += "One villager gets abducted.";
          } else {
            message += "Several villagers are killed or abducted.";
          }

          if (silverLoss > 0 || foodLoss > 0) {
            message += " The cannibals plunder your stores freely before slipping away.";
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
    ],
  },
};
