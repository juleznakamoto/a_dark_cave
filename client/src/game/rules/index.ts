import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";
import { getTotalLuck, applyLuckToprobability } from "../effects";
import { basicActions } from "./actions";
import { craftingActions } from "./crafting";
import { buildingActions } from "./buildings";

// Combine all actions
export const gameActions: Record<string, Action> = {
  ...basicActions,
  ...craftingActions,
  ...buildingActions,
};

// Utility function to get the next building level
const getNextBuildingLevel = (actionId: string, state: GameState): number => {
  if (actionId === "buildHut") {
    return (state.buildings.huts || 0) + 1;
  } else if (actionId === "buildLodge") {
    return (state.buildings.lodges || 0) + 1;
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
): boolean => {
  if (action.building) {
    const level = getNextBuildingLevel(action.id, state);
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

    return current >= expectedValue;
  });
};

// Utility function to check if an action should be shown
export const shouldShowAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.show_when) return false;

  return checkRequirements(action.show_when, state, action);
};

// Utility function to check if requirements are met for an action
export const canExecuteAction = (
  actionId: string,
  state: GameState,
): boolean => {
  const action = gameActions[actionId];
  if (!action?.cost) return true;

  return checkRequirements(action.cost, state, action);
};

// Utility function to apply action effects
export const applyActionEffects = (
  actionId: string,
  state: GameState,
): Partial<GameState> => {
  const action = gameActions[actionId];
  if (!action?.effects) return {};

  const updates: any = {};

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

        // Apply stone_axe bonus for wood gathering
        if (
          actionId === "gatherWood" &&
          finalKey === "wood" &&
          state.tools.stone_axe
        ) {
          baseAmount += 3; // +3 wood if stone_axe is owned
        }

        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          baseAmount;
      }
    } else if (typeof effect === "object" && effect !== null && "probability" in effect) {
      // Handle probability-based effects like { probability: 0.3, value: 5, logMessage: "Found something!", condition: "!clothing.tarnished_amulet" }
      const probabilityEffect = effect as {
        probability: number;
        value: number | string | boolean;
        logMessage?: string;
        condition?: string;
      };

      // Check condition if provided
      let conditionMet = true;
      if (probabilityEffect.condition) {
        const condition = probabilityEffect.condition;
        if (condition.startsWith("!")) {
          // Handle negation (e.g., "!clothing.tarnished_amulet")
          const checkPath = condition.slice(1);
          const pathParts = checkPath.split(".");
          let current: any = state;
          for (const part of pathParts) {
            current = current?.[part];
          }
          conditionMet = !current;
        } else {
          // Handle positive condition
          const pathParts = condition.split(".");
          let current: any = state;
          for (const part of pathParts) {
            current = current?.[part];
          }
          conditionMet = !!current;
        }
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
        if (!current.logMessages) current.logMessages = [];
        current.logMessages.push(probabilityEffect.logMessage);
      }
    } else if (typeof effect === "number") {
      if (pathParts[0] === "resources") {
        current[finalKey] =
          (state.resources[finalKey as keyof typeof state.resources] || 0) +
          effect;
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

  const costText = Object.entries(costs)
    .map(([resource, amount]) => {
      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes(".")
        ? resource.split(".").pop()
        : resource;
      return `${amount} ${resourceName}`;
    })
    .join(", ");

  return costText ? ` (${costText})` : "";
};