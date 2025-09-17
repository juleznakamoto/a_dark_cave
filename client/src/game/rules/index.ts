import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";
import { getTotalLuck, applyLuckToprobability } from "../effects";
import { basicActions } from "./actions";
import { craftingToolsActions } from './craftingTools';
import { craftingWeaponsActions } from './craftingWeapons';
import { forestActions } from './forestActions';
import { buildingActions } from "./buildings";
import { caveActions } from "./caveActions";
import { forgingActions } from "./forging";
import { miningActions } from "./mining";
import { getActionBonuses } from "../effects";

// Combine all actions
export const gameActions: Record<string, Action> = {
  ...basicActions,
  ...caveActions,
  ...craftingToolsActions,
  ...craftingWeaponsActions,
  ...forgingActions,
  ...miningActions,
  ...buildingActions,
  ...forestActions,
};

// Utility function to get the next building level
const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (actionId === "buildHut") {
    return (state.buildings.hut || 0) + 1;
  } else if (actionId === "buildCabin") {
    return (state.buildings.cabin || 0) + 1;
  } else if (actionId === "buildWorkshop") {
    return (state.buildings.workshops || 0) + 1;
  }
  return 1;
};

// Helper function to check requirements for both building and non-building actions
const checkRequirements = (
  requirements: any,
  state: GameState,
  action: Action,
  actionId: string,
): boolean => {
  if (action.building) {
    const level = getNextBuildingLevel(actionId, state);
    const levelRequirements = requirements[level];
    if (!levelRequirements) return false;
    requirements = levelRequirements;
  }

  return Object.entries(requirements).every(([path, expectedValue]) => {
    const pathParts = path.split(".");
    let current: any = state;

    for (const part of pathParts) {
      current = current?.[part];
    }

    if (typeof expectedValue === "boolean") {
      return current === expectedValue;
    }

    return current === expectedValue;
  });
};

// Utility function to check if an action should be shown
export const shouldShowAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.show_when) return false;

  return checkRequirements(action.show_when, state, action, actionId);
};

// Utility function to check if requirements are met for an action
export const canExecuteAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.cost) return true;

  // Check cooldown first
  if (state.cooldowns[actionId] && state.cooldowns[actionId] > 0) {
    return false;
  }

  let costs = action.cost;

  // For building actions, get the cost for the next level
  if (action.building) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }

  if (!costs || typeof costs !== 'object') return true;

  // Check if we can afford all costs
  for (const [path, requiredAmount] of Object.entries(costs)) {
    if (typeof requiredAmount !== 'number') continue;

    const pathParts = path.split('.');
    let current: any = state;

    for (const part of pathParts) {
      current = current?.[part];
    }

    // For resource costs, check if we have enough (>=)
    if (path.startsWith('resources.')) {
      if ((current || 0) < requiredAmount) {
        return false;
      }
    } else {
      // For other requirements, use exact equality check
      if (current !== requiredAmount) {
        return false;
      }
    }
  }

  return true;
};

// Helper function to evaluate complex conditions
function evaluateCondition(condition: string, state: GameState): boolean {
  // Handle AND conditions
  if (condition.includes(" && ")) {
    const parts = condition.split(" && ");
    return parts.every(part => evaluateCondition(part.trim(), state));
  }

  // Handle OR conditions
  if (condition.includes(" || ")) {
    const parts = condition.split(" || ");
    return parts.some(part => evaluateCondition(part.trim(), state));
  }

  // Handle single condition
  return evaluateSingleCondition(condition.trim(), state);
}

