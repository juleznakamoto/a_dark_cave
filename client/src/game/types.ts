import { GameState, Referral } from "@shared/schema";
import type { LogEntry } from "./rules/events";
import type React from "react";

/**
 * Shared types for game mechanics
 */

// ============================================================================
// Combat types
// ============================================================================

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

// ============================================================================
// Event system types
// ============================================================================

// Re-exported from events.ts for convenience
export type { GameEvent, EventChoice, LogEntry } from "./rules/events";

// ============================================================================
// Action types
// ============================================================================

/**
 * Result of executing a game action
 */
export interface ActionResult {
  stateUpdates: Partial<GameState> & {
    _logMessage?: string;
  };
  logEntries?: LogEntry[];
  delayedEffects?: Array<() => void>;
}

/**
 * Action effect updates - used to update game state after actions
 */
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
  buttonUpgrades?: Partial<GameState["buttonUpgrades"]>;
  focusState?: GameState["focusState"];
  focus?: number;
  totalFocusEarned?: number;
  huntingSkills?: GameState["huntingSkills"];
  crowsEyeSkills?: GameState["crowsEyeSkills"];
  tradeEstablishState?: GameState["tradeEstablishState"];
}

// ============================================================================
// UI/Store types
// ============================================================================

/**
 * Available game tabs
 */
export type GameTab =
  | "cave"
  | "village"
  | "forest"
  | "bastion"
  | "estate"
  | "achievements"
  | "timedevent";

/**
 * Event dialog state
 */
export interface EventDialogState {
  isOpen: boolean;
  currentEvent: LogEntry | null;
}

/**
 * Combat dialog state
 */
export interface CombatDialogState {
  isOpen: boolean;
  enemy: Enemy | null;
  eventTitle: string;
  eventMessage: string;
  onVictory: (() => Partial<GameState>) | null;
  onDefeat: (() => Partial<GameState>) | null;
}

/**
 * Idle mode dialog state
 */
export interface IdleModeDialogState {
  isOpen: boolean;
}

/**
 * Idle mode state
 */
export interface IdleModeState {
  isActive: boolean;
  startTime: number;
  needsDisplay: boolean; // Track if user needs to see results
}

/**
 * Timed event tab state
 */
export interface TimedEventTabState {
  isActive: boolean;
  event: LogEntry | null;
  expiryTime: number;
  startTime?: number;
}

/**
 * Inactivity reason
 */
export type InactivityReason = "timeout" | "multitab" | null;

/**
 * Currency type
 */
export type Currency = "EUR" | "USD";

/**
 * Focus state (UI state version)
 */
export interface FocusState {
  isActive: boolean;
  endTime: number;
  points: number;
  duration?: number; // Duration in milliseconds
  startTime?: number; // Start time timestamp
}

/**
 * Merchant trades state
 */
export interface MerchantTradesState {
  choices: MerchantTradeData[];
  purchasedIds: string[];
}

/**
 * Game statistics for completed games
 */
export interface GameStats {
  gameId: string | null;
  gameMode: string;
  startTime: number;
  finishTime: number;
  playTime: number;
}

// ============================================================================
// Merchant trade types
// ============================================================================

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

// ============================================================================
// Game stats types
// ============================================================================

/**
 * Bastion statistics
 */
export interface BastionStats {
  defense: number;
  attack: number;
  attackFromFortifications: number;
  attackFromStrength: number;
  integrity: number;
}

// ============================================================================
// Population types
// ============================================================================

/**
 * Population job configuration
 */
export interface PopulationJobConfig {
  id: string;
  label: string;
  production: {
    resource: string;
    amount: number;
    interval: number; // in milliseconds
  }[];
}

// ============================================================================
// Effect types
// ============================================================================

/**
 * Action bonuses interface
 */
export interface ActionBonuses {
  resourceBonus: Record<string, number>;
  resourceMultiplier: number;
  cooldownReduction: number;
  probabilityBonus?: Record<string, number>;
}

/**
 * Effect definition for tools and clothing
 */
export interface EffectDefinition {
  id: string;
  name: string;
  description: string;
  bonuses: {
    // Resource gathering bonuses
    resourceMultipliers?: Record<string, number>;
    resourceBonuses?: Record<string, number>;

    // Action-specific bonuses
    actionBonuses?: Record<
      string,
      {
        cooldownReduction?: number; // Percentage reduction (0.1 = 10% reduction)
        resourceBonus?: Record<string, number>; // Fixed bonus to specific resources
        resourceMultiplier?: number; // Multiplier for all resources (1.25 = 25% bonus)
        probabilityBonus?: Record<string, number>; // Probability bonus for specific resources (0.05 = 5% chance)
      }
    >;

    // General bonuses
    generalBonuses?: {
      luck?: number; // Luck bonus
      strength?: number; // Strength bonus
      knowledge?: number; // Knowledge bonus
      madness?: number; // Madness bonus
      craftingCostReduction?: number; // Percentage reduction in crafting costs (0.1 = 10% reduction)
      buildingCostReduction?: number; // Percentage reduction in building costs (0.1 = 10% reduction)
      MAX_EMBER_BOMBS?: number; // Bonus to max ember bombs capacity
      MAX_CINDERFLAME_BOMBS?: number; // Bonus to max ashfire bombs
      MAX_VOID_BOMBS?: number;
      caveExploreMultiplier?: number; // Multiplier for all cave exploration actions
      eventDeathReduction?: number; // Percentage reduction in villager deaths from events (0.25 = 25% reduction)
      criticalDamageBonus?: number; // Percentage bonus to critical hit damage (0.05 = 5% bonus)
      actionBonusChance?: number; // Chance to double action gains (0.1 = 10% chance)
    };
  };
}

// ============================================================================
// Auth types
// ============================================================================

/**
 * Authenticated user
 */
export interface AuthUser {
  id: string;
  email: string;
}

// ============================================================================
// Tooltip types
// ============================================================================

/**
 * Tooltip configuration
 */
export interface TooltipConfig {
  getContent: (state: GameState) => React.ReactNode | string;
}

// ============================================================================
// Button upgrade types
// ============================================================================

// Re-exported from buttonUpgrades.ts for convenience
export type {
  UpgradeKey,
  UpgradeLevel,
} from "./buttonUpgrades";
