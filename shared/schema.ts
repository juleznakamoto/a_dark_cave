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
    stone: z.number().min(0).default(0),
    iron: z.number().min(0).default(0),
    coal: z.number().min(0).default(0),
    steel: z.number().min(0).default(0),
    sulfur: z.number().min(0).default(0),
    bones: z.number().min(0).default(0),
    bone_totem: z.number().min(0).default(0),
    fur: z.number().min(0).default(0),
    leather: z.number().min(0).default(0),
    torch: z.number().min(0).default(0),
    silver: z.number().min(0).default(0),
    gold: z.number().min(0).default(0),
    obsidian: z.number().min(0).default(0),
    adamant: z.number().min(0).default(0),
    moonstone: z.number().min(0).default(0),
    bloodstone: z.number().min(0).default(0),
    frostglas: z.number().min(0).default(0),
  }).default({}),
  stats: z.object({
    strength: z.number().min(0).default(0),
    knowledge: z.number().min(0).default(0),
    luck: z.number().min(0).default(0),
    madness: z.number().min(0).default(0),
  }).default({}),
  flags: z.object({
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
    altarBuilt: z.boolean().default(false),
    needsNewWell: z.boolean().default(false),
  }).default({}),
  tools: z.object({
    stone_axe: z.boolean().default(false),
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
    reinforced_rope: z.boolean().default(false),
    giant_trap: z.boolean().default(false),
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
    old_trinket: z.boolean().default(false),
    ebony_ring: z.boolean().default(false),
    cracked_crown: z.boolean().default(false),
    alphas_hide: z.boolean().default(false),
    unnamed_book: z.boolean().default(false),
    blacksmith_hammer: z.boolean().default(false),
    elder_scroll: z.boolean().default(false),
    dragon_bone_dice: z.boolean().default(false),
    coin_of_drowned: z.boolean().default(false),
    shadow_flute: z.boolean().default(false),
    hollow_kings_scepter: z.boolean().default(false),
    red_mask: z.boolean().default(false),
  }).default({}),
  buildings: z.object({
    woodenHut: z.number().default(0),
    stoneHut: z.number().default(0),
    cabin: z.number().default(0),
    greatCabin: z.number().default(0),
    timberMill: z.number().default(0),
    quarry: z.number().default(0),
    blacksmith: z.number().default(0),
    foundry: z.number().default(0),
    tannery: z.number().default(0),
    clerksHut: z.number().default(0),
    shallowPit: z.number().default(0),
    deepeningPit: z.number().default(0),
    deepPit: z.number().default(0),
    bottomlessPit: z.number().default(0),
    altar: z.number().default(0),
    shrine: z.number().default(0),
    temple: z.number().default(0),
    sanctum: z.number().default(0),
  }).default({}),
  villagers: z.object({
    free: z.number().min(0).default(0),
    hunter: z.number().min(0).default(0),
    gatherer: z.number().min(0).default(0),
    tanner: z.number().min(0).default(0),
    iron_miner: z.number().min(0).default(0),
    coal_miner: z.number().min(0).default(0),
    sulfur_miner: z.number().min(0).default(0),
    silver_miner: z.number().min(0).default(0),
    gold_miner: z.number().min(0).default(0),
    obsidian_miner: z.number().min(0).default(0),
    adamant_miner: z.number().min(0).default(0),
    moonstone_miner: z.number().min(0).default(0),
    steel_forger: z.number().min(0).default(0),
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
    // Madness events tracking
    whisperingVoices: z.boolean().default(false),
    shadowsMove: z.boolean().default(false),
    villagerStares: z.boolean().default(false),
    bloodInWater: z.boolean().default(false),
    facesInWalls: z.boolean().default(false),
    wrongVillagers: z.boolean().default(false),
    skinCrawling: z.boolean().default(false),
    creatureInHut: z.boolean().default(false),
    wrongReflections: z.boolean().default(false),
    villagersStareAtSky: z.boolean().default(false),
  }).default({}),
  effects: z.object({
    resource_bonus: z.record(z.string(), z.number()).default({}),
    resource_multiplier: z.record(z.string(), z.number()).default({}),
    probability_bonus: z.record(z.string(), z.number()).default({}),
    cooldown_reduction: z.record(z.string(), z.number()).default({}),
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
  productionEffects: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  statsEffects: z.record(z.string(), z.number()).optional(),
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