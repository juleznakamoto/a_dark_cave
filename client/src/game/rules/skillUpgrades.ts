// Centralized skill upgrade configurations and combat tuning shared with combat UI.

// Crushing Strike upgrade configurations (Combat skill from Restless Knight)
export const CRUSHING_STRIKE_UPGRADES = [
  {
    level: 0,
    damage: 10,
    stunRounds: 1,
    successChance: 70,
    cost: 0,
    currency: null,
  },
  {
    level: 1,
    damage: 20,
    stunRounds: 1,
    successChance: 75,
    cost: 250,
    currency: "gold",
  },
  {
    level: 2,
    damage: 30,
    stunRounds: 1,
    successChance: 80,
    cost: 500,
    currency: "gold",
  },
  {
    level: 3,
    damage: 40,
    stunRounds: 2,
    successChance: 85,
    cost: 750,
    currency: "gold",
  },
  {
    level: 4,
    damage: 50,
    stunRounds: 2,
    successChance: 90,
    cost: 1000,
    currency: "gold",
  },
  {
    level: 5,
    damage: 60,
    stunRounds: 3,
    successChance: 95,
    cost: 1500,
    currency: "gold",
  },
];

// Bloodflame Sphere upgrade configurations (Combat skill from Elder Wizard)
export const BLOODFLAME_SPHERE_UPGRADES = [
  {
    level: 0,
    burnDamage: 10,
    burnRounds: 1,
    healthCost: 10,
    cost: 0,
    currency: null,
  },
  {
    level: 1,
    burnDamage: 15,
    burnRounds: 2,
    healthCost: 15,
    cost: 250,
    currency: "gold",
  },
  {
    level: 2,
    burnDamage: 25,
    burnRounds: 2,
    healthCost: 20,
    cost: 500,
    currency: "gold",
  },
  {
    level: 3,
    burnDamage: 30,
    burnRounds: 3,
    healthCost: 25,
    cost: 750,
    currency: "gold",
  },
  {
    level: 4,
    burnDamage: 40,
    burnRounds: 3,
    healthCost: 30,
    cost: 1000,
    currency: "gold",
  },
  {
    level: 5,
    burnDamage: 45,
    burnRounds: 4,
    healthCost: 35,
    cost: 1500,
    currency: "gold",
  },
];

// Poison Arrows (Nightshade Bow combat item — DoT ticks on Fight like Bloodflame)
/** Base poison damage before knowledge bonus (same scaling as bombs: +1 per 5 knowledge). */
export const POISON_ARROWS_BASE_DAMAGE = 15;

/**
 * Extra Fight-resolution ticks after Poison Arrows are applied on use (bloodflame-style DoT).
 * Total poison hits per combat = 1 (on use) + this value.
 */
export const POISON_ARROWS_DOT_FIGHT_ROUNDS = 2;

export function poisonArrowsDamagePerTick(totalKnowledge: number): number {
  return POISON_ARROWS_BASE_DAMAGE + Math.floor(totalKnowledge / 5);
}

/** Per-bomb base damage before knowledge (+1 damage per 5 total knowledge); used when thrown in combat. */
export const BOMB_BASE_DAMAGE_BY_ID = {
  ember_bomb: 15,
  ashfire_bomb: 30,
  void_bomb: 50,
} as const satisfies Record<string, number>;

// Hunting Skill upgrade configurations (from Ashwraith Huntress)
export const HUNTING_SKILL_UPGRADES = [
  { level: 0, huntBonus: 25, food: 0, fur: 0, bones: 0, cost: 0 },
  { level: 1, huntBonus: 50, food: 5, fur: 0, bones: 0, cost: 250 },
  { level: 2, huntBonus: 75, food: 5, fur: 1, bones: 1, cost: 500 },
  { level: 3, huntBonus: 100, food: 10, fur: 1, bones: 1, cost: 750 },
  { level: 4, huntBonus: 125, food: 10, fur: 2, bones: 2, cost: 1000 },
  { level: 5, huntBonus: 150, food: 15, fur: 2, bones: 2, cost: 1500 },
];

// Extract bonuses for use in population calculations
export const HUNTING_SKILL_BONUSES = HUNTING_SKILL_UPGRADES.map((u) => ({
  food: u.food,
  fur: u.fur,
  bones: u.bones,
}));

export const HUNT_BONUSES = HUNTING_SKILL_UPGRADES.map((u) => u.huntBonus);

// Sleep upgrade configurations
export const SLEEP_LENGTH_UPGRADES = [
  { level: 0, hours: 2, cost: 0, currency: null },
  { level: 1, hours: 4, cost: 250, currency: "gold" },
  { level: 2, hours: 6, cost: 500, currency: "gold" },
  { level: 3, hours: 8, cost: 1000, currency: "gold" },
  { level: 4, hours: 10, cost: 1500, currency: "gold" },
  { level: 5, hours: 12, cost: 2000, currency: "gold" },
];

export const SLEEP_INTENSITY_UPGRADES = [
  { level: 0, percentage: 10, cost: 0, currency: null },
  { level: 1, percentage: 12.5, cost: 250, currency: "gold" },
  { level: 2, percentage: 15, cost: 500, currency: "gold" },
  { level: 3, percentage: 17.5, cost: 1000, currency: "gold" },
  { level: 4, percentage: 20, cost: 1500, currency: "gold" },
  { level: 5, percentage: 25, cost: 2000, currency: "gold" },
];

// Disgraced Prior upgrade configurations (fellowship member who auto-executes assigned actions)
// Odd levels (1, 3, 5) add an action slot. Even levels (2, 4) increase the reward multiplier.
export const DISGRACED_PRIOR_UPGRADES = [
  { level: 0, maxActions: 1, rewardMultiplier: 1, cost: 0, currency: null },
  { level: 1, maxActions: 2, rewardMultiplier: 1, cost: 1000, currency: "gold" },
  { level: 2, maxActions: 2, rewardMultiplier: 2.5, cost: 1500, currency: "gold" },
  { level: 3, maxActions: 3, rewardMultiplier: 2.5, cost: 2000, currency: "gold" },
  {
    level: 4,
    maxActions: 3,
    rewardMultiplier: 4,
    cost: 3000,
    currency: "gold",
  },
  {
    level: 5,
    maxActions: 4,
    rewardMultiplier: 4,
    cost: 4000,
    currency: "gold",
  },
];

// Crow's Eye skill upgrade configurations (from One-eyed Crow fellowship member)
// Provides chance to double resources from all gathering actions
export const CROWS_EYE_UPGRADES = [
  { level: 0, doubleChance: 0.5, cost: 0, currency: null },
  { level: 1, doubleChance: 2.5, cost: 500, currency: "gold" },
  { level: 2, doubleChance: 5, cost: 1000, currency: "gold" },
  { level: 3, doubleChance: 7.5, cost: 1500, currency: "gold" },
  { level: 4, doubleChance: 10, cost: 2000, currency: "gold" },
  { level: 5, doubleChance: 15, cost: 2500, currency: "gold" },
];
