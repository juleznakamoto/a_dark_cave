import { GameEvent, calculateSuccessChance } from "./events";
import { GameState } from "@shared/schema";
import { addFreeVillagersWithinCap, killVillagers, stackTimedDebuff } from "@/game/stateHelpers";
import { getTotalStrength } from "./effectsCalculation";
import { getCurrentPopulation, getMaxPopulation } from "@/game/population";
import { woodcutterEvents } from "./eventsWoodcutter";
import { loreEvents } from "./eventsLore";
import { shopItemEvents } from "./eventsShopItems";
import { fullGameUnlockEvents } from "./eventsFullGameUnlock";
import {
  CRUEL_MODE,
  curseLikeDurationMs,
  disgustDurationMs,
  cruelModeScale,
} from "../cruelMode";

/** Death outcomes only draw from unassigned villagers at the forest edge. */
function paleFigureFreeVillagers(state: GameState): number {
  return state.villagers?.free ?? 0;
}

function paleFigureDeathsWithinFree(
  state: GameState,
  requestedDeaths: number,
): number {
  return Math.min(requestedDeaths, paleFigureFreeVillagers(state));
}

export const choiceEvents: Record<string, GameEvent> = {
  ...woodcutterEvents,
  ...loreEvents,
  ...shopItemEvents,
  ...fullGameUnlockEvents,
  paleFigure: {
    id: "paleFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 2 &&
      !state.clothing.ravenfeather_mantle &&
      state.current_population >= 4 &&
      paleFigureFreeVillagers(state) >= 1,
    timeProbability: 35,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        relevant_stats: ["luck", "strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(
            state,
            0.1,
            { type: "strength", multiplier: 0.01 },
            { type: "luck", multiplier: 0.005 },
          );
        },
        effect: (state: GameState) => {
          const mantleChance = calculateSuccessChance(
            state,
            0.1,
            { type: "strength", multiplier: 0.01 },
            { type: "luck", multiplier: 0.005 },
          );

          const rand = Math.random();
          if (rand < mantleChance) {
            return {
              clothing: {
                ...state.clothing,
                ravenfeather_mantle: true,
              },
              _logMessageKey: "outcome0",
            };
          } else if (rand < 0.6) {
            const deaths = paleFigureDeathsWithinFree(state, 1);
            if (deaths <= 0) {
              return { _logMessageKey: "outcome3" };
            }
            return {
              ...killVillagers(state, deaths),
              _logMessageKey: "outcome1",
            };
          } else {
            const deaths = paleFigureDeathsWithinFree(
              state,
              2 +
              Math.floor(Math.random() * state.buildings.woodenHut * 0.5) +
              cruelModeScale(state) *
              CRUEL_MODE.paleFigure.failureDeathScaleWhenCruel,
            );
            if (deaths <= 0) {
              return { _logMessageKey: "outcome3" };
            }

            const deathResult = killVillagers(state, deaths);
            const actualDeaths = deathResult.villagersKilled || 0;
            if (actualDeaths <= 0) {
              return { _logMessageKey: "outcome3" };
            }

            return {
              ...deathResult,
              _logMessageKey: "outcome2",
              _logMessageVars: { actualDeaths },
            };
          }
        },
      },
      {
        id: "ignore",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
          const rand = Math.random();
          if (rand < successChance) {
            // Nothing happens
            return {
              _logMessageKey: "outcome3",
            };
          } else {
            const deaths = paleFigureDeathsWithinFree(state, 1);
            if (deaths <= 0) {
              return { _logMessageKey: "outcome3" };
            }
            return {
              ...killVillagers(state, deaths),
              _logMessageKey: "outcome4",
            };
          }
        },
      },
    ],
  },

  whispersBeneathHut: {
    id: "whispersBeneathHut",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 && !state.clothing.muttering_amulet,
    timeProbability: 25,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "investigateHut",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              muttering_amulet: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "ignoreHut",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  blackenedMirror: {
    id: "blackenedMirror",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 5 &&
      state.resources.iron >= 500 &&
      !state.relics.blackened_mirror,
    timeProbability: 35,
    priority: 3,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 180000, // 3 minutes
    choices: [
      {
        id: "buyMirror",
        cost: "500 iron",
        effect: (state: GameState) => {
          return {
            resources: {
              ...state.resources,
              iron: state.resources.iron - 500,
            },
            relics: {
              ...state.relics,
              blackened_mirror: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "refuseMirror",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  cthulhuFigure: {
    id: "cthulhuFigure",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 4 &&
      !state.relics.wooden_figure &&
      !state.story.seen.cthulhuFigureChoice,
    timeProbability: 45,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "keepFigure",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              wooden_figure: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                cthulhuFigureChoice: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "discardFigure",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                cthulhuFigureChoice: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  offerToTheForestGods: {
    id: "offerToTheForestGods",
    condition: (state: GameState) =>
      state.current_population >= 10 &&
      !state.clothing.ebony_ring &&
      state.buildings.altar == 1,
    timeProbability: 35,
    priority: 4,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 15,
    choices: [
      {
        id: "sacrifice",
        label: (state: GameState) =>
          `Sacrifice ${state.cruelMode
            ? CRUEL_MODE.offerForestGods.sacrificeLabel.cruel
            : CRUEL_MODE.offerForestGods.sacrificeLabel.normal
          } villagers`,
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.3, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.3, {
            type: "knowledge",
            multiplier: 0.01,
          });
          const rand = Math.random();

          // Kill 4 villagers first
          const deathResult = killVillagers(
            state,
            CRUEL_MODE.offerForestGods.initialKill.base +
            cruelModeScale(state) * CRUEL_MODE.offerForestGods.initialKill.whenCruel,
          );

          if (rand < successChance) {
            // Success: event resolved, get ebony ring
            return {
              ...deathResult,
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessageKey: "outcome0",
            };
          } else {
            // Failure: additional suicides
            const additionalDeaths =
              Math.floor(
                Math.random() * CRUEL_MODE.offerForestGods.failAdditionalDeaths.randMax,
              ) +
              CRUEL_MODE.offerForestGods.failAdditionalDeaths.base +
              cruelModeScale(state) * CRUEL_MODE.offerForestGods.failAdditionalDeaths.whenCruel;
            const stateAfterInitialKill = {
              ...state,
              villagers: deathResult.villagers || state.villagers,
              stats: { ...state.stats, ...(deathResult.stats || {}) },
            };
            const totalDeathResult = killVillagers(
              stateAfterInitialKill,
              additionalDeaths,
            );
            const actualAdditionalDeaths =
              totalDeathResult.villagersKilled || 0;

            return {
              villagers: totalDeathResult.villagers,
              stats: totalDeathResult.stats,
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessageKey: "outcome1",
              _logMessageVars: { actualAdditionalDeaths },
            };
          }
        },
      },
      {
        id: "refuse",
        relevant_stats: ["luck"],
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(
            state,
            0.1,
            { type: "luck", multiplier: 0.01 },
            undefined,
            CRUEL_MODE.successChance.refuseForestGodsCruelMultiplier,
          );
          const nothingChance =
            CRUEL_MODE.offerForestGods.refuseNothingChance.base -
            cruelModeScale(state) * CRUEL_MODE.offerForestGods.refuseNothingChance.whenCruel;
          const rand = Math.random();

          if (rand < successChance) {
            // Best outcome: event resolved, get ebony ring
            return {
              clothing: {
                ...state.clothing,
                ebony_ring: true,
              },
              _logMessageKey: "outcome2",
            };
          } else if (rand < successChance + nothingChance) {
            // Nothing happens, event remains active
            return {
              _logMessageKey: "outcome3",
            };
          } else {
            // Villagers disappear
            const disappearances =
              Math.floor(
                Math.random() *
                CRUEL_MODE.offerForestGods.refuseDisappearances.randMax,
              ) +
              CRUEL_MODE.offerForestGods.refuseDisappearances.base +
              cruelModeScale(state) * CRUEL_MODE.offerForestGods.refuseDisappearances.whenCruel;
            const deathResult = killVillagers(state, disappearances);
            const actualDisappearances = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessageKey:
                actualDisappearances === 1 ? "outcome4_one" : "outcome4_other",
              _logMessageVars: { actualDisappearances },
            };
          }
        },
      },
    ],
    fallbackChoice: {
      id: "noDecision",
      effect: (state: GameState) => {
        const departures =
          Math.floor(
            Math.random() * CRUEL_MODE.offerForestGods.fallbackDepartures.randMax,
          ) +
          CRUEL_MODE.offerForestGods.fallbackDepartures.base +
          cruelModeScale(state) * CRUEL_MODE.offerForestGods.fallbackDepartures.whenCruel;
        const deathResult = killVillagers(state, departures);
        const actualDepartures = deathResult.villagersKilled || 0;

        return {
          ...deathResult,
          _logMessageKey: "outcome5",
          _logMessageVars: { actualDepartures },
        };
      },
    },
  },

  madBeduine: {
    id: "madBeduine",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 7 &&
      state.current_population > 12 &&
      !state.relics.unnamed_book,
    timeProbability: 35,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              unnamed_book: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "turnAway",
        effect: (state: GameState) => {
          const traps = state.buildings.traps;
          const villagerDeaths = Math.floor(
            Math.random() * state.buildings.woodenHut +
            2 -
            traps * 2 +
            cruelModeScale(state) * CRUEL_MODE.madBeduine.turnAwayDeathsExtraWhenCruel,
          );
          const deathResult = killVillagers(state, villagerDeaths);
          const actualDeaths = deathResult.villagersKilled || 0;

          return {
            ...deathResult,
            relics: {
              ...state.relics,
              unnamed_book: true,
            },
            _logMessageKey: "outcome1",
            _logMessageVars: { actualDeaths },
          };
        },
      },
    ],
  },

  hiddenLake: {
    id: "hiddenLake",
    condition: (state: GameState) =>
      state.flags.forestUnlocked &&
      state.buildings.woodenHut >= 4 &&
      !state.clothing.cracked_crown,
    timeProbability: 40,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "investigate",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
          const fleeChance =
            CRUEL_MODE.hiddenLake.fleeChance.base -
            cruelModeScale(state) * CRUEL_MODE.hiddenLake.fleeChance.whenCruel;
          const rand = Math.random();

          if (rand < successChance) {
            return {
              resources: {
                ...state.resources,
                silver: state.resources.silver + 250,
                bones: state.resources.bones + 1000,
              },
              clothing: {
                ...state.clothing,
                cracked_crown: true,
              },
              _logMessageKey: "outcome0",
            };
          } else if (rand < successChance + fleeChance) {
            return {
              _logMessageKey: "outcome1",
            };
          } else {
            const drownedCount =
              Math.floor(
                Math.random() * CRUEL_MODE.hiddenLake.drownedCount.randMax,
              ) +
              CRUEL_MODE.hiddenLake.drownedCount.base +
              cruelModeScale(state) * CRUEL_MODE.hiddenLake.drownedCount.whenCruel;
            const deathResult = killVillagers(state, drownedCount);
            const actualDrowned = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessageKey:
                actualDrowned === 1 ? "lakeDrownOne" : "lakeDrownMany",
            };
          }
        },
      },
      {
        id: "avoidLake",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.4, {
            type: "luck",
            multiplier: 0.01,
          });
          const rand = Math.random();

          if (rand < successChance) {
            return {
              _logMessageKey: "outcome2",
            };
          } else {
            const deathResult = killVillagers(state, 1);

            return {
              ...deathResult,
              _logMessageKey: "outcome3",
            };
          }
        },
      },
    ],
  },

  templeDedication: {
    id: "templeDedication",
    condition: (state: GameState) =>
      state.buildings.temple >= 1 && !state.story.seen.templeDedicated,
    timeProbability: 1,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "church_of_dagon",
        effect: (state: GameState) => {
          return {
            blessings: {
              ...state.blessings,
              dagons_gift: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "way_of_first_flame",
        effect: (state: GameState) => {
          const { patch } = addFreeVillagersWithinCap(state, 4);

          return {
            ...patch,
            blessings: {
              ...state.blessings,
              flames_touch: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ...(patch.story?.seen),
                templeDedicated: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "cult_of_ravenborn",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              ravens_orb: true,
            },
            blessings: {
              ...state.blessings,
              ravens_mark: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "order_of_ashbringer",
        effect: (state: GameState) => {
          return {
            weapons: {
              ...state.weapons,
              ashen_dagger: true,
            },
            blessings: {
              ...state.blessings,
              ashen_embrace: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                templeDedicated: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  vikingBuilder: {
    id: "vikingBuilder",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 9 && !state.story.seen.vikingBuilderEvent,
    timeProbability: 15,
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "sendAway",
      effect: (state: GameState) => {
        return {
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "acceptDeal",
        cost: "250 Gold",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold - 250,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              vikingBuilderEvent: true,
              longhouseUnlocked: true,
            },
          },
          _logMessageKey: "outcome2",
        }),
      },
      {
        id: "forceHim",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "strength",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            // Success: get knowledge without paying
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  vikingBuilderEvent: true,
                  vikingBuilderEventForced: true,
                  longhouseUnlocked: true,
                },
              },
              _logMessageKey: "outcome3",
            };
          } else {
            // Failure: he escapes and villagers are killed
            const casualties =
              Math.floor(
                Math.random() * CRUEL_MODE.vikingBuilder.failureCasualties.randMax,
              ) +
              CRUEL_MODE.vikingBuilder.failureCasualties.base +
              cruelModeScale(state) * CRUEL_MODE.vikingBuilder.failureCasualties.whenCruel;
            const deathResult = killVillagers(state, casualties);
            const actualCasualties = deathResult.villagersKilled || 0;

            return {
              ...deathResult,
              _logMessageKey: "outcome4",
              _logMessageVars: { actualCasualties },
            };
          }
        },
      },
      {
        id: "sendAway",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome5",
          };
        },
      },
    ],
  },

  nordicWarAxe: {
    id: "nordicWarAxe",
    condition: (state: GameState) =>
      state.buildings.longhouse >= 2 &&
      state.cruelMode &&
      !state.weapons.nordic_war_axe &&
      !state.story.seen.nordicWarAxeEvent,
    timeProbability: 15,
    priority: 5,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "decline",
      effect: (state: GameState) => {
        const wasForced = state.story.seen.vikingBuilderEventForced;

        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              nordicWarAxeEvent: true,
            },
          },
          _logMessageKey: wasForced ? "ignoreForced" : "ignoreNormal",
        };
      },
    },
    choices: [
      {
        id: "buyAxe",
        label: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;
          return `Buy for ${cost} gold`;
        },
        cost: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;
          return `${cost} gold`;
        },
        effect: (state: GameState) => {
          const cost = state.story.seen.vikingBuilderEventForced ? 750 : 500;
          const wasForced = state.story.seen.vikingBuilderEventForced;

          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - cost,
            },
            weapons: {
              ...state.weapons,
              nordic_war_axe: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                nordicWarAxeEvent: true,
              },
            },
            _logMessageKey: wasForced ? "buyForced" : "buyNormal",
          };
        },
      },
      {
        id: "decline",
        effect: (state: GameState) => {
          const wasForced = state.story.seen.vikingBuilderEventForced;

          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                nordicWarAxeEvent: true,
              },
            },
            _logMessageKey: wasForced ? "declineForced" : "declineNormal",
          };
        },
      },
    ],
  },

  wanderingTribe: {
    id: "wanderingTribe",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 3 &&
      !state.buildings.furTents &&
      !state.story.seen.furTentsUnlocked,
    timeProbability: 60,
    priority: 3,
    repeatable: true,
    skipEventLog: true,
    choices: [
      {
        id: "acceptTribe",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                furTentsUnlocked: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "refuseTribeChoice",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  sanctumDedication: {
    id: "sanctumDedication",
    condition: (state: GameState) =>
      state.buildings.sanctum >= 1 &&
      state.buildings.bastion >= 1 &&
      state.story.seen.templeDedicated &&
      !state.story.seen.sanctumDedicated,
    timeProbability: 3,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "deepenDevotion",
        effect: (state: GameState) => {
          const b = state.blessings;
          const active = b.dagons_gift
            ? "dagon"
            : b.flames_touch
              ? "flame"
              : b.ravens_mark
                ? "raven"
                : b.ashen_embrace
                  ? "ash"
                  : "";

          const updates: Record<string, any> = {
            dagon: {
              dagons_gift: true,
              dagons_gift_enhanced: true,
              msg: "Dagon's Blessing flows stronger than before.",
            },
            flame: {
              flames_touch: true,
              flames_touch_enhanced: true,
              msg: "The First Flame burns brighter than before.",
            },
            raven: {
              ravens_mark: true,
              ravens_mark_enhanced: true,
              msg: "The Raven's Mark grows stronger than before.",
            },
            ash: {
              ashen_embrace: true,
              ashen_embrace_enhanced: true,
              msg: "The Ashen Embrace is stronger than before.",
            },
          };

          const { msg, ...blessings } = updates[active] || { msg: "" };

          return {
            blessings: { ...state.blessings, ...blessings },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                sanctumDedicated: true,
              },
            },
            templeDedicatedTo: active || state.templeDedicatedTo,
            _logMessageKey: active ? `dedicate_${active}` : "dedicate_unknown",
          };
        },
      },
      {
        id: "dedicateToAll",
        effect: (state: GameState) => {
          return {
            blessings: {
              ...state.blessings,
              dagons_gift: true,
              flames_touch: true,
              ravens_mark: true,
              ashen_embrace: true,
            },
            relics: {
              ...state.relics,
              ravens_orb: true,
            },
            weapons: {
              ...state.weapons,
              ashen_dagger: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                sanctumDedicated: true,
              },
            },
            templeDedicatedTo: "all",
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  paleCrossProposal: {
    id: "paleCrossProposal",
    condition: (state: GameState) =>
      state.buildings.sanctum >= 1 &&
      (Number(state.story?.seen?.boneTotemsUsageCount) || 0) >= 20 &&
      !state.story.seen.paleCrossUnlocked &&
      !state.story.seen.paleCrossRefused,
    timeProbability: 5,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "acceptPaleCross",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                paleCrossUnlocked: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "refusePaleCross",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                paleCrossRefused: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  paleCrossCrucifixion: {
    id: "paleCrossCrucifixion",
    condition: (state: GameState) =>
      state.buildings.paleCross >= 1 &&
      !state.story.seen.paleCrossCrucifixionEvent,
    timeProbability: 45,
    priority: 5,
    repeatable: false,
    showAsTimedTab: true,
    timedTabDuration: 5 * 60 * 1000, // 5 minutes
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const duration = 10 * 60 * 1000;
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              paleCrossCrucifixionEvent: true,
            },
          },
          disgustState: stackTimedDebuff(state.disgustState, duration),
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "holdFuneral",
        cost: "1000 food",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            food: (state.resources.food || 0) - 1000,
          },
          stats: {
            ...state.stats,
            madnessFromEvents: (state.stats.madnessFromEvents || 0) - 2,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              paleCrossCrucifixionEvent: true,
            },
          },
          _logMessageKey: "outcome2",
        }),
      },
      {
        id: "investigateKillers",
        effect: (state: GameState) => {
          const executionResult = killVillagers(state, 3);
          return {
            ...executionResult,
            stats: {
              ...state.stats,
              ...(executionResult.stats || {}),
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                paleCrossCrucifixionEvent: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
      {
        id: "consecrateToCross",
        effect: (state: GameState) => {
          const duration = 10 * 60 * 1000;
          return {
            buildings: {
              ...state.buildings,
              paleCross: 0,
              consecratedPaleCross: 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                paleCrossCrucifixionEvent: true,
              },
            },
            disgustState: stackTimedDebuff(state.disgustState, duration),
            _logMessageKey: "outcome4",
          };
        },
      },
    ],
  },

  slaveTrader: {
    id: "slaveTrader",
    condition: (state: GameState) => {
      const currentPopulation = getCurrentPopulation(state);
      const maxPopulation = getMaxPopulation(state);
      const hasRoomForTwo = maxPopulation - currentPopulation >= 2;

      return (
        state.buildings.woodenHut >= 3 &&
        currentPopulation > 2 &&
        hasRoomForTwo &&
        !state.story.seen.slaveTraderEvent
      );
    },
    timeProbability: 25,
    priority: 3,
    repeatable: true,
    choices: [
      {
        id: "sellVillagers",
        effect: (state: GameState) => {
          const currentPopulation = getCurrentPopulation(state);

          // Kill 2 villagers for the trade
          const tradeResult = killVillagers(state, 2);

          // All remaining villagers leave in disgust
          const remainingPopulation = currentPopulation - 2;
          const stateAfterTrade = {
            ...state,
            villagers: tradeResult.villagers || state.villagers,
            stats: { ...state.stats, ...(tradeResult.stats || {}) },
          };
          const leaveResult = killVillagers(stateAfterTrade, remainingPopulation);

          return {
            ...leaveResult,
            resources: {
              ...state.resources,
              steel: state.resources.steel + 100,
            },
            stats: {
              ...(leaveResult.stats || stateAfterTrade.stats),
              madness:
                (leaveResult.stats?.madness ?? stateAfterTrade.stats.madness) + 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaveTraderEvent: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "freeSlaves",
        relevant_stats: ["strength"],
        success_chance: () => 1,
        effect: (state: GameState) => {
          const { patch } = addFreeVillagersWithinCap(state, 2);

          return {
            ...patch,
            resources: {
              ...state.resources,
              steel: state.resources.steel + 100,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: Math.max(
                0,
                (state.stats.madnessFromEvents || 0) - 1,
              ),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                ...(patch.story?.seen),
                slaveTraderEvent: true,
              },
            },
            _logMessageKey: "outcome1",
          };
        },
      },
      {
        id: "refuseTrader",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaveTraderEvent: true,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  witchsCurse: {
    id: "witchsCurse",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 8 &&
      state.resources.gold >= 50 &&
      !state.curseState?.isActive &&
      !state.story.seen.witchsCurseEvent,
    timeProbability: 45,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "payGold",
        cost: "50 gold",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold - 50,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              witchsCurseEvent: true,
            },
          },
          _logMessageKey: "outcome1",
        }),
      },
      {
        id: "doNotPay",
        relevant_stats: ["luck"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.25, {
            type: "luck",
            multiplier: 0.015,
          });
        },
        effect: (state: GameState) => {
          const avoidCurseChance = calculateSuccessChance(state, 0.25, {
            type: "luck",
            multiplier: 0.015,
          });

          if (Math.random() < avoidCurseChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome2",
            };
          } else {
            const curseDuration = curseLikeDurationMs(cruelModeScale(state));
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome3",
            };
          }
        },
      },
      {
        id: "attackHer",
        relevant_stats: ["strength"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.15, {
            type: "strength",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.15, {
            type: "strength",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome4",
            };
          } else {
            const curseDuration = curseLikeDurationMs(cruelModeScale(state));
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome5",
            };
          }
        },
      },
      {
        id: "threatenHer",
        relevant_stats: ["knowledge"],
        success_chance: (state: GameState) => {
          return calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });
        },
        effect: (state: GameState) => {
          const successChance = calculateSuccessChance(state, 0.2, {
            type: "knowledge",
            multiplier: 0.01,
          });

          if (Math.random() < successChance) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome6",
            };
          } else {
            const curseDuration = curseLikeDurationMs(cruelModeScale(state));
            return {
              curseState: {
                isActive: true,
                endTime: Date.now() + curseDuration,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  witchsCurseEvent: true,
                },
              },
              _logMessageKey: "outcome7",
            };
          }
        },
      },
    ],
  },

  masterArcher: {
    id: "masterArcher",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 5 && !state.blessings.sharp_aim,
    timeProbability: 30,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => ({
        _logMessageKey: "outcome0",
      }),
    },
    choices: [
      {
        id: "acceptArcherHelp",
        cost: "5000 food",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            food: state.resources.food - 5000,
          },
          blessings: {
            ...state.blessings,
            sharp_aim: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              masterArcherEvent: true,
            },
          },
          _logMessageKey: "outcome2",
        }),
      },
      {
        id: "acceptArcherHelpGold",
        cost: "200 gold",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold - 200,
          },
          blessings: {
            ...state.blessings,
            sharp_aim: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              masterArcherEvent: true,
            },
          },
          _logMessageKey: "outcome4",
        }),
      },
      {
        id: "refuseArcherHelp",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome5",
          };
        },
      },
    ],
  },

  mysteriousWoman: {
    id: "mysteriousWoman",
    condition: (state: GameState) =>
      state.buildings.stoneHut >= 3 &&
      state.buildings.darkEstate >= 1 &&
      state.resources.silver >=
      CRUEL_MODE.mysteriousWoman.silverMin.base +
      cruelModeScale(state) * CRUEL_MODE.mysteriousWoman.silverMin.whenCruel &&
      !state.story.seen.mysteriousWomanEvent,
    timeProbability: 5,
    // Character is opposite of player: female if player is m, male if player is f or fallback
    title: (state: GameState) => (state.g === "m" ? "woman" : "man"),
    message: (state: GameState) => (state.g === "m" ? "woman" : "man"),
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "allowStay",
        label: (state: GameState) => (state.g === "m" ? "woman" : "man"),
        effect: (state: GameState) => {
          const silverStolen =
            CRUEL_MODE.mysteriousWoman.silverMin.base +
            cruelModeScale(state) * CRUEL_MODE.mysteriousWoman.silverMin.whenCruel;
          return {
            resources: {
              ...state.resources,
              silver: Math.max(0, state.resources.silver - silverStolen),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousWomanEvent: true,
              },
            },
            _logMessageKey: state.g === "m" ? "outcome0_woman" : "outcome0_man",
            _logMessageVars: { silverStolen },
          };
        },
      },
      {
        id: "refuseStay",
        label: (state: GameState) => (state.g === "m" ? "woman" : "man"),
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                mysteriousWomanEvent: true,
              },
            },
            _logMessageKey: state.g === "m" ? "outcome1_woman" : "outcome1_man",
          };
        },
      },
    ],
  },

  veiledSeer: {
    id: "veiledSeer",
    condition: (state: GameState) =>
      state.buildings.darkEstate >= 1 && state.resources.gold >= 50,
    timeProbability: 45,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "accept",
        cost: "50 gold",
        effect: (state: GameState) => {
          const name = state.fn ? `, ${state.fn}` : "";
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 50,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            _logMessageKey: "outcome1",
            _logMessageVars: { name },
          };
        },
      },
      {
        id: "decline",
        effect: (state: GameState) => {
          const farewell = state.fn
            ? `"Farewell then, ${state.fn}," he says, and disappears into the mist without another word.`
            : "'Farewell then,' he says, and disappears into the mist without another word.";
          return {
            _logMessageKey: "outcome2",
            _logMessageVars: { farewell },
          };
        },
      },
    ],
  },

  unnamedWanderer: {
    id: "unnamedWanderer",
    condition: (state: GameState) =>
      state.buildings.deepPit >= 1 &&
      !state.miningBoostState?.isActive &&
      !state.story.seen.unnamedWandererAccepted,
    timeProbability: 60,
    priority: 3,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    skipEventLog: true,
    fallbackChoice: {
      id: "sendAway",
      effect: (state: GameState) => {
        return {
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "offerFood",
        cost: "2500 food",
        effect: (state: GameState) => {
          const boostDuration = 30 * 60 * 1000; // 30 minutes
          return {
            resources: {
              ...state.resources,
              food: state.resources.food - 2500,
            },
            miningBoostState: {
              isActive: true,
              endTime: Date.now() + boostDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                unnamedWandererAccepted: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "offerGold",
        cost: "100 gold",
        effect: (state: GameState) => {
          const boostDuration = 30 * 60 * 1000; // 30 minutes
          return {
            resources: {
              ...state.resources,
              gold: state.resources.gold - 100,
            },
            miningBoostState: {
              isActive: true,
              endTime: Date.now() + boostDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                unnamedWandererAccepted: true,
              },
            },
            _logMessageKey: "outcome4",
          };
        },
      },
    ],
  },

  wanderingFirecrafter: {
    id: "wanderingFirecrafter",
    condition: (state: GameState) =>
      state.cruelMode &&
      state.story.seen.firstWaveVictory &&
      state.buildings.alchemistHall >= 1 &&
      state.story.seen.alchemistArrives &&
      !state.story.seen.wanderingFirecrafterEvent,
    timeProbability: 20,
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000,
    skipEventLog: true,
    fallbackChoice: {
      id: "sendAway",
      effect: (state: GameState) => {
        return {
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              wanderingFirecrafterEvent: true,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "payGold",
        cost: "250 gold",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            gold: state.resources.gold - 250,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              wanderingFirecrafterEvent: true,
              canCraftVoidBomb: true,
            },
          },
          _logMessageKey: "outcome2",
        }),
      },
      {
        id: "paySilver",
        cost: "1000 silver",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            silver: state.resources.silver - 1000,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              wanderingFirecrafterEvent: true,
              canCraftVoidBomb: true,
            },
          },
          _logMessageKey: "outcome4",
        }),
      },
      {
        id: "sendAway",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                wanderingFirecrafterEvent: true,
              },
            },
            _logMessageKey: "outcome5",
          };
        },
      },
    ],
  },

  boneTempleProposal: {
    id: "boneTempleProposal",
    condition: (state: GameState) =>
      (state.story?.seen?.humansSacrificeLevel || 0) >= 10 &&
      !state.story?.seen?.boneTempleProposalEvent &&
      state.buildings.blackMonolith >= 1 &&
      (state.buildings.boneTemple || 0) === 0,
    timeProbability: 1,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "acceptBoneTemple",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                boneTempleProposalEvent: true,
                boneTempleUnlocked: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  oddTrinket: {
    id: "oddTrinket",
    condition: (state: GameState) =>
      !state.relics?.odd_trinket &&
      state.weapons.crude_bow &&
      state.buildings.woodenHut <= 4,
    timeProbability: 10,
    priority: 3,
    repeatable: false,
    isTimedChoice: true,
    baseDecisionTime: 20,
    choices: [
      {
        id: "drinkTrinket",
        effect: (state: GameState) => {
          return {
            relics: {
              ...state.relics,
              odd_trinket: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "discardTrinket",
        effect: (state: GameState) => {
          return {
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
    fallbackChoice: {
      id: "discardTrinket",
      effect: (state: GameState) => {
        return {
          _logMessageKey: "outcome2",
        };
      },
    },
  },

  youngWomanProtest: {
    id: "youngWomanProtest",
    condition: (state: GameState) =>
      (state.story?.seen?.humansSacrificeLevel || 0) >= 5 &&
      !state.story?.seen?.youngWomanProtestEvent,
    timeProbability: 2,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "banishHer",
        effect: (state: GameState) => {
          const deathResult = killVillagers(
            state,
            CRUEL_MODE.youngWomanProtest.banishLeavers.base +
            cruelModeScale(state) * CRUEL_MODE.youngWomanProtest.banishLeavers.whenCruel,
          );
          const actualLeavers = deathResult.villagersKilled || 0;
          return {
            ...deathResult,
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents: (state.stats.madnessFromEvents || 0) + 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
              },
            },
            _logMessageKey: "outcome0",
            _logMessageVars: { actualLeavers },
          };
        },
      },
      {
        id: "sacrificeHer",
        effect: (state: GameState) => {
          const deathResult = killVillagers(
            state,
            CRUEL_MODE.youngWomanProtest.sacrificeLeavers.base +
            cruelModeScale(state) * CRUEL_MODE.youngWomanProtest.sacrificeLeavers.whenCruel,
          );
          const actualLeavers = deathResult.villagersKilled || 0;
          return {
            ...deathResult,
            stats: {
              ...state.stats,
              ...(deathResult.stats || {}),
              madnessFromEvents: (state.stats.madnessFromEvents || 0) + 2,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
              },
            },
            _logMessageKey: "outcome1",
            _logMessageVars: { actualLeavers },
          };
        },
      },
      {
        id: "stopSacrifices",
        effect: (state: GameState) => {
          return {
            flags: {
              ...state.flags,
              humanSacrificeUnlocked: false,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                youngWomanProtestEvent: true,
                pillarOfClarityUnlocked: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
    ],
  },

  frostfall: {
    id: "frostfall",
    condition: (state: GameState) => {
      const timesOccurred = (state.story?.seen?.frostfallCount as number) || 0;
      return (
        state.buildings.woodenHut >= 3 &&
        !state.frostfallState?.isActive &&
        timesOccurred < 5
      );
    },
    timeProbability: 60, // 1 hour
    priority: 4,
    repeatable: true,
    showAsTimedTab: true,
    timedTabDuration: 3 * 60 * 1000, // 3 minutes
    fallbackChoice: {
      id: "doNothing",
      effect: (state: GameState) => {
        const timesOccurred =
          (state.story?.seen?.frostfallCount as number) || 0;
        const frostfallDuration = curseLikeDurationMs(cruelModeScale(state));

        return {
          frostfallState: {
            isActive: true,
            endTime: Date.now() + frostfallDuration,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              frostfallCount: timesOccurred + 1,
            },
          },
          _logMessageKey: "outcome0",
        };
      },
    },
    choices: [
      {
        id: "prepareFrostfall",
        cost: (state: GameState) => {
          const timesOccurred =
            (state.story?.seen?.frostfallCount as number) || 0;
          const woodCost = 500 * (timesOccurred + 1);
          const foodCost = 500 * (timesOccurred + 1);
          return `${woodCost} wood, ${foodCost} food`;
        },
        effect: (state: GameState) => {
          const timesOccurred =
            (state.story?.seen?.frostfallCount as number) || 0;
          const woodCost = 500 * (timesOccurred + 1);
          const foodCost = 500 * (timesOccurred + 1);

          return {
            resources: {
              ...state.resources,
              wood: state.resources.wood - woodCost,
              food: state.resources.food - foodCost,
            },
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                frostfallCount: timesOccurred + 1,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
      {
        id: "doNothing",
        effect: (state: GameState) => {
          const timesOccurred =
            (state.story?.seen?.frostfallCount as number) || 0;
          const frostfallDuration = curseLikeDurationMs(cruelModeScale(state));

          return {
            frostfallState: {
              isActive: true,
              endTime: Date.now() + frostfallDuration,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                frostfallCount: timesOccurred + 1,
              },
            },
            _logMessageKey: "outcome3",
          };
        },
      },
    ],
  },

  lastSurvivor: {
    id: "lastSurvivor",
    condition: (state: GameState) =>
      state.buildings.woodenHut >= 6 && !state.blessings.survivors_last_words,
    timeProbability: 15,
    priority: 4,
    repeatable: false,
    choices: [
      {
        id: "letHimStay",
        effect: (state: GameState) => {
          return {
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                lastSurvivorHelped: true,
              },
            },
            blessings: {
              ...state.blessings,
              survivors_last_words: true,
            },
            _logMessageKey: "outcome0",
          };
        },
      },
      {
        id: "sendHimAway",
        effect: (state: GameState) => {
          return {
            stats: {
              ...state.stats,
              madnessFromEvents: (state.stats.madnessFromEvents || 0) + 1,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                lastSurvivorRejected: true,
              },
            },
            disgustState: stackTimedDebuff(
              state.disgustState,
              disgustDurationMs(state.cruelMode),
            ),
            _logMessageKey: "outcome1",
          };
        },
      },
    ],
  },

  leatherHarnessRequest: {
    id: "leatherHarnessRequest",
    condition: (state: GameState) =>
      state.flags.villageUnlocked &&
      state.resources.leather >= 100 &&
      (Number(state.story?.seen?.leatherTotemsUsageCount) || 0) >= 20 &&
      !state.story.seen.leatherHarnessRequest,
    timeProbability: 5,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "helpWithLeather",
        cost: "100 leather",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            leather: (state.resources.leather || 0) - 100,
          },
          stats: {
            ...state.stats,
            madnessFromEvents: (state.stats.madnessFromEvents || 0) - 1,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              leatherHarnessRequest: true,
              leatherHarnessHelped: true,
            },
          },
          _logMessageKey: "outcome1",
        }),
      },
      {
        id: "refuseLeather",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                leatherHarnessRequest: true,
              },
            },
            _logMessageKey: "outcome2",
          };
        },
      },
    ],
  },

  leatherHarnessGratefulReturn: {
    id: "leatherHarnessGratefulReturn",
    condition: (state: GameState) =>
      state.flags.villageUnlocked &&
      state.story?.seen?.leatherHarnessRequest === true &&
      state.story?.seen?.leatherHarnessHelped === true &&
      !state.story.seen.leatherHarnessGratefulReturn &&
      !state.clothing.ring_of_obedience,
    timeProbability: 30,
    priority: 3,
    repeatable: false,
    choices: [
      {
        id: "acceptRing",
        effect: (state: GameState) => {
          return {
            clothing: {
              ...state.clothing,
              ring_of_obedience: true,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                leatherHarnessGratefulReturn: true,
              },
            },
            _logMessageKey: "outcome0",
          };
        },
      },
    ],
  },

  swampSanctuaryChoice: {
    id: "swampSanctuaryChoice",
    condition: () => false,
    priority: 0,
    repeatable: false,
    choices: [
      {
        id: "chopBlackTree",
        effect: (state: GameState) => ({
          relics: {
            ...state.relics,
            black_wood: true,
          },
          stats: {
            ...state.stats,
            madnessFromEvents: (state.stats.madnessFromEvents || 0) + 5,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              swampSanctuaryChoiceMade: true,
            },
          },
          _logMessageKey: "outcome0",
        }),
      },
      {
        id: "sacrificeAtTree",
        cost: "1000 Food",
        effect: (state: GameState) => ({
          resources: {
            ...state.resources,
            food: (state.resources.food || 0) - 1000,
          },
          blessings: {
            ...state.blessings,
            ebon_grace: true,
          },
          story: {
            ...state.story,
            seen: {
              ...state.story.seen,
              swampSanctuaryChoiceMade: true,
            },
          },
          _logMessageKey: "outcome2",
        }),
      },
    ],
  },
};
