import { z } from "zod";

// Game state schema for A Dark Cave
export const gameStateSchema = z.object({
  resources: z.object({
    wood: z.number().min(0).default(0),
    meat: z.number().min(0).default(0),
    torch: z.number().min(0).default(0),
    stone: z.number().min(0).default(0),
  }),
  flags: z.object({
    fireLit: z.boolean().default(false),
    villageUnlocked: z.boolean().default(false),
    worldDiscovered: z.boolean().default(false),
    torchBuilt: z.boolean().default(false),
    caveExplored: z.boolean().default(false),
  }),
  tools: z.object({
    axe: z.boolean().default(false),
    spear: z.boolean().default(false),
  }),
  buildings: z.object({
    huts: z.number().default(0),
    traps: z.number().default(0),
    lodges: z.number().default(0),
    workshops: z.number().default(0),
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