
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'exploration' | 'combat' | 'building' | 'resources' | 'story' | 'mastery';
  requirement: (state: any) => boolean;
  hidden?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Exploration
  {
    id: 'first_light',
    title: 'First Light',
    description: 'Light the fire in the cave',
    icon: '🔥',
    category: 'exploration',
    requirement: (state) => state.flags.hasLitFire,
  },
  {
    id: 'village_founder',
    title: 'Village Founder',
    description: 'Unlock the village',
    icon: '🏘️',
    category: 'exploration',
    requirement: (state) => state.flags.villageUnlocked,
  },
  {
    id: 'forest_explorer',
    title: 'Forest Explorer',
    description: 'Unlock the forest',
    icon: '🌲',
    category: 'exploration',
    requirement: (state) => state.flags.forestUnlocked,
  },
  {
    id: 'bastion_discoverer',
    title: 'Bastion Discoverer',
    description: 'Unlock the bastion',
    icon: '🏰',
    category: 'exploration',
    requirement: (state) => state.flags.bastionUnlocked,
  },

  // Resources
  {
    id: 'wood_gatherer',
    title: 'Wood Gatherer',
    description: 'Collect 100 wood',
    icon: '🪵',
    category: 'resources',
    requirement: (state) => state.resources.wood >= 100,
  },
  {
    id: 'lumber_baron',
    title: 'Lumber Baron',
    description: 'Collect 1000 wood',
    icon: '🌳',
    category: 'resources',
    requirement: (state) => state.resources.wood >= 1000,
  },
  {
    id: 'meat_hunter',
    title: 'Meat Hunter',
    description: 'Collect 50 meat',
    icon: '🥩',
    category: 'resources',
    requirement: (state) => state.resources.meat >= 50,
  },
  {
    id: 'master_hunter',
    title: 'Master Hunter',
    description: 'Collect 500 meat',
    icon: '🦌',
    category: 'resources',
    requirement: (state) => state.resources.meat >= 500,
  },

  // Building
  {
    id: 'first_home',
    title: 'First Home',
    description: 'Build your first wooden hut',
    icon: '🏚️',
    category: 'building',
    requirement: (state) => state.buildings.woodenHut >= 1,
  },
  {
    id: 'village_builder',
    title: 'Village Builder',
    description: 'Build 10 wooden huts',
    icon: '🏘️',
    category: 'building',
    requirement: (state) => state.buildings.woodenHut >= 10,
  },
  {
    id: 'stone_mason',
    title: 'Stone Mason',
    description: 'Build your first stone hut',
    icon: '🏛️',
    category: 'building',
    requirement: (state) => state.buildings.stoneHut >= 1,
  },
  {
    id: 'city_planner',
    title: 'City Planner',
    description: 'Build 5 stone huts',
    icon: '🏙️',
    category: 'building',
    requirement: (state) => state.buildings.stoneHut >= 5,
  },

  // Combat
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Win your first combat',
    icon: '⚔️',
    category: 'combat',
    requirement: (state) => state.stats.combatsWon >= 1,
  },
  {
    id: 'warrior',
    title: 'Warrior',
    description: 'Win 10 combats',
    icon: '🛡️',
    category: 'combat',
    requirement: (state) => state.stats.combatsWon >= 10,
  },
  {
    id: 'champion',
    title: 'Champion',
    description: 'Win 50 combats',
    icon: '👑',
    category: 'combat',
    requirement: (state) => state.stats.combatsWon >= 50,
  },

  // Story
  {
    id: 'curious_mind',
    title: 'Curious Mind',
    description: 'Complete your first event',
    icon: '📖',
    category: 'story',
    requirement: (state) => Object.keys(state.events).length >= 1,
  },
  {
    id: 'story_seeker',
    title: 'Story Seeker',
    description: 'Complete 25 events',
    icon: '📚',
    category: 'story',
    requirement: (state) => Object.keys(state.events).length >= 25,
  },

  // Mastery
  {
    id: 'population_boom',
    title: 'Population Boom',
    description: 'Reach 50 population',
    icon: '👥',
    category: 'mastery',
    requirement: (state) => state.population >= 50,
  },
  {
    id: 'thriving_civilization',
    title: 'Thriving Civilization',
    description: 'Reach 100 population',
    icon: '🌟',
    category: 'mastery',
    requirement: (state) => state.population >= 100,
  },
  {
    id: 'click_master',
    title: 'Click Master',
    description: 'Click 1000 times',
    icon: '👆',
    category: 'mastery',
    requirement: (state) => state.stats.totalClicks >= 1000,
  },
  {
    id: 'dedicated_clicker',
    title: 'Dedicated Clicker',
    description: 'Click 10000 times',
    icon: '💪',
    category: 'mastery',
    requirement: (state) => state.stats.totalClicks >= 10000,
  },
];

export function getAchievementProgress(achievement: Achievement, state: any): number {
  try {
    return achievement.requirement(state) ? 100 : 0;
  } catch {
    return 0;
  }
}

export function getCategoryColor(category: Achievement['category']): string {
  switch (category) {
    case 'exploration':
      return 'text-blue-400';
    case 'combat':
      return 'text-red-400';
    case 'building':
      return 'text-amber-400';
    case 'resources':
      return 'text-green-400';
    case 'story':
      return 'text-purple-400';
    case 'mastery':
      return 'text-yellow-400';
    default:
      return 'text-gray-400';
  }
}

export function getCategoryName(category: Achievement['category']): string {
  switch (category) {
    case 'exploration':
      return 'Exploration';
    case 'combat':
      return 'Combat';
    case 'building':
      return 'Building';
    case 'resources':
      return 'Resources';
    case 'story':
      return 'Story';
    case 'mastery':
      return 'Mastery';
    default:
      return 'Unknown';
  }
}
