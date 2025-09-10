import { Action } from '@shared/schema';

export const gameActions: Record<string, Action> = {
  lightFire: {
    id: 'lightFire',
    label: 'Light Fire',
    description: 'You have some dry wood and kindling. A fire would provide warmth and light.',
    requirements: {
      'flags.fireLit': false,
    },
    effects: {
      'flags.fireLit': true,
      'story.seen.fireLit': true,
    },
    cooldown: 1, // 1 second cooldown
  },
  
  gatherWood: {
    id: 'gatherWood',
    label: 'Gather Wood',
    description: 'Search the cave for fallen branches and dry wood to keep the fire burning.',
    requirements: {
      'flags.fireLit': true,
    },
    effects: {
      'resources.wood': '+1-3', // Random amount
    },
    cooldown: 1, // 5 second cooldown
  },
  
  buildTorch: {
    id: 'buildTorch',
    label: 'Build Torch',
    description: 'Create a torch to explore deeper into the cave.',
    requirements: {
      'flags.fireLit': true,
      'resources.wood': 10,
    },
    effects: {
      'resources.wood': -10,
      'resources.torch': '+1',
    },
    unlocks: ['exploreDeeper'],
    cooldown: 10, // 10 second cooldown
  },
  
  buildHut: {
    id: 'buildHut',
    label: 'Build Hut',
    description: 'Construct a simple wooden hut for shelter.',
    requirements: {
      'flags.villageUnlocked': true,
      'resources.wood': 50,
    },
    effects: {
      'resources.wood': -50,
      'buildings.huts': '+1',
    },
    cooldown: 30, // 30 second cooldown
  },

  exploreCave: {
    id: 'exploreCave',
    label: 'Explore Cave',
    description: 'Venture deeper into the cave with torches to light the way.',
    requirements: {
      'flags.fireLit': true,
      'resources.torch': 5,
    },
    effects: {
      'resources.torch': -5,
      'flags.caveExplored': true,
    },
    cooldown: 15, // 15 second cooldown
  },

  craftAxe: {
    id: 'craftAxe',
    label: 'Craft Axe',
    description: 'Create a sturdy axe from wood and stone to gather resources more efficiently.',
    requirements: {
      'flags.fireLit': true,
      'resources.wood': 5,
      'resources.stone': 10,
    },
    effects: {
      'resources.wood': -5,
      'resources.stone': -10,
      'tools.axe': true,
    },
    cooldown: 20, // 20 second cooldown
  },
};

export const gameTexts = {
  cave: {
    initial: 'A dark cave. The air is cold and stale. You can barely make out the shapes around you.',
    fireLit: 'The fire crackles softly, casting dancing shadows on the cave walls. The warmth is comforting.',
  },
  village: {
    initial: 'Outside the cave, a small clearing opens up. This could be the foundation of something greater.',
  },
  world: {
    initial: 'Beyond the village lies a vast world waiting to be explored...',
  },
  hints: {},
};
