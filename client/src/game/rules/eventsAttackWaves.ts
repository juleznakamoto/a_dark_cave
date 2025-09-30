
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";
import { killVillagers } from "@/game/stateHelpers";
import { getTotalStrength, getTotalKnowledge } from "./effects";

export const attackWaveEvents: Record<string, GameEvent> = {
  firstWave: {
    id: "firstWave",
    condition: (state: GameState) =>
      state.flags.portalBlasted &&
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
          const strength = getTotalStrength(state);
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // Base 30% success chance + 2% per strength point
          const successChance = 0.3 + strength * 0.02;
          const rand = Math.random();

          if (rand < successChance && currentPopulation > 0) {
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
                "Your villagers fight with desperate courage, using every weapon and fortification at their disposal. Against all odds, they manage to repel the first wave of creatures, their alien blood staining the village grounds. The victory gives hope, but everyone knows this is just the beginning.",
            };
          } else {
            // Defeat - heavy casualties
            const casualties = Math.min(
              Math.floor(currentPopulation * 0.4) + Math.floor(Math.random() * 5) + 3,
              currentPopulation,
            );
            const deathResult = killVillagers(state, casualties);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  firstWave: true,
                },
              },
              _logMessage: `The pale creatures overwhelm your defenses with their supernatural speed and strength. ${casualties} villagers fall to their razor-sharp claws and burning touch before the remaining survivors manage to drive them back. The village is scarred, but the threat has only begun.`,
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
          const strength = getTotalStrength(state);
          const palisadesLevel = state.buildings.palisades || 0;
          const fortificationBonus = 
            palisadesLevel * 15 + // Each level provides 15 points
            (state.buildings.bastion || 0) * 50;

          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          // 25% base + 1.5% per strength + fortification bonus
          const successChance = 0.25 + strength * 0.015 + fortificationBonus * 0.01;
          const rand = Math.random();

          if (rand < successChance && currentPopulation > 0) {
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
                "Your fortifications prove their worth as the armored creatures crash against stone walls and wooden palisades. The defensive structures channel the attackers into kill zones where your villagers can strike effectively. After hours of brutal combat, the second wave is repelled.",
            };
          } else {
            const casualties = Math.min(
              Math.floor(currentPopulation * 0.5) + Math.floor(Math.random() * 6) + 4,
              currentPopulation,
            );
            const deathResult = killVillagers(state, casualties);

            // Damage some fortifications
            let buildingDamage = {};
            if (state.buildings.palisades > 0) {
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
              _logMessage: `The armored creatures prove more cunning than expected, finding weak points in your defenses. ${casualties} villagers die in the prolonged battle, and your fortifications are severely damaged. The creatures retreat, but they're learning your tactics.`,
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
          const strength = getTotalStrength(state);
          const knowledge = getTotalKnowledge(state);
          const magicalItems = Object.values(state.relics).filter(Boolean).length;
          const hasSpecialWeapons = state.relics.frostfang && state.relics.blood_scepter;
          
          const currentPopulation = Object.values(state.villagers).reduce(
            (sum, count) => sum + (count || 0),
            0,
          );

          let successChance = 0.1 + strength * 0.01 + knowledge * 0.01 + magicalItems * 0.02;
          
          // Special weapons from wizard's prophecy provide significant bonus
          if (hasSpecialWeapons) {
            successChance += 0.4; // +40% chance with both special weapons
          }

          const rand = Math.random();

          if (rand < successChance && currentPopulation > 0) {
            // Epic victory
            return {
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  finalWave: true,
                  gameCompleted: true,
                },
              },
              _logMessage: hasSpecialWeapons 
                ? "Armed with the frostfang sword and blood scepter, as foretold by the ancient scrolls, your champions face the towering horror. The weapons blaze with otherworldly power, cutting through the creature's defenses. After an epic battle that shakes the very foundations of reality, the shadow lord falls. The portal seals itself, and peace returns to the land. You have achieved the impossible - victory against the ancient evil."
                : "Through incredible courage, sacrifice, and perhaps divine intervention, your villagers achieve the impossible. The towering creature falls after a battle that costs everything, but the portal seals and the threat ends. Your village has saved the world, though few will ever know the price that was paid.",
            };
          } else {
            // Heroic defeat
            const survivors = Math.max(0, Math.floor(currentPopulation * 0.1));
            const casualties = currentPopulation - survivors;
            const deathResult = killVillagers(state, casualties);

            return {
              ...deathResult,
              story: {
                ...state.story,
                seen: {
                  ...state.story.seen,
                  finalWave: true,
                  heroicDefeat: true,
                },
              },
              _logMessage: `The final battle rages for hours as your villagers give everything they have. ${casualties} brave souls fall defending their home, but their sacrifice is not in vain. Though the creature cannot be destroyed, it is weakened enough that it retreats back through the portal, which partially seals itself. ${survivors} villagers survive to tell the tale of incredible heroism in the face of cosmic horror.`,
            };
          }
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
