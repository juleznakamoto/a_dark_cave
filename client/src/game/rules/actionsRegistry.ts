
import { Action } from "@shared/schema";

/**
 * Central registry for all game actions.
 * This module ONLY holds the actions object and provides access to it.
 * No imports of action definitions here - they register themselves.
 */
export const gameActions: Record<string, Action> = {};

/**
 * Register an action or multiple actions with the registry
 */
export function registerActions(actions: Record<string, Action>): void {
  Object.assign(gameActions, actions);
}

/**
 * Get all registered actions
 */
export function getGameActions(): Record<string, Action> {
  return gameActions;
}
