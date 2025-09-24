import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";
import { getTotalLuck, applyLuckToprobability, getActionBonuses, getTotalCraftingCostReduction } from "./effects";
import { caveExploreActions } from './caveExploreActions';
import { caveForgingActions } from './caveForgeActions';
import { caveCraftResources } from './caveCraftResources';
import { caveCraftTools } from './caveCraftTools';
import { caveCraftWeapons } from './caveCraftWeapons';
import { caveMiningActions } from './caveMineActions';
import { caveCraftWeapons } from './caveCraftWeapons';
import { villageBuildActions } from './villageBuildActions';
import { forestScoutActions } from './forestScoutActions';

// Combine all actions
export const gameActions: Record<string, Action> = {
  ...villageBuildActions,
  ...caveExploreActions,
  ...caveForgingActions,
  ...caveCraftResources,
  ...caveCraftTools,
  ...caveCraftWeapons,
  ...caveMiningActions,
  ...caveCraftWeapons,
  ...forestScoutActions,
};

// Utility function to get the next building level
const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (actionId === "buildWoodenHut") {
    return (state.buildings.woodenHut || 0) + 1;
  }
  if (actionId === "buildShallowPit") {
    return (state.buildings.shallowPit || 0) + 1;
  }
  if (actionId === "buildDeepeningPit") {
    return (state.buildings.deepeningPit || 0) + 1;
  }
  if (actionId === "buildDeepPit") {
    return (state.buildings.deepPit || 0) + 1;
  }
  if (actionId === "buildBottomlessPit") {
    return (state.buildings.bottomlessPit || 0) + 1;
  }
  if (actionId === "buildCabin") {
    return (state.buildings.cabin || 0) + 1;
  }
  if (actionId === "buildBlacksmith") {
    return (state.buildings.blacksmith || 0) + 1;
  }
  if (actionId === "buildFoundry") {
    return (state.buildings.foundry || 0) + 1;
  }
  if (actionId === "buildShrine") {
    return (state.buildings.shrine || 0) + 1;
  }
  if (actionId === "buildGreatCabin") {
    return (state.buildings.greatCabin || 0) + 1;
  }
  if (actionId === "buildTimberMill") {
    return (state.buildings.timberMill || 0) + 1;
  }
  if (actionId === "buildQuarry") {
    return (state.buildings.quarry || 0) + 1;
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

  // Get crafting cost reduction for crafting actions
  const isCraftingAction = actionId.startsWith('craft') || actionId.startsWith('forge');
  const craftingCostReduction = isCraftingAction ? getTotalCraftingCostReduction(state) : 0;

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
      // Apply crafting cost reduction to resource costs for crafting actions
      const adjustedCost = isCraftingAction ? Math.floor(requiredAmount * (1 - craftingCostReduction)) : requiredAmount;
      if ((current || 0) < adjustedCost) {
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
export const applyActionEffects = (
  actionId: string,
  state: GameState,
): Partial<GameState> => {
  const action = gameActions[actionId];
  if (!action?.effects) return {};

  const updates: any = {};

  // Get crafting cost reduction for crafting actions
  const isCraftingAction = actionId.startsWith('craft') || actionId.startsWith('forge');
  const craftingCostReduction = isCraftingAction ? getTotalCraftingCostReduction(state) : 0;

  for (const [path, effect] of Object.entries(action.effects)) {
    const pathParts = path.split(".");
    let current = updates;

    // Navigate to the correct nested object
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] =
          pathParts[i] === "resources"
            ? { ...state.resources }
            : pathParts[i] === "flags"
              ? { ...state.flags }
              : pathParts[i] === "tools"
                ? { ...state.tools }
                : pathParts[i] === "buildings"
                  ? { ...state.buildings }
                  : pathParts[i] === "story"
                    ? { ...state.story, seen: { ...state.story.seen } }
                    : pathParts[i] === "relics"
                      ? { ...state.relics }
                      : {};
      }
      current = current[part];
    }

    const finalKey = pathParts[pathParts.length - 1];

    if (typeof effect === "string" && effect.startsWith("random(")) {
      // Handle random effects like "random(1,3)"
      const match = effect.match(/random\((\d+),(\d+)\)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        let baseAmount = Math.floor(Math.random() * (max - min + 1)) + min;

        // Apply action bonuses from the centralized effects system
        const actionBonuses = getActionBonuses(state, actionId);
        if (actionBonuses?.resourceBonus?.[finalKey as keyof typeof actionBonuses.resourceBonus]) {
          baseAmount += actionBonuses.resourceBonus[finalKey as keyof typeof actionBonuses.resourceBonus];
        }

        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          baseAmount;
      }
    } else if (typeof effect === "object" && effect !== null && "probability" in effect) {
      // Handle probability-based effects like { probability: 0.3, value: 5, logMessage: "Found something!", condition: "!clothing.tarnished_amulet", triggerEvent: "eventId" }
      const probabilityEffect = effect as {
        probability: number;
        value: number | string | boolean;
        logMessage?: string;
        condition?: string;
        triggerEvent?: string;
      };

      // Check condition if provided
      let conditionMet = true;
      if (probabilityEffect.condition) {
        conditionMet = evaluateCondition(probabilityEffect.condition, state);
      }

      const totalLuck = getTotalLuck(state);
      const adjustedProbability = applyLuckToprobability(probabilityEffect.probability, totalLuck);
      const shouldTrigger = conditionMet && Math.random() < adjustedProbability;

      if (shouldTrigger) {
        if (typeof probabilityEffect.value === "string" && probabilityEffect.value.startsWith("random(")) {
          // Handle random value within probability effect
          const match = probabilityEffect.value.match(/random\((\d+),(\d+)\)/);
          if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            const randomAmount = Math.floor(Math.random() * (max - min + 1)) + min;

            if (pathParts[0] === "resources") {
              current[finalKey] =
                (state.resources[finalKey as keyof typeof state.resources] || 0) +
                randomAmount;
            } else {
              current[finalKey] = randomAmount;
            }
          }
        } else if (typeof probabilityEffect.value === "number") {
          if (pathParts[0] === "resources") {
            current[finalKey] =
              (state.resources[finalKey as keyof typeof state.resources] || 0) +
              probabilityEffect.value;
          } else {
            current[finalKey] = probabilityEffect.value;
          }
        } else if (typeof probabilityEffect.value === "boolean") {
          current[finalKey] = probabilityEffect.value;
        }
      }

      // Only store log message if the effect actually triggered
      if (shouldTrigger && probabilityEffect.logMessage) {
        if (!updates.logMessages) updates.logMessages = [];
        updates.logMessages.push(probabilityEffect.logMessage);
      }

      // Handle event triggering
      if (shouldTrigger && probabilityEffect.triggerEvent) {
        if (!updates.triggeredEvents) updates.triggeredEvents = [];
        updates.triggeredEvents.push(probabilityEffect.triggerEvent);
      }
    } else if (typeof effect === "number") {
      if (pathParts[0] === "resources") {
        // Apply crafting cost reduction to negative resource effects (costs) for crafting actions
        let adjustedEffect = effect;
        if (isCraftingAction && effect < 0) {
          adjustedEffect = Math.floor(effect * (1 - craftingCostReduction));
        }
        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          adjustedEffect;
      } else {
        current[finalKey] = effect;
      }
    } else if (typeof effect === "boolean") {
      current[finalKey] = effect;
    } else if (pathParts[0] === "tools") {
        // Handle tool effects (e.g., equipping/unequipping)
        current[finalKey] = effect;
    } else if (pathParts[0] === "clothing") {
        // Handle clothing effects (e.g., equipping/unequipping)
        current[finalKey] = effect;
    }
  }

  // Apply dev mode 10x multiplier to resource gains (only the added amount)
  if (state.devMode && updates.resources) {
    for (const [resource, amount] of Object.entries(updates.resources)) {
      if (typeof amount === 'number') {
        const currentAmount = state.resources[resource as keyof typeof state.resources] || 0;
        const addedAmount = amount - currentAmount;
        if (addedAmount > 0) {
          updates.resources[resource] = currentAmount + (addedAmount * 10);
        }
      }
    }
  }

  return updates;
};

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

  // Get crafting cost reduction for crafting actions
  const isCraftingAction = actionId.startsWith('craft') || actionId.startsWith('forge');
  const craftingCostReduction = (isCraftingAction && state) ? getTotalCraftingCostReduction(state) : 0;

  const costText = Object.entries(costs)
    .map(([resource, amount]) => {
      // Apply crafting cost reduction to resource costs for crafting actions
      let adjustedAmount = amount;
      if (isCraftingAction && resource.startsWith('resources.')) {
        adjustedAmount = Math.floor(amount * (1 - craftingCostReduction));
      }

      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes(".")
        ? resource.split(".").pop()
        : resource;
      // Replace underscores with spaces and capitalize each word
      const formattedName = resourceName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `-${adjustedAmount} ${formattedName}`;
    })
    .join(", ");

  return costText;
};