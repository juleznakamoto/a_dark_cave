
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";

const FIRST_WAVE_MESSAGE = 
  "The earth shudders as pale, jointed figures creep from the cave. Their ember eyes pierce the dark, voices scraping the air as they advance.";

const SECOND_WAVE_MESSAGE = 
  "The creatures return in greater number, clad in crude bone and carrying weapons that throb with foul light.";

const THIRD_WAVE_MESSAGE = 
  "A roar erupts from the cave, shaking the stone itself. From the cave thunder hulking brutes, their massive bone weapons cracking the ground with each step.";

const FOURTH_WAVE_MESSAGE = 
  "The sky blackens as winged horrors descend. From the cave surge armored fiends, the assault now striking from earth and air alike.";

const FIFTH_WAVE_MESSAGE = 
  "From the cave emerges a colossal shadow, its form unspeakable, its presence suffocating as he marches towards the city.";

function create_defeat_message(dead_villagers: int, watchtower_destroyed: bool, ): string =>
  
  "The creatures overwhelm your defenses. Villagers fall before the remaining creatures retreat to the depths."

return msg

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: {
    id: "firstWave",
    condition: (state: GameState) =>
      state.flags.portalBlasted && state.story.seen.hasBastion,
    // &!!state.story.seen.firstWave,
    triggerType: "resource",
    timeProbability: 0.05,
    title: "The First Wave",
    message: FIRST_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
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
            attack: [120, 150, 180][Math.floor(Math.random() * 3)],
            maxHealth: 100,
            currentHealth: 100,
          },
          eventTitle: "The First Wave",
          eventMessage: FIRST_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                firstWaveVictory: true,
              },
            },
            _logMessage:
              "Your defenses hold strong! The pale creatures crash against your fortifications but cannot penetrate your defenses. Victory is yours!",
          }),
          onDefeat: () => {
            const currentPopulation = Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const casualties = Math.min(5, currentPopulation);
            const deathResult = killVillagers(state, casualties);

            // Damage watchtower if available
            let buildingDamage = {};
            if (state.buildings.watchtower > 0) {
              buildingDamage = {
                watchtowerDamaged: true,
              };
            }

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  ...buildingDamage,
                },
              },
              _logMessage: `The pale creatures overwhelm your defenses. ${casualties} villagers fall before the remaining creatures retreat to the depths.${buildingDamage.watchtowerDamaged ? " Your watchtower is damaged in the assault." : ""}`,
            };
          },
        },
      };
    },
  },

  secondWave: {
    id: "secondWave",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory && !state.story.seen.secondWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Second Wave",
    message: SECOND_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
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
            attack: [15, 18, 21][Math.floor(Math.random() * 3)],
            maxHealth: 150,
            currentHealth: 150,
          },
          eventTitle: "The Second Wave",
          eventMessage: SECOND_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                secondWaveVictory: true,
              },
            },
            _logMessage:
              "Your fortifications prove impenetrable! The armored creatures cannot break through your defenses. Another victory!",
          }),
          onDefeat: () => {
            const currentPopulation = Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const casualties = Math.min(8, currentPopulation);
            const deathResult = killVillagers(state, casualties);

            // Damage palisades if available
            let buildingDamage = {};
            if (state.buildings.palisades > 0) {
              buildingDamage = {
                palisadesDamaged: true,
              };
            }

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  ...buildingDamage,
                },
              },
              _logMessage: `The armored creatures prove more dangerous. ${casualties} villagers fall before the creatures withdraw.${buildingDamage.palisadesDamaged ? " Your palisades are damaged in the assault." : ""}`,
            };
          },
        },
      };
    },
  },

  thirdWave: {
    id: "thirdWave",
    condition: (state: GameState) =>
      state.story.seen.secondWaveVictory && !state.story.seen.thirdWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Third Wave",
    message: THIRD_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            thirdWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Brute Horde",
            attack: [18, 22, 25][Math.floor(Math.random() * 3)],
            maxHealth: 200,
            currentHealth: 200,
          },
          eventTitle: "The Third Wave",
          eventMessage: THIRD_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                thirdWaveVictory: true,
              },
            },
            _logMessage:
              "Against all odds, your defenses hold! The brute horde crashes against your walls but cannot breach them. Your victory inspires the survivors!",
          }),
          onDefeat: () => {
            const currentPopulation = Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const casualties = Math.min(12, currentPopulation);
            const deathResult = killVillagers(state, casualties);

            // Damage bastion if available
            let buildingDamage = {};
            if (state.buildings.bastion > 0) {
              buildingDamage = {
                bastionDamaged: true,
              };
            }

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  ...buildingDamage,
                },
              },
              _logMessage: `The brute horde breaks through! ${casualties} villagers are lost in the chaos.${buildingDamage.bastionDamaged ? " Your bastion suffers critical damage." : ""}`,
            };
          },
        },
      };
    },
  },

  fourthWave: {
    id: "fourthWave",
    condition: (state: GameState) =>
      state.story.seen.thirdWaveVictory && !state.story.seen.fourthWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Fourth Wave",
    message: FOURTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => {
      return {
        story: {
          ...state.story,
          seen: {
            ...state.story.seen,
            fourthWave: true,
          },
        },
        _combatData: {
          enemy: {
            name: "Sky Terror Legion",
            attack: [22, 26, 30][Math.floor(Math.random() * 3)],
            maxHealth: 250,
            currentHealth: 250,
          },
          eventTitle: "The Fourth Wave",
          eventMessage: FOURTH_WAVE_MESSAGE,
          onVictory: () => ({
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fourthWaveVictory: true,
              },
            },
            _logMessage:
              "Your warriors fight with legendary prowess! Despite the aerial assault, your defenses repel the combined attack. One more wave remains...",
          }),
          onDefeat: () => {
            const currentPopulation = Object.values(state.villagers).reduce(
              (sum, count) => sum + (count || 0),
              0,
            );
            const casualties = Math.min(15, currentPopulation);
            const deathResult = killVillagers(state, casualties);

            // Damage multiple buildings
            let buildingDamage = {};
            const damages = [];
            
            if (state.buildings.watchtower > 0 && !state.story.seen.watchtowerDamaged) {
              buildingDamage = { ...buildingDamage, watchtowerDamaged: true };
              damages.push("watchtower");
            }
            if (state.buildings.bastion > 0 && !state.story.seen.bastionDamaged) {
              buildingDamage = { ...buildingDamage, bastionDamaged: true };
              damages.push("bastion");
            }

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  ...buildingDamage,
                },
              },
              _logMessage: `The coordinated assault is devastating. ${casualties} villagers perish in the attack.${damages.length > 0 ? ` Your ${damages.join(" and ")} suffer severe damage.` : ""}`,
            };
          },
        },
      };
    },
  },

  fifthWave: {
    id: "fifthWave",
    condition: (state: GameState) =>
      state.story.seen.fourthWaveVictory && !state.story.seen.fifthWave,
    triggerType: "resource",
    timeProbability: 5,
    title: "The Final Wave",
    message: FIFTH_WAVE_MESSAGE,
    triggered: false,
    priority: 5,
    repeatable: false,
    choices: [
      {
        id: "lastStand",
        label: "Make your last stand",
        effect: (state: GameState) => {
          const hasSpecialWeapons =
            state.relics.frostfang && state.relics.blood_scepter;

          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fifthWave: true,
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
              eventMessage: FIFTH_WAVE_MESSAGE,
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
                _logMessage:
                  "Despite valiant efforts, the shadow lord proves too powerful. Your brave villagers' sacrifice weakens it enough to force a retreat, partially sealing the portal.",
              }),
            },
          };
        },
      },
      {
        id: "flee",
        label: "Flee and abandon the fight",
        effect: (state: GameState) => {
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          const casualties = Math.min(20, currentPopulation);
          const deathResult = killVillagers(state, casualties);

          // Damage multiple buildings
          let buildingDamage = {};
          const damages = [];
          
          if (state.buildings.bastion > 0 && !state.story.seen.bastionDamaged) {
            buildingDamage = { ...buildingDamage, bastionDamaged: true };
            damages.push("bastion");
          }
          if (state.buildings.watchtower > 0 && !state.story.seen.watchtowerDamaged) {
            buildingDamage = { ...buildingDamage, watchtowerDamaged: true };
            damages.push("watchtower");
          }
          if (state.buildings.palisades > 0 && !state.story.seen.palisadesDamaged) {
            buildingDamage = { ...buildingDamage, palisadesDamaged: true };
            damages.push("palisades");
          }

          return {
            ...deathResult,
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                fifthWave: true,
                ...buildingDamage,
              },
            },
            _logMessage: `You order a retreat as the shadow lord approaches. ${casualties} villagers fall during the chaotic withdrawal. The creature rampages through your defenses unchallenged.${damages.length > 0 ? ` Your ${damages.join(", ")} are destroyed in the rampage.` : ""} The shadow lord returns to the depths, sated for now.`,
          };
        },
      },
    ],
  },
};
