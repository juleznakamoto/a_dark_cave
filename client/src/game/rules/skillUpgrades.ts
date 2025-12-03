
// Centralized skill upgrade configurations

// Crushing Strike upgrade configurations (Combat skill from Restless Knight)
export const CRUSHING_STRIKE_UPGRADES = [
  { level: 0, damage: 10, stunRounds: 1, cost: 0, currency: null },
  { level: 1, damage: 20, stunRounds: 1, cost: 500, currency: "gold" },
  { level: 2, damage: 30, stunRounds: 1, cost: 1000, currency: "gold" },
  { level: 3, damage: 40, stunRounds: 2, cost: 1500, currency: "gold" },
  { level: 4, damage: 50, stunRounds: 2, cost: 2000, currency: "gold" },
  { level: 5, damage: 60, stunRounds: 3, cost: 2500, currency: "gold" },
];

// Bloodflame Sphere upgrade configurations (Combat skill from Elder Wizard)
export const BLOODFLAME_SPHERE_UPGRADES = [
  {
    level: 0,
    damage: 10,
    burnDamage: 10,
    burnRounds: 1,
    healthCost: 10,
    cost: 0,
    currency: null,
  },
  {
    level: 1,
    damage: 15,
    burnDamage: 15,
    burnRounds: 1,
    healthCost: 10,
    cost: 500,
    currency: "gold",
  },
  {
    level: 2,
    damage: 20,
    burnDamage: 20,
    burnRounds: 1,
    healthCost: 10,
    cost: 1000,
    currency: "gold",
  },
  {
    level: 3,
    damage: 25,
    burnDamage: 25,
    burnRounds: 2,
    healthCost: 20,
    cost: 1500,
    currency: "gold",
  },
  {
    level: 4,
    damage: 30,
    burnDamage: 30,
    burnRounds: 2,
    healthCost: 20,
    cost: 2000,
    currency: "gold",
  },
  {
    level: 5,
    damage: 35,
    burnDamage: 35,
    burnRounds: 3,
    healthCost: 20,
    cost: 2500,
    currency: "gold",
  },
];

// Hunting Skill upgrade configurations (from Ashwraith Huntress)
export const HUNTING_SKILL_UPGRADES = [
  { level: 0, huntBonus: 25, food: 0, fur: 0, bones: 0, cost: 0 },
  { level: 1, huntBonus: 50, food: 5, fur: 0, bones: 0, cost: 500 },
  { level: 2, huntBonus: 75, food: 5, fur: 1, bones: 1, cost: 1000 },
  { level: 3, huntBonus: 100, food: 15, fur: 1, bones: 1, cost: 1500 },
  { level: 4, huntBonus: 125, food: 15, fur: 2, bones: 2, cost: 2000 },
  { level: 5, huntBonus: 150, food: 20, fur: 2, bones: 2, cost: 2500 },
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
  { level: 5, percentage: 25, cost: 2500, currency: "gold" },
];
