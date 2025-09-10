import { z } from "zod";

// Game state schema for A Dark Cave
export const gameStateSchema = z.object({
  resources: z.object({
    wood: z.number().min(0).default(0),
    food: z.number().min(0).default(0),
    torch: z.number().min(0).default(0),
  }),
  flags: z.object({
    fireLit: z.boolean().default(false),
    villageUnlocked: z.boolean().default(false),
    worldDiscovered: z.boolean().default(false),
    torchBuilt: z.boolean().default(false),
  }),
  tools: z.object({
    axe: z.boolean().default(false),
    spear: z.boolean().default(false),
  }),
  buildings: z.object({
    huts: z.number().min(0).default(0),
    traps: z.number().min(0).default(0),
  }),
  villagers: z.object({
    free: z.number().min(0).default(0),
    hunters: z.number().min(0).default(0),
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
  version: z.number().default(1),
});

export type GameState = z.infer<typeof gameStateSchema>;

// Action schema for game rules
export const actionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  requirements: z.record(z.string(), z.any()).optional(),
  effects: z.record(z.string(), z.any()),
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