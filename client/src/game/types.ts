import { GameState } from "@shared/schema";

/**
 * Shared types for game mechanics
 */

// Combat types
export interface Enemy {
  name: string;
  attack: number;
  maxHealth: number;
  currentHealth: number;
}

export interface CombatItem {
  id: string;
  name: string;
  damage: number;
  available: boolean;
}

export interface CombatData {
  enemy: Enemy;
  eventTitle: string;
  eventMessage: string;
  onVictory: () => Partial<GameState> & { _logMessage?: string };
  onDefeat?: () => Partial<GameState> & { _logMessage?: string };
}

export interface CombatDialogData {
  enemy: Enemy | null;
  eventTitle: string;
  eventMessage: string;
  onVictory: (() => Partial<GameState> & { _logMessage?: string }) | null;
  onDefeat: (() => Partial<GameState> & { _logMessage?: string }) | null;
}

// Merchant trade types
export interface MerchantTradeData {
  id: string;
  label: string;
  cost: string;
  buyResource: string;
  buyAmount: number;
  buyItem?: string; // For special items (tools, books, schematics, weapons) - the specific item ID
  sellResource: string;
  sellAmount: number;
  executed: boolean;
}

export interface MerchantTradesState {
  choices: MerchantTradeData[];
  purchasedIds: string[];
}

// Event system types (re-exported from events.ts for convenience)
export type { GameEvent, EventChoice, LogEntry } from "./rules/events";
import type { EventChoice } from "./rules/events";

// Event handler types
export type EventEffectHandler = (state: GameState) => Partial<GameState>;
export type EventConditionHandler = (state: GameState) => boolean;
export type EventChoiceHandler = (state: GameState) => EventChoice[];

// Action effect types
export interface ActionEffectUpdates {
  resources?: Partial<GameState["resources"]>;
  tools?: Partial<GameState["tools"]>;
  weapons?: Partial<GameState["weapons"]>;
  clothing?: Partial<GameState["clothing"]>;
  buildings?: Partial<GameState["buildings"]>;
  flags?: Partial<GameState["flags"]>;
  villagers?: Partial<GameState["villagers"]>;
  relics?: Partial<GameState["relics"]>;
  books?: Partial<GameState["books"]>;
  fellowship?: Partial<GameState["fellowship"]>;
  blessings?: Partial<GameState["blessings"]>;
  events?: Partial<GameState["events"]>;
  stats?: Partial<GameState["stats"]>;
  cooldowns?: Partial<GameState["cooldowns"]>;
  schematics?: Partial<GameState["schematics"]>;
  attackWaveTimers?: Partial<GameState["attackWaveTimers"]>;
  triggeredEvents?: string[];
  triggeredEventsState?: Record<string, boolean>;
  story?: Partial<GameState["story"]>;
  feastState?: GameState["feastState"];
  boneDevourerState?: GameState["boneDevourerState"];
  greatFeastState?: GameState["greatFeastState"];
  curseState?: GameState["curseState"];
  frostfallState?: GameState["frostfallState"];
  woodcutterState?: GameState["woodcutterState"];
  fogState?: GameState["fogState"];
  sleepUpgrades?: GameState["sleepUpgrades"];
  combatSkills?: GameState["combatSkills"];
  clickAnalytics?: Partial<GameState["clickAnalytics"]>;
  madness?: GameState["madness"];
  compassBonusTriggered?: boolean;
}
