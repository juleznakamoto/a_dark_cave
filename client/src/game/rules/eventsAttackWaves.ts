import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalKnowledge } from "./effects";
import { calculateBastionStats } from "../bastionStats";

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: {
    id: "firstWave",
    condition: (state: GameState) =>
      state.flags.portalBlasted && state.story.seen.hasBastion, 
      // && !state.story.seen.firstWave,
    triggerType: "resource",
    timeProbability: 0.05, // Triggers quickly after portal blast
    title: "The First Wave",
    message:
      "The earth trembles as something ancient stirs in the depths below. Through the shattered portal, twisted creatures begin to emerge - pale, elongated beings with too many joints and eyes like burning coals. They move with unnatural grace toward your village, their alien voices echoing through the caverns.",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "startFight",
        label: "Start Fight",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWave: true,
              },
            },
            _combatData: {
              enemy: {
                name: "Pale Creatures",
                attack: 8,
                maxHealth: 15,
                currentHealth: 15,
              },
              eventTitle: "The First Wave",
              onVictory: () => ({
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    firstWaveVictory: true,
                  },
                },
                _logMessage: "Your defenses hold strong! The pale creatures crash against your fortifications but cannot penetrate your defenses. Victory is yours with no casualties!",
              }),
              onDefeat: () => {
                const currentPopulation = Object.values(state.villagers).reduce(
                  (sum, count) => sum + (count || 0),
                  0,
                );
                const casualties = Math.min(5, currentPopulation);
                const deathResult = killVillagers(state, casualties);
                
                return {
                  ...deathResult,
                  _logMessage: `The pale creatures overwhelm your defenses. ${casualties} villagers fall before the remaining creatures retreat to the depths.`,
                };
              },
            },
          };
        },
      },
    ],
  },

  secondWave: {
    id: "secondWave",
    condition: (state: GameState) =>
      state.story.seen.firstWave &&
      !state.story.seen.secondWave,
    triggerType: "resource",
    timeProbability: 3, // 3 minutes after first wave
    title: "The Second Wave",
    message:
      "The creatures return with reinforcements - larger, more intelligent beings that coordinate their attacks. These new horrors wear crude armor made from the bones of previous victims and wield weapons that seem to pulse with dark energy. They've learned from the first assault.",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "startFight",
        label: "Start Fight",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                secondWave: true,
              },
            },
            _combatData: {
              enemy: {
                name: "Armored Creatures",
                attack: 12,
                maxHealth: 25,
                currentHealth: 25,
              },
              eventTitle: "The Second Wave",
              onVictory: () => ({
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    secondWaveVictory: true,
                  },
                },
                _logMessage: "Your fortifications prove impenetrable! The armored creatures cannot break through your defenses. Your defensive mastery is complete!",
              }),
              onDefeat: () => {
                const currentPopulation = Object.values(state.villagers).reduce(
                  (sum, count) => sum + (count || 0),
                  0,
                );
                const casualties = Math.min(8, currentPopulation);
                const deathResult = killVillagers(state, casualties);
                
                // Damage some fortifications if available
                let buildingDamage = {};
                if (state.buildings.woodenPalisades > 0) {
                  buildingDamage = { woodenPalisades: Math.max(0, state.buildings.woodenPalisades - 1) };
                }
                
                return {
                  ...deathResult,
                  buildings: {
                    ...state.buildings,
                    ...buildingDamage,
                  },
                  _logMessage: `The armored creatures prove more dangerous. ${casualties} villagers fall before the creatures withdraw. ${buildingDamage.woodenPalisades !== undefined ? 'Your fortifications are damaged in the assault.' : 'The attack leaves its mark on your defenses.'}`,
                };
              },
            },
          };
        },
      },
    ],
  },

  finalWave: {
    id: "finalWave",
    condition: (state: GameState) =>
      state.story.seen.secondWave &&
      !state.story.seen.finalWave,
    triggerType: "resource",
    timeProbability: 5, // 5 minutes after second wave
    title: "The Final Wave",
    message:
      "The ground splits open as something massive emerges from the depths. A towering creature of shadow and bone, easily three times the height of a man, leads an army of the twisted beings. Its presence alone makes reality bend and twist. This is the true enemy that was sealed behind the portal - and you have awakened it.",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "lastStand",
        label: "Make your last stand",
        effect: (state: GameState) => {
          const hasSpecialWeapons = state.relics.frostfang && state.relics.blood_scepter;

          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                finalWave: true,
              },
            },
            _combatData: {
              enemy: {
                name: "Shadow Lord",
                attack: 20,
                maxHealth: hasSpecialWeapons ? 40 : 60,
                currentHealth: hasSpecialWeapons ? 40 : 60,
              },
              eventTitle: "The Final Wave",
              hasSpecialWeapons,
              onVictory: () => ({
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    gameCompleted: true,
                  },
                },
                _logMessage: hasSpecialWeapons
                  ? "Armed with the frostfang sword and blood scepter, your champions achieve victory! The shadow lord is destroyed and the portal seals itself. Peace returns to the land!"
                  : "Through incredible courage, your villagers achieve the impossible! The shadow lord is destroyed and the portal seals forever.",
              }),
              onDefeat: () => ({
                story: {
                  ...state.story,
                  seen: {
                    ...state.story.seen,
                    heroicDefeat: true,
                  },
                },
                _logMessage: "Despite valiant efforts, the shadow lord proves too powerful. Your brave villagers' sacrifice weakens it enough to force a retreat, partially sealing the portal.",
              }),
            },
          };
        },
      },
      {
        id: "flee",
        label: "Flee and abandon everything",
        effect: (state: GameState) => {
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          const casualties = Math.floor(currentPopulation * 0.2) + Math.floor(Math.random() * 3);
          const deathResult = killVillagers(state, casualties);

          return {
            ...deathResult,
            resources: {
              wood: 0,
              food: Math.floor(state.resources.food * 0.1),
              stone: 0,
              iron: 0,
              coal: 0,
              steel: 0,
              sulfur: 0,
              bones: 0,
              bone_totem: 0,
              fur: 0,
              leather: 0,
              torch: 0,
              silver: 0,
              gold: 0,
              obsidian: 0,
              adamant: 0,
              moonstone: 0,
              bloodstone: 0,
              frostglas: 0,
              black_powder: 0,
              ember_bomb: 0,
            },
            buildings: {
              woodenHut: 0,
              stoneHut: 0,
              cabin: 0,
              greatCabin: 0,
              timberMill: 0,
              quarry: 0,
              blacksmith: 0,
              foundry: 0,
              tannery: 0,
              clerksHut: 0,
              shallowPit: 0,
              deepeningPit: 0,
              deepPit: 0,
              bottomlessPit: 0,
              altar: 0,
              shrine: 0,
              temple: 0,
              sanctum: 0,
              alchemistHall: 0,
              tradePost: 0,
              bastion: 0,
              watchtower: 0,
              woodenPalisades: 0,
              fortifiedPalisades: 0,
              stoneWall: 0,
              reinforcedWall: 0,
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                finalWave: true,
                totalEvacuation: true,
              },
            },
            _logMessage: `You order a complete evacuation as the shadow lord approaches. ${casualties} villagers are lost during the chaotic retreat, but the survivors flee deep into the wilderness. Your village, your life's work, everything is abandoned to the ancient horror. Perhaps one day, when the creature slumbers again, someone might return to reclaim the land.`,
          };
        },
      },
    ],
  },
};