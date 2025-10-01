import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalKnowledge } from "./effects";
import { calculateBastionStats } from "../bastionStats";

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: {
    id: "firstWave",
    condition: (state: GameState) =>
      state.flags.portalBlasted && state.story.seen.hasBastion &&
      !state.story.seen.firstWave,
    triggerType: "resource",
    timeProbability: 0.5, // Triggers quickly after portal blast
    title: "The First Wave",
    message:
      "The earth trembles as something ancient stirs in the depths below. Through the shattered portal, twisted creatures begin to emerge - pale, elongated beings with too many joints and eyes like burning coals. They move with unnatural grace toward your village, their alien voices echoing through the caverns.",
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "standAndFight",
        label: "Stand and fight",
        effect: (state: GameState) => {
          const bastionStats = calculateBastionStats(state);
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // First wave enemy stats
          const enemy = {
            attack: 8,
            health: 15,
          };

          // Combat simulation
          let totalVictims = 0;
          let enemyHealth = enemy.health;
          let waveNumber = 1;

          while (enemyHealth > 0) {
            // Enemy attacks first
            if (enemy.attack > bastionStats.defense) {
              const victims = enemy.attack - bastionStats.defense;
              totalVictims += victims;
            }

            // Bastion counterattacks
            enemyHealth -= bastionStats.attack;

            // If enemy dies this wave, no victims for this wave
            if (enemyHealth <= 0) {
              const waveVictims = enemy.attack > bastionStats.defense ? enemy.attack - bastionStats.defense : 0;
              totalVictims -= waveVictims; // Remove victims from the final wave
              break;
            }

            waveNumber++;
          }

          const actualCasualties = Math.min(totalVictims, currentPopulation);

          if (actualCasualties === 0) {
            // Victory - no casualties
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  firstWave: true,
                  firstWaveVictory: true,
                },
              },
              _logMessage:
                `Your defenses hold strong through ${waveNumber} waves of combat! The pale creatures crash against your fortifications but cannot penetrate your defenses. Your bastion's attack of ${bastionStats.attack} proves superior to their health of ${enemy.health}, while your defense of ${bastionStats.defense} protects against their attacks. Victory is yours with no casualties!`,
            };
          } else {
            const deathResult = killVillagers(state, actualCasualties);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  firstWave: true,
                },
              },
              _logMessage: `The battle rages through ${waveNumber} waves of desperate combat. Despite your defenses, the creatures' attack of ${enemy.attack} overwhelms your defense of ${bastionStats.defense} in several waves. ${actualCasualties} villagers fall before your bastion's attack of ${bastionStats.attack} finally destroys the enemy (health: ${enemy.health}). The village is scarred, but the threat has been repelled.`,
            };
          }
        },
      },
      {
        id: "evacuateAndHide",
        label: "Evacuate to the forests",
        effect: (state: GameState) => {
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // Evacuation is safer but costs resources and some buildings
          const casualties = Math.min(
            Math.floor(Math.random() * 3) + 1,
            currentPopulation,
          );
          const deathResult = killVillagers(state, casualties);

          const buildingLoss = Math.min(2, state.buildings.woodenHut);
          const resourceLoss = Math.floor(state.resources.food * 0.6);

          return {
            ...deathResult,
            buildings: {
              ...state.buildings,
              woodenHut: Math.max(0, state.buildings.woodenHut - buildingLoss),
            },
            resources: {
              ...state.resources,
              food: Math.max(0, state.resources.food - resourceLoss),
            },
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWave: true,
                firstWaveEvacuation: true,
              },
            },
            _logMessage: `You order an immediate evacuation to the deep forests. Most villagers escape, but ${casualties} are caught by the creatures during the chaotic retreat. The abandoned village is ransacked - ${buildingLoss} huts are destroyed and ${resourceLoss} food is lost. You'll have to rebuild when it's safe to return.`,
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
        id: "fortifiedDefense",
        label: "Use fortifications",
        effect: (state: GameState) => {
          const bastionStats = calculateBastionStats(state);
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // Second wave enemy stats - stronger than first wave
          const enemy = {
            attack: 12,
            health: 25,
          };

          // Combat simulation
          let totalVictims = 0;
          let enemyHealth = enemy.health;
          let waveNumber = 1;

          while (enemyHealth > 0) {
            // Enemy attacks first
            if (enemy.attack > bastionStats.defense) {
              const victims = enemy.attack - bastionStats.defense;
              totalVictims += victims;
            }

            // Bastion counterattacks
            enemyHealth -= bastionStats.attack;

            // If enemy dies this wave, no victims for this wave
            if (enemyHealth <= 0) {
              const waveVictims = enemy.attack > bastionStats.defense ? enemy.attack - bastionStats.defense : 0;
              totalVictims -= waveVictims; // Remove victims from the final wave
              break;
            }

            waveNumber++;
          }

          const actualCasualties = Math.min(totalVictims, currentPopulation);

          if (actualCasualties === 0) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  secondWave: true,
                  secondWaveVictory: true,
                },
              },
              _logMessage:
                `Your fortifications prove impenetrable! Through ${waveNumber} waves of combat, the armored creatures cannot break through your defense of ${bastionStats.defense} against their attack of ${enemy.attack}. Your bastion's attack of ${bastionStats.attack} systematically destroys their forces (health: ${enemy.health}) with zero casualties. Your defensive mastery is complete!`,
            };
          } else {
            const deathResult = killVillagers(state, actualCasualties);

            // Damage some fortifications if casualties are high
            let buildingDamage = {};
            if (actualCasualties > 10 && state.buildings.palisades > 0) {
              buildingDamage = { palisades: Math.max(0, state.buildings.palisades - 1) };
            }

            return {
              ...deathResult,
              buildings: {
                ...state.buildings,
                ...buildingDamage,
              },
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  secondWave: true,
                },
              },
              _logMessage: `The armored creatures prove more dangerous, battling through ${waveNumber} waves. Their attack of ${enemy.attack} repeatedly breaches your defense of ${bastionStats.defense}, causing ${actualCasualties} casualties before your attack of ${bastionStats.attack} finally destroys them (health: ${enemy.health}). ${buildingDamage.palisades !== undefined ? 'Your fortifications are damaged in the prolonged assault.' : 'Your fortifications hold despite the losses.'}`,
            };
          }
        },
      },
      {
        id: "magicalDefense",
        label: "Use magical artifacts",
        effect: (state: GameState) => {
          const knowledge = getTotalKnowledge(state);
          const magicalItems = Object.values(state.relics).filter(Boolean).length;

          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // 20% base + 2% per knowledge + 5% per magical item
          const successChance = 0.2 + knowledge * 0.02 + magicalItems * 0.05;
          const rand = Math.random();

          if (rand < successChance && currentPopulation > 0) {
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  secondWave: true,
                  secondWaveMagicalVictory: true,
                },
              },
              _logMessage:
                "The ancient relics and magical artifacts respond to the otherworldly threat. Dark energies clash as your mystical defenses create barriers of force and unleash eldritch counterattacks. The armored creatures are driven back by powers they cannot comprehend.",
            };
          } else {
            const casualties = Math.min(
              Math.floor(currentPopulation * 0.3) + Math.floor(Math.random() * 4) + 2,
              currentPopulation,
            );
            const deathResult = killVillagers(state, casualties);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  secondWave: true,
                },
              },
              stats: {
                ...state.stats,
                madness: (state.stats.madness || 0) + 5,
              },
              _logMessage: `Your magical artifacts unleash chaotic energies, but the creatures' own dark power corrupts the spells. ${casualties} villagers are caught in the magical backlash, and those who survive are left traumatized by witnessing forces beyond mortal comprehension.`,
            };
          }
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