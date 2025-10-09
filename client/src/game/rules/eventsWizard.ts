
import { GameEvent } from "./events";
import { GameState } from "@shared/schema";

export const wizardEvents: Record<string, GameEvent> = {
  wizardArrives: {
    id: "wizardArrives",
    condition: (state: GameState) =>
      state.buildings.bastion >= 1 &&
      !state.story.seen.wizardArrives,
    triggerType: "resource",
    timeProbability: 2.0,
    message:
      "A small old man with a long grey beard, draped in a weathered grey coat, approaches your settlement. His eyes gleam with ancient wisdom and power. 'I am a wizard,' he declares in a voice that echoes with arcane authority. 'Build me a tower, and I shall aid you with powers beyond mortal ken.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
      "The wizard calls you to his tower, his expression grave. 'I have learned of a castle deep in the wilderness - the former domain of a long-dead necromancer. Within its walls lie ancient scrolls that speak of what dwells in the depths below. These texts may hold the key to understanding and defeating the darkness that threatens us all. The journey will be perilous, but the knowledge is essential.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
    message:
      "The wizard emerges from his tower, his eyes blazing with newfound knowledge. 'I have decrypted the ancient scrolls. The creatures in the depths can only be defeated with weapons of extraordinary power - a sword forged from frostglas, and a staff crowned with a bloodstone. Without these, we will not stand a chance against the ancient evil below. I have to figure out how to find those items.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
        },
      },
    }),
  },

  wizardHillGrave: {
    id: "wizardHillGrave",
    condition: (state: GameState) =>
      state.story.seen.wizardDecryptsScrolls &&
      !state.story.seen.wizardHillGrave,
    triggerType: "resource",
    timeProbability: 1.0,
    title: "The Hill Grave",
    message:
      "The wizard summons you to his tower with urgency. 'I have found something in ancient texts,' he says, his eyes gleaming. 'Deep in the forest lies a hill grave, burial site of an old king from forgotten times. Among his treasures may some frostglas - the very material we need. But beware - the grave is protected by deadly traps laid by those who buried him.'",
    triggered: false,
    priority: 5,
    repeatable: false,
    effect: (state: GameState) => ({
      story: {
        ...state.story,
        seen: {
          ...state.story.seen,
          wizardHillGrave: true,
        },
      },
    }),
  },

  wizardFrostglassSword: {
    id: "wizardFrostglassSword",
    condition: (state: GameState) =>
      state.story.seen.hillGraveSuccess &&
      state.resources.frostglas >= 50 &&
      state.buildings.blacksmith >= 1 &&
      state.buildings.grandBlacksmith === 0 &&
      !state.story.seen.wizardFrostglassSword,
    triggerType: "resource",
    timeProbability: 0.5,
    message:
      "The wizard summons you to his tower. 'You have found the frostglas we need,' he declares, 'but your current blacksmith lacks the tools to forge it properly. We need build a better blacksmith. Only then can we create the Frostglass Sword needed to defeat the darkness below.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
      state.weapons.frostglass_sword &&
      !state.story.seen.wizardBloodstone,
    triggerType: "resource",
    timeProbability: 1.0,
    title: "The Sunken Temple",
    message:
      "The wizard returns from a journey into the forest, his robes muddy and worn. 'I have consulted with an old friend, a hermit wizard who dwells deep in the woods,' he says gravely. 'He spoke of the bloodstone we need - it lies within the Sunken Temple, an ancient shrine now half-drowned in the swamps of the forest. The journey will be treacherous, but the bloodstone is essential for crafting the staff we need.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
      "The wizard examines the bloodstone gems you've retrieved from the Sunken Temple, his eyes gleaming with satisfaction. 'Excellent work,' he declares. 'With these bloodstones, we now have everything we need. I can craft the Bloodstone Staff - a weapon of immense arcane power that will channel knowledge and strength. Together with the Frostglass Sword, we will have the means to face the darkness that lurks below.'",
    triggered: false,
    priority: 5,
    repeatable: false,
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
};
