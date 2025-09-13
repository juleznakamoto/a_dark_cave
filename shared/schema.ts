import { z } from "zod";

// Game state schema for A Dark Cave
export const gameStateSchema = z.object({
  resources: z.object({
    wood: z.number().min(0).default(0),
    food: z.number().min(0).default(0),
    torch: z.number().min(0).default(0),
    stone: z.number().min(0).default(0),
    iron: z.number().min(0).default(0),
    coal: z.number().min(0).default(0),
    steel: z.number().min(0).default(0),
    sulphur: z.number().min(0).default(0),
    silver: z.number().min(0).default(0),
    obsidian: z.number().min(0).default(0),
    moonstone: z.number().min(0).default(0),
    gold: z.number().min(0).default(0),
    bones: z.number().min(0).default(0),
    fur: z.number().min(0).default(0),
    leather: z.number().min(0).default(0),
  }),
  stats: z.object({
    luck: z.number().min(0).default(0),
    strength: z.number().min(0).default(0),
    knowledge: z.number().min(0).default(0),
  }),
  flags: z.object({
    fireLit: z.boolean().default(false),
    villageUnlocked: z.boolean().default(false),
    worldDiscovered: z.boolean().default(false),
    torchBuilt: z.boolean().default(false),
    caveExplored: z.boolean().default(false),
    venturedDeeper: z.boolean().default(false),
    gameStarted: z.boolean().default(false),
  }),
  tools: z.object({
    stone_axe: z.boolean().default(false),
    spear: z.boolean().default(false),
    stone_pickaxe: z.boolean().default(false),
    iron_axe: z.boolean().default(false),
    iron_pickaxe: z.boolean().default(false),
    steel_axe: z.boolean().default(false),
    steel_pickaxe: z.boolean().default(false),
    obsidian_axe: z.boolean().default(false),
    obsidian_pickaxe: z.boolean().default(false),
    lantern: z.boolean().default(false),
  }),
  weapons: z.object({
    iron_knife: z.boolean().default(false),
    iron_sword: z.boolean().default(false),
    steel_sword: z.boolean().default(false),
    obsidian_sword: z.boolean().default(false),
  }),
  clothing: z.object({
    iron_armor: z.boolean().default(false),
    steel_armor: z.boolean().default(false),
    obsidian_armor: z.boolean().default(false),
  }),
  relics: z.object({
    tarnished_amulet: z.boolean().default(false),
    bloodstained_belt: z.boolean().default(false),
    ravenfeather_mantle: z.boolean().default(false),
    blackened_mirror: z.boolean().default(false),
    whispering_amulet: z.boolean().default(false),
    wooden_figure: z.boolean().default(false),
  }),
  buildings: z.object({
    huts: z.number().default(0),
    traps: z.number().default(0),
    lodges: z.number().default(0),
    blacksmiths: z.number().default(0),
  }),
  villagers: z.object({
    free: z.number().min(0).default(0),
    hunters: z.number().min(0).default(0),
    gatherers: z.number().min(0).default(0),
  }),
  world: z.object({
    discovered: z.boolean().default(false),
    position: z.object({
      x: z.number().default(0),
      y: z.number().default(0),
    }),
  }),
  story: z.object({
    seen: z.record(z.string(), z.boolean()).default({}),
  }),
  events: z.object({
    available: z.array(z.string()).default([]),
    active: z.array(z.string()).default([]),
    log: z.array(z.string()).default([]),
  }),
  current_population: z.number().min(0).default(0),
  total_population: z.number().min(0).default(0),
  version: z.number().default(1),
});

export type GameState = z.infer<typeof gameStateSchema>;

// Action schema for game rules
export const actionSchema = z.object({
  id: z.string(),
  label: z.string(),
  building: z.boolean().optional(),
  show_when: z.union([
    z.record(z.string(), z.any()),
    z.record(z.number(), z.record(z.string(), z.any()))
  ]).optional(),
  cost: z.union([
    z.record(z.string(), z.any()),
    z.record(z.number(), z.record(z.string(), z.any()))
  ]).optional(),
  effects: z.union([
    z.record(z.string(), z.any()),
    z.record(z.number(), z.record(z.string(), z.any()))
  ]),
  unlocks: z.array(z.string()).optional(),
  cooldown: z.number().optional(),
});

export type Action = z.infer<typeof actionSchema>;

// Save data schema
export const saveDataSchema = z.object({
  gameState: gameStateSchema,
  timestamp: z.number(),
  playTime: z.number().default(0),
});

export type SaveData = z.infer<typeof saveDataSchema>;

export const logEntrySchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.number(),
  type: z.enum(['system', 'action', 'event', 'production']).default('system'),
});