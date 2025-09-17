import { z } from "zod";

// Define LogEntry schema first since it's used in gameStateSchema
export const logEntrySchema = z.object({
  id: z.string(),
  message: z.string(),
  timestamp: z.number(),
  type: z.enum(['system', 'action', 'event', 'production']).default('system'),
});

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
    sulfur: z.number().min(0).default(0),
    silver: z.number().min(0).default(0),
    obsidian: z.number().min(0).default(0),
    adamant: z.number().min(0).default(0),
    moonstone: z.number().min(0).default(0),
    gold: z.number().min(0).default(0),
    bones: z.number().min(0).default(0),
    fur: z.number().min(0).default(0),
    leather: z.number().min(0).default(0),
    bloodstone: z.number().min(0).default(0),
    frostglas: z.number().min(0).default(0),
  }).default({}),
  stats: z.object({
    luck: z.number().min(0).default(0),
    strength: z.number().min(0).default(0),
    knowledge: z.number().min(0).default(0),
  }).default({}),
  flags: z.object({
    fireLit: z.boolean().default(false),
    villageUnlocked: z.boolean().default(false),
    worldDiscovered: z.boolean().default(false),
    torchBuilt: z.boolean().default(false),
    caveExplored: z.boolean().default(false),
    venturedDeeper: z.boolean().default(false),
    gameStarted: z.boolean().default(false),
    trinketDrunk: z.boolean().default(false),
    sleeping: z.boolean().default(false),
    descendedFurther: z.boolean().default(false),
    exploredRuins: z.boolean().default(false),
    exploredTemple: z.boolean().default(false),
    exploredCitadel: z.boolean().default(false),
    starvationActive: z.boolean().default(false),
    forestUnlocked: z.boolean().default(false),
  }).default({}),
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
    adamant_axe: z.boolean().default(false),
    adamant_pickaxe: z.boolean().default(false),
    lantern: z.boolean().default(false),
    iron_lantern: z.boolean().default(false),
    steel_lantern: z.boolean().default(false),
    obsidian_lantern: z.boolean().default(false),
    adamant_lantern: z.boolean().default(false),
    blacksmith_hammer: z.boolean().default(false),
  }).default({}),
  weapons: z.object({
    iron_sword: z.boolean().default(false),
    steel_sword: z.boolean().default(false),
    obsidian_sword: z.boolean().default(false),
    adamant_sword: z.boolean().default(false),
    crude_bow: z.boolean().default(false),
    huntsman_bow: z.boolean().default(false),
    long_bow: z.boolean().default(false),
    war_bow: z.boolean().default(false),
    master_bow: z.boolean().default(false),
  }).default({}),
  clothing: z.object({
    iron_armor: z.boolean().default(false),
    steel_armor: z.boolean().default(false),
    obsidian_armor: z.boolean().default(false),
  }).default({}),
  relics: z.object({
    tarnished_amulet: z.boolean().default(false),
    bloodstained_belt: z.boolean().default(false),
    ravenfeather_mantle: z.boolean().default(false),
    blackened_mirror: z.boolean().default(false),
    whispering_amulet: z.boolean().default(false),
    wooden_figure: z.boolean().default(false),
  }).default({}),
  buildings: z.object({
    hut: z.number().default(0),
    traps: z.number().default(0),
    cabin: z.number().default(0),
    blacksmith: z.number().default(0),
  }).default({}),
  villagers: z.object({
    free: z.number().min(0).default(0),
    hunter: z.number().min(0).default(0),
    gatherer: z.number().min(0).default(0),
  }).default({}),
  world: z.object({
    discovered: z.boolean().default(false),
    position: z.object({
      x: z.number().default(0),
      y: z.number().default(0),
    }).default({}),
  }).default({}),
  story: z.object({
    seen: z.record(z.string(), z.boolean()).default({}),
  }).default({}),
  events: z.object({
    available: z.array(z.string()).default([]),
    active: z.array(z.string()).default([]),
    log: z.array(z.string()).default([]),
  }).default({}),
  log: z.array(logEntrySchema).default([]),
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