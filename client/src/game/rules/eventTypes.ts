import type { GameState } from "@shared/schema";
import type { SuccessChanceFormula } from "./eventSuccessChance";

/**
 * Event type definitions live here (not in events.ts) so topic modules can import
 * types without creating a circular dependency on the gameEvents aggregator.
 */

export interface GameEvent {
  id: string;
  condition: (state: GameState) => boolean;
  /** @deprecated Display text lives in i18n events catalog; optional for legacy/dynamic variants */
  title?: string | ((state: GameState) => string);
  /** Static string, variant key fn, or legacy string array — resolved via i18n */
  message?: string | string[] | ((state: GameState) => string);
  choices?: EventChoice[] | ((state: GameState) => EventChoice[]);
  triggered?: boolean;
  repeatable?: boolean;
  priority?: number; // Higher priority events check first
  timeProbability?: number | ((state: GameState) => number); // Average minutes between triggers
  cooldownPercent?: number; // Cooldown as fraction of timeProbability (e.g. 0.25 = 25%). Default: 0.25
  effect?: (state: GameState) => Partial<GameState>;
  // New timed choice properties
  isTimedChoice?: boolean;
  baseDecisionTime?: number; // Base decision time in seconds
  fallbackChoice?: EventChoice; // Choice to execute if time runs out
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
  // Timed tab properties
  showAsTimedTab?: boolean;
  timedTabDuration?: number; // Duration in milliseconds
  skipEventLog?: boolean; // Skip adding to visible event log
  /** Shared i18n catalog id (e.g. feast1 → feast) */
  i18nKey?: string;
  /** Interpolation vars for catalog strings (e.g. foodCost); may depend on state */
  i18nVars?:
  | Record<string, string | number>
  | ((state: GameState) => Record<string, string | number>);
}

/** Runtime fields returned from choice effects (stripped before state merge). */
export type EventChoiceEffectResult = Partial<GameState> & {
  _logMessage?: string;
  _logMessageKey?: string;
  _logMessageI18nKey?: string;
  _logMessageVars?: Record<string, string | number>;
  _combatData?: unknown;
  /** Choice blocked by affordance (e.g. insufficient free villagers); no state merge or outcome UI. */
  _choiceRejected?: boolean;
  /** Villager deaths from this choice; used by the outcome dialog. */
  villagersKilled?: number;
};

export interface EventChoice {
  id: string;
  /** @deprecated Display text lives in i18n events catalog */
  label?: string | ((state: GameState) => string);
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[];
  success_chance?: number | ((state: GameState) => number); // Success probability for this choice
  /** Structured formula for tooltip breakdown (survives pre-eval of success_chance). */
  success_formula?: SuccessChanceFormula;
  cost?: string | ((state: GameState) => string); // Optional cost information for hover display
  effect: (state: GameState) => EventChoiceEffectResult;
  cooldown?: number; // Cooldown in seconds for choice buttons
}

export interface LogEntry {
  id: string;
  /** Rules event id when `id` is synthetic (e.g. `log-message-*`). */
  eventId?: string;
  message: string;
  /** ui:log.* key for display-time localization (English kept in `message` for saves). */
  logKey?: string;
  logVars?: Record<string, string | number>;
  /** actions:*.log.* pair for display-time localization (English kept in `message` for saves). */
  actionId?: string;
  actionLogKey?: string;
  timestamp: number;
  type: "event" | "action" | "system";
  title?: string;
  choices?: EventChoice[] | ((state: GameState) => EventChoice[]);
  isTimedChoice?: boolean;
  baseDecisionTime?: number;
  fallbackChoice?: EventChoice;
  skipSound?: boolean; // Skip playing sound for this event
  skipEventLog?: boolean; // Skip adding to visible event log
  /** Event log panel: white unread dot instead of red. */
  newVillagers?: boolean;
  relevant_stats?: ("strength" | "knowledge" | "luck" | "madness")[]; // Stats relevant to event odds
  // Timed tab properties
  showAsTimedTab?: boolean;
  timedTabDuration?: number; // Duration in milliseconds
}