// Helper function to evaluate a single condition
function evaluateSingleCondition(condition: string, state: GameState): boolean {
  // Handle negation (e.g., "!events.trinket_found")
  if (condition.startsWith("!")) {
    const checkPath = condition.slice(1);
    return !getValueFromPath(checkPath, state);
  }

  // Handle comparison operators (e.g., "buildings.cabin >= 1")
  const comparisonMatch = condition.match(/^(.+?)\s*(>=|<=|>|<|==|!=)\s*(.+)$/);
  if (comparisonMatch) {
    const [, leftPath, operator, rightValue] = comparisonMatch;
    const leftVal = getValueFromPath(leftPath.trim(), state);
    const rightVal = isNaN(Number(rightValue)) ? rightValue.trim() : Number(rightValue);

    switch (operator) {
      case ">=": return Number(leftVal) >= Number(rightVal);
      case "<=": return Number(leftVal) <= Number(rightVal);
      case ">": return Number(leftVal) > Number(rightVal);
      case "<": return Number(leftVal) < Number(rightVal);
      case "==": return leftVal == rightVal;
      case "!=": return leftVal != rightVal;
      default: return false;
    }
  }

  // Handle simple boolean check (e.g., "flags.fireLit")
  return !!getValueFromPath(condition, state);
}

// Helper function to get value from dot notation path
function getValueFromPath(path: string, state: GameState): any {
  const pathParts = path.split(".");
  let current: any = state;
  for (const part of pathParts) {
    current = current?.[part];
  }
  return current;
}

// Utility function to apply action effects
export function applyActionEffects(actionId: string, state: GameState): any {
  const action = gameActions[actionId];
  if (!action) return {};

  const updates: any = {};
  const logMessages: string[] = [];

  // Handle single effects object or level-based effects
  let effects = action.effects;
  if (typeof effects === 'object' && !Array.isArray(effects)) {
    // Check if this is a level-based effect (has numeric keys)
    const keys = Object.keys(effects);
    const hasNumericKeys = keys.some(key => !isNaN(Number(key)));

    if (hasNumericKeys) {
      // This is level-based, get the current level
      let level = 1;
      if (action.building && action.id.startsWith('build')) {
        const buildingType = action.id.replace('build', '').toLowerCase();
        level = (state.buildings[buildingType as keyof typeof state.buildings] || 0) + 1;
      }
      effects = effects[level] || {};
    }
  }

  Object.entries(effects).forEach(([path, effect]) => {
    if (typeof effect === 'object' && effect !== null && 'probability' in effect) {
      // This is a probability-based effect
      const random = Math.random();
      if (random < effect.probability) {
        let value = effect.value;

        // Handle random value generation
        if (typeof value === 'string' && value.startsWith('random(')) {
          const match = value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            value = Math.floor(Math.random() * (max - min + 1)) + min;
          }
        }

        // Apply the effect using nested path
        setNestedValue(updates, path, value);

        // Add log message if specified
        if (effect.logMessage) {
          logMessages.push(effect.logMessage);
        }
      }
    } else {
      // This is a direct effect
      if (typeof effect === 'number') {
        // For numeric effects, add to existing value
        const currentValue = getNestedValue(state, path) || 0;
        setNestedValue(updates, path, currentValue + effect);
      } else {
        // For non-numeric effects, set directly
        setNestedValue(updates, path, effect);
      }
    }
  });

  if (logMessages.length > 0) {
    updates.logMessages = logMessages;
  }

  return updates;
}

// Helper function to set nested values
function setNestedValue(obj: any, path: string, value: any) {
  const pathParts = path.split('.');
  let current = obj;

  for (let i = 0; i < pathParts.length - 1; i++) {
    if (!current[pathParts[i]]) {
      current[pathParts[i]] = {};
    }
    current = current[pathParts[i]];
  }

  const finalKey = pathParts[pathParts.length - 1];
  current[finalKey] = value;
}

// Utility function to get cost text for actions
export const getCostText = (actionId: string, state?: GameState) => {
  const action = gameActions[actionId];
  if (!action?.cost) return "";

  let costs = action.cost;

  // For building actions, get the cost for the next level
  if (action.building && state) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }

  if (!costs || Object.keys(costs).length === 0) return "";

  const costText = Object.entries(costs)
    .map(([resource, amount]) => {
      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes(".")
        ? resource.split(".").pop()
        : resource;
      // Capitalize first letter of resource name
      const capitalizedName = resourceName.charAt(0).toUpperCase() + resourceName.slice(1);
      return `-${amount} ${capitalizedName}`;
    })
    .join(", ");

  return costText;
};