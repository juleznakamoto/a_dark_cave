import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const storyEvents: Record<string, GameEvent> = {
  foodGone: {
    id: "foodGone",
    condition: (state: GameState) => state.resources.food > 50,
    triggerType: "resource",
    timeProbability: 20,
    repeatable: true,
    message: [
      "Food is missing. Villagers speak of voices in the dark.",
      "By morning, the stores are lighter. Something was here.",
    ],
    triggered: false,
    priority: 2,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    effect: (state: GameState) => ({
      resources: {
        ...state.resources,
        food:
          state.resources.food -
          Math.min(
            state.resources.food,
            Math.ceil(
              Math.random() *
                (50 * state.buildings.woodenHut +
                  100 * state.buildings.stoneHut),
            ),
          ),
      },
    }),
  },

  alchemistArrives: {
    id: "alchemistArrives",
    condition: (state: GameState) =>
      state.story.seen.firstWaveVictory &&
      state.buildings.alchemistHall >= 1 &&
      !state.story.seen.alchemistArrives,
    triggerType: "time",
    timeProbability: 0.02,
    title: "The Alchemist's Discovery",
    message:
      "The alchemist emerges from his hall: 'I have been conducting experiments day and night,' holding a vial of shimmering dust. 'I've created something extraordinary and terribly dangerous.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          alchemistArrives: true,
          canMakeAshfireDust: true,
        },
      },
    }),
  },

  wizardArrives: {
    id: "wizardArrives",
    condition: (state: GameState) =>
      state.buildings.bastion >= 1 && !state.story.seen.wizardArrives,
    triggerType: "resource",
    timeProbability: 0.5,
    message:
      "A small old man with a long grey beard in a weathered grey coat approaches the settlement. His eyes gleam with ancient wisdom and power. 'I am a wizard,' he declares in a voice echoing with arcane authority. 'Build me a tower, and I shall aid you with powers beyond mortal ken.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardArrives: true,
        },
      },
    }),
  },

  wizardNecromancerCastle: {
    id: "wizardNecromancerCastle",
    condition: (state: GameState) =>
      state.buildings.wizardTower >= 1 &&
      !state.story.seen.wizardNecromancerCastle,
    triggerType: "resource",
    timeProbability: 1.0,
    title: "The Necromancer's Castle",
    message:
      "The wizard calls you to his tower: 'I have learned of a castle deep in the wilderness, the former domain of a long-dead necromancer. Within its walls lie ancient scrolls that speak of how we can defeat what dwells in the depths of the cave.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardNecromancerCastle: true,
        },
      },
    }),
  },

  wizardDecryptsScrolls: {
    id: "wizardDecryptsScrolls",
    condition: (state: GameState) =>
      state.relics.ancient_scrolls &&
      state.buildings.wizardTower >= 1 &&
      !state.story.seen.wizardDecryptsScrolls,
    triggerType: "resource",
    timeProbability: 0.5,
    title: "Ancient Knowledge",
    message:
      "The wizard steps from his tower, 'I have decrypted the ancient scrolls,' he says. 'The creatures below can only be slain with weapons of great power: a sword of frostglass and a staff crowned with bloodstone. 'Deep in the forest lies the grave of an ancient king which treasures may hold the frostglass we need.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      relics: {
        ...state.relics,
        ancient_scrolls: false,
      },
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardDecryptsScrolls: true,
          wizardHillGrave: true,
        },
      },
    }),
  },

  wizardFrostglassSword: {
    id: "wizardFrostglassSword",
    condition: (state: GameState) =>
      state.story.seen.hillGraveExplored &&
      state.relics.frostglass &&
      state.buildings.blacksmith >= 1 &&
      state.buildings.grandBlacksmith === 0 &&
      !state.story.seen.wizardFrostglassSword,
    triggerType: "resource",
    timeProbability: 0.5,
    message:
      "The wizard spots the frostglass found at the hill grave: 'You have found it,' he says. 'But our blacksmith lacks the tools to shape such a material. We must build a better one, only then can the Frostglass Sword be crafted.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardFrostglassSword: true,
        },
      },
    }),
  },

  wizardBloodstone: {
    id: "wizardBloodstone",
    condition: (state: GameState) =>
      state.weapons.frostglass_sword && !state.story.seen.wizardBloodstone,
    triggerType: "resource",
    timeProbability: 0.01,
    title: "The Sunken Temple",
    message:
      "The wizard returns from a journey into the forest. 'I have consulted with an old friend, a hermit wizard who dwells deep in the woods,' he says gravely. 'He spoke of the bloodstone we need. It lies within the Sunken Temple, an ancient shrine now half-drowned in the swamps of the forest.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardBloodstone: true,
        },
      },
    }),
  },

  wizardBloodstoneStaff: {
    id: "wizardBloodstoneStaff",
    condition: (state: GameState) =>
      state.story.seen.sunkenTempleSuccess &&
      !state.story.seen.wizardBloodstoneStaff,
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Bloodstone Staff",
    message:
      "The wizard examines the bloodstone gems you've retrieved from the Sunken Temple. 'With these bloodstones, we now have everything we need. Now we can craft the Bloodstone Staff. Together with the Frostglass Sword, we will have the means to face the darkness that lurks below.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardBloodstoneStaff: true,
        },
      },
    }),
  },

  wizardReadyForBattle: {
    id: "wizardReadyForBattle",
    condition: (state: GameState) =>
      state.weapons.bloodstone_staff &&
      state.weapons.frostglass_sword &&
      !state.story.seen.wizardReadyForBattle,
    triggerType: "resource",
    timeProbability: 0.5,
    title: "The Final Preparation",
    message:
      "The wizard stands at the entrance to his tower, 'The weapons are forged. We now possess what we need to stand against the creatures of the depths of the cave. The darkness below will soon learn that this village will not fall without a fight. We are ready.'",
    triggered: false,
    priority: 5,
    visualEffect: {
      type: "glow",
      duration: 2,
    },
    repeatable: true,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardReadyForBattle: true,
        },
      },
    }),
  },

  encounterBeyondPortal: {
    id: "encounterBeyondPortal",
    condition: (state: GameState) =>
      state.story.seen.encounteredBeyondPortal &&
      !state.story.seen.encounteredCreaturesChoice,
    triggerType: "resource",
    timeProbability: 0.01,
    title: "The Dwellers Below",
    message:
      "In the depths beyond the shattered portal, you find some creatures that don't attack. Their forms are vaguely human, twisted by generations in darkness. They gesture, attempting to communicate through broken words and signs.",
    triggered: false,
    priority: 5,
    repeatable: true,
    choices: [
      {
        id: "slaughter_creatures",
        label: "Slaughter them",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                slaughteredCreatures: true,
                encounteredCreaturesChoice: true,
              },
            },
            _logMessage:
              "You cut them down without mercy. Their cries echo through the caverns as they fall.",
          };
        },
      },
      {
        id: "attempt_communication",
        label: "Try to communicate",
        effect: (state: GameState) => {
          return {
            story: {
              ...state.story,
              seen: {
                ...state.story.seen,
                communicatedWithCreatures: true,
                encounteredCreaturesChoice: true,
              },
            },
            _logMessage:
              "You lower your weapons and attempt to understand them. Through gestures and broken words, they share fragments of their history leaving you speechless.",
          };
        },
      },
    ],
  },
};
