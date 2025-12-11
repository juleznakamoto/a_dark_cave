import { Action } from "@shared/schema";
import { GameState } from "@shared/schema";
import { GameEvent } from "./events";
import {
  getTotalCraftingCostReduction as getTotalCraftingCostReductionCalc,
  getTotalBuildingCostReduction as getTotalBuildingCostReductionCalc,
} from "./effectsCalculation";
import { setGameActionsRef } from "./actionEffects";

// Import action modules
import { caveCraftResources } from "./caveCraftResources";
import { caveCraftTools } from "./caveCraftTools";
import { caveCraftWeapons } from "./caveCraftWeapons";
import { caveMineActions } from "./caveMineActions";
import { villageBuildActions } from "./villageBuildActions";
import { forestScoutActions } from "./forestScoutActions";
import {
  forestSacrificeActions,
  getBoneTotemsCost,
  getLeatherTotemsCost,
  getAnimalsCost,
  getHumansCost,
} from "./forestSacrificeActions";
import { forestTradeActions } from "./forestTradeActions";
import { caveExploreActions } from "./caveExploreActions";
import { getNextBuildingLevel } from "./villageBuildActions";

// Import event modules
import { caveEvents } from "./eventsCave";
import { huntEvents } from "./eventsHunt";
import { choiceEvents } from "./eventsChoices";
import { cubeEvents } from "./eventsCube";
import { feastEvents } from "./eventsFeast";
import { loreEvents } from "./eventsLore";
import { madnessEvents } from "./eventsMadness";
import { merchantEvents } from "./eventsMerchant";
import { noChoiceEvents } from "./eventsNoChoices";
import { recurringEvents } from "./eventsRecurring";
import { storyEvents } from "./eventsStory";
import { villageAttackEvents } from "./eventsVillageAttacks";
import { woodcutterEvents } from "./eventsWoodcutter";
import { fellowshipEvents } from "./eventsFellowship";
import { attackWaveEvents } from "./eventsAttackWaves";

// Combine all actions
export const gameActions: Record<string, Action> = {
  ...villageBuildActions,
  ...caveExploreActions,
  ...caveCraftTools,
  ...caveCraftResources,
  ...caveCraftWeapons,
  ...caveMineActions,
  ...forestScoutActions,
  ...forestSacrificeActions,
  ...forestTradeActions,
  // Add new actions here
  buildBlackMonolith: villageBuildActions.buildBlackMonolith,
  buildMasterworkFoundry: villageBuildActions.buildMasterworkFoundry,
  animals: forestSacrificeActions.animals,
};

// Register gameActions with actionEffects to break circular dependency
setGameActionsRef(gameActions);

// Helper function to check if requirements are met for both building and non-building actions
const checkRequirements = (
  requirements: Record<string, any>,
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
    // Handle negation (e.g., "!story.seen.castleRuinsExplored")
    const isNegated = path.startsWith("!");
    const actualPath = isNegated ? path.slice(1) : path;

    const pathParts = actualPath.split(".");
    let current: any = state;

    for (const part of pathParts) {
      current = current?.[part];
    }

    // For story.seen properties, treat undefined/missing as false
    if (actualPath.startsWith("story.seen.")) {
      current = current ?? false;
    }

    if (typeof expectedValue === "boolean") {
      // If negated, flip the comparison
      if (isNegated) {
        return !current === expectedValue;
      }
      return current === expectedValue;
    }

    if (typeof expectedValue === "number") {
      // For buildings: 0 means exactly 0 (===), any number >=1 means >= comparison
      if (path.startsWith("buildings.")) {
        if (expectedValue === 0) {
          return (current || 0) === 0;
        } else {
          return (current || 0) >= expectedValue;
        }
      }
      // For all other numeric comparisons, use exact equality
      return (current || 0) === expectedValue;
    }

    // Handle string values that might indicate >= comparison
    if (typeof expectedValue === "string" && expectedValue.startsWith(">=")) {
      const numValue = parseFloat(expectedValue.slice(2));
      return (current || 0) >= numValue;
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

  // For building actions, also check if the next level exists
  if (action.building) {
    const nextLevel = getNextBuildingLevel(actionId, state);
    // If there's no cost defined for the next level, the building is maxed out
    if (!action.cost?.[nextLevel]) {
      return false;
    }
  }

  // Check if show_when has tiered conditions (numeric keys)
  const showWhenKeys = Object.keys(action.show_when);
  const hasTieredShowWhen =
    showWhenKeys.length > 0 && showWhenKeys.every((key) => !isNaN(Number(key)));

  if (hasTieredShowWhen) {
    // For tiered show_when (like trade actions), check if ANY tier's conditions are satisfied
    // AND that tier has a cost defined
    return showWhenKeys.some((tierKey) => {
      const tierConditions = action.show_when[tierKey as any];
      const tierHasCost = action.cost?.[tierKey as any];

      if (!tierHasCost) return false;

      return Object.entries(tierConditions).every(([key, value]) => {
        const pathParts = key.split(".");
        let current: any = state;
        for (const part of pathParts) {
          current = current?.[part];
        }

        if (key.startsWith("buildings.")) {
          if (value === 0) {
            return (current || 0) === 0;
          } else {
            return (current || 0) >= value;
          }
        }

        return (current || 0) >= value;
      });
    });
  }

  return checkRequirements(action.show_when, state, action, actionId);
};

// Helper function to calculate adjusted cost with discounts (single source of truth)
function getAdjustedCost(
  actionId: string,
  cost: number | boolean,
  isResourceCost: boolean,
  state: GameState,
): number | boolean {
  if (cost === true || cost === false) return cost;
  if (!isResourceCost) return cost;

  const action = gameActions[actionId];
  const isCraftingAction =
    actionId.startsWith("craft") || actionId.startsWith("forge");
  const isBuildingAction = action?.building || false;

  if (isCraftingAction) {
    const reduction = getTotalCraftingCostReductionCalc(state);
    return Math.floor(cost * (1 - reduction));
  }

  if (isBuildingAction) {
    const reduction = getTotalBuildingCostReductionCalc(state);
    return Math.floor(cost * (1 - reduction));
  }

  return cost;
}

// Helper function to extract resource IDs from action cost
export function getResourcesFromActionCost(
  actionId: string,
  state: GameState,
): string[] {
  const action = gameActions[actionId];
  if (!action?.cost) return [];

  const resources: string[] = [];

  // Handle different cost structures
  if (typeof action.cost === "object" && !Array.isArray(action.cost)) {
    // Check if it's a tiered cost structure (has numeric keys)
    const keys = Object.keys(action.cost);
    const firstKey = keys[0];

    if (firstKey && !isNaN(Number(firstKey))) {
      // Tiered cost - for building actions, get the next building level
      let level = 1;
      if (action.building) {
        level = getNextBuildingLevel(actionId, state);
      }

      const levelCost = action.cost[level];
      if (levelCost) {
        Object.keys(levelCost).forEach((key) => {
          if (key.startsWith("resources.")) {
            const resourceName = key.split(".")[1];
            resources.push(resourceName);
          }
        });
      }
    } else {
      // Simple cost structure
      Object.keys(action.cost).forEach((key) => {
        if (key.startsWith("resources.")) {
          const resourceName = key.split(".")[1];
          resources.push(resourceName);
        }
      });
    }
  }

  return resources;
}

// Utility function to check if requirements are met for an action
export function canExecuteAction(actionId: string, state: GameState): boolean {
  const action = gameActions[actionId];
  if (!action) return false;

  // Handle dynamic totem costs
  if (actionId === "boneTotems") {
    const dynamicCost = getBoneTotemsCost(state);
    if ((state.resources.bone_totem || 0) < dynamicCost) {
      return false;
    }
  }

  if (actionId === "leatherTotems") {
    const dynamicCost = getLeatherTotemsCost(state);
    if ((state.resources.leather_totem || 0) < dynamicCost) {
      return false;
    }
  }

  // Handle dynamic animals cost
  if (actionId === "animals") {
    const usageCount = Number(state.story?.seen?.animalsUsageCount) || 0;
    if (usageCount >= 10) {
      return false; // Max 10 uses
    }
    const dynamicCost = getAnimalsCost(state);
    if ((state.resources.food || 0) < dynamicCost) {
      return false;
    }
  }

  // Check cooldown first
  if (state.cooldowns[actionId] && state.cooldowns[actionId] > 0) {
    return false;
  }

  // Check action's custom canExecute function if it exists
  if (action.canExecute && !action.canExecute(state)) {
    return false;
  }

  let costs = action.cost;

  // For building actions, get the cost for the next level
  if (action.building) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }

  // For tiered actions (like trade actions), determine the active tier
  if (costs && typeof costs === "object") {
    const costKeys = Object.keys(costs);
    const hasTieredCost =
      costKeys.length > 0 && costKeys.every((key) => !isNaN(Number(key)));

    if (hasTieredCost) {
      // Find the active tier based on show_when conditions
      const showWhenKeys = Object.keys(action.show_when || {});
      let activeTier = 1;

      for (const tierKey of showWhenKeys) {
        const tierConditions = action.show_when[tierKey as any];
        const tierSatisfied = Object.entries(tierConditions).every(
          ([key, value]) => {
            const pathParts = key.split(".");
            let current: any = state;
            for (const part of pathParts) {
              current = current?.[part];
            }

            if (key.startsWith("buildings.")) {
              if (value === 0) {
                return (current || 0) === 0;
              } else {
                return (current || 0) >= value;
              }
            }

            return (current || 0) >= value;
          },
        );

        if (tierSatisfied) {
          activeTier = Number(tierKey);
        }
      }

      costs = costs[activeTier];
    }
  }

  if (!costs || typeof costs !== "object") return true;

  // Check if we can afford all costs
  for (const [path, requiredAmount] of Object.entries(costs)) {
    if (typeof requiredAmount !== "number") continue;

    const pathParts = path.split(".");
    let current: any = state;

    for (const part of pathParts) {
      current = current?.[part];
    }

    // For resource costs, check if we have enough (>=)
    if (path.startsWith("resources.")) {
      const adjustedCost = getAdjustedCost(
        actionId,
        requiredAmount,
        true,
        state,
      );
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
}

// Helper function to get readable action cost for display
export function getActionCostDisplay(
  actionId: string,
  state?: GameState,
): string {
  // Handle dynamic cost for bone totems
  if (actionId === "boneTotems") {
    const dynamicCost = getBoneTotemsCost(state);
    return `-${dynamicCost} Bone Totem${dynamicCost !== 1 ? "s" : ""}`;
  }

  // Handle dynamic cost for leather totems
  if (actionId === "leatherTotems") {
    const dynamicCost = getLeatherTotemsCost(state);
    return `-${dynamicCost} Leather Totem${dynamicCost !== 1 ? "s" : ""}`;
  }

  // Handle dynamic cost for animals sacrifice
  if (actionId === "animals") {
    const currentStep = state.sacrifices?.forest?.animals?.step || 1;
    const foodCost = 500 + (currentStep - 1) * 500; // 500, 1000, 1500...
    return `-${foodCost} Food`;
  }

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
      // Apply cost reductions using single source of truth
      const adjustedAmount = state
        ? getAdjustedCost(
            actionId,
            amount,
            resource.startsWith("resources."),
            state,
          )
        : amount;

      // Extract the clean resource name from paths like "resources.wood"
      const resourceName = resource.includes(".")
        ? resource.split(".").pop()
        : resource;
      // Replace underscores with spaces and capitalize each word
      const formattedName = resourceName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return `-${adjustedAmount} ${formattedName}`;
    })
    .join(", ");

  return costText;
}

// Helper function to get cost breakdown with satisfaction status
export function getActionCostBreakdown(
  actionId: string,
  state: GameState,
): Array<{ text: string; satisfied: boolean }> {
  // Handle dynamic totem costs
  if (actionId === "boneTotems") {
    const dynamicCost = getBoneTotemsCost(state);
    return [
      {
        text: `-${dynamicCost} Bone Totem${dynamicCost !== 1 ? "s" : ""}`,
        satisfied: (state.resources.bone_totem || 0) >= dynamicCost,
      },
    ];
  }

  // Handle dynamic cost for leather totems
  if (actionId === "leatherTotems") {
    const dynamicCost = getLeatherTotemsCost(state);
    return [
      {
        text: `-${dynamicCost} Leather Totem${dynamicCost !== 1 ? "s" : ""}`,
        satisfied: (state.resources.leather_totem || 0) >= dynamicCost,
      },
    ];
  }

  // Handle dynamic cost for humans sacrifice
  if (actionId === "humans") {
    const dynamicCost = getHumansCost(state);
    const totalVillagers = Object.values(state.villagers).reduce(
      (sum, count) => sum + (count || 0),
      0,
    );
    return [
      {
        text: `-${dynamicCost} Villager${dynamicCost !== 1 ? "s" : ""}`,
        satisfied: totalVillagers >= dynamicCost,
      },
    ];
  }

  // Handle dynamic cost for animals sacrifice
  if (actionId === "animals") {
    const dynamicCost = getAnimalsCost(state);
    return [
      {
        text: `-${dynamicCost} Food`,
        satisfied: (state.resources.food || 0) >= dynamicCost,
      },
    ];
  }

  const action = gameActions[actionId];
  if (!action?.cost) return [];

  let costs = action.cost;

  // For building actions, get the cost for the next level
  if (action.building) {
    const level = getNextBuildingLevel(actionId, state);
    costs = action.cost[level];
  }

  // For tiered actions (like trade actions), determine the active tier
  const costKeys = Object.keys(costs);
  const hasTieredCost =
    costKeys.length > 0 && costKeys.every((key) => !isNaN(Number(key)));

  if (hasTieredCost) {
    // Find the active tier based on show_when conditions
    const showWhenKeys = Object.keys(action.show_when || {});
    let activeTier = 1;

    for (const tierKey of showWhenKeys) {
      const tierConditions = action.show_when[tierKey as any];
      const tierSatisfied = Object.entries(tierConditions).every(
        ([key, value]) => {
          const pathParts = key.split(".");
          let current: any = state;
          for (const part of pathParts) {
            current = current?.[part];
          }

          if (key.startsWith("buildings.")) {
            if (value === 0) {
              return (current || 0) === 0;
            } else {
              return (current || 0) >= value;
            }
          }

          return (current || 0) >= value;
        },
      );

      if (tierSatisfied) {
        activeTier = Number(tierKey);
      }
    }

    costs = costs[activeTier];
  }

  if (!costs || Object.keys(costs).length === 0) return [];

  const breakdown: Array<{ text: string; satisfied: boolean }> = [];
  const { resources } = state; // Destructure resources for easier access

  Object.entries(costs).forEach(([resource, amount]) => {
    // Extract the clean resource name from paths like "resources.wood"
    const resourceName = resource.includes(".")
      ? resource.split(".").pop()!
      : resource;

    // Apply cost reductions using single source of truth
    const adjustedAmount = getAdjustedCost(
      actionId,
      amount as number, // Cast amount to number as it's expected here
      resource.startsWith("resources."),
      state,
    );

    // Replace underscores with spaces and capitalize each word
    const resourceNameFormatted = resourceName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Handle boolean true values as -1
    const displayCost = adjustedAmount === true ? 1 : adjustedAmount;

    // Check if we can afford this cost
    let satisfied: boolean;
    if (amount === true) {
      // For boolean costs (relics), check in the relics object
      satisfied = Boolean(
        state.relics[resourceName as keyof typeof state.relics],
      );
    } else {
      // For numeric costs, check if we have enough
      satisfied =
        (resources[resourceName as keyof typeof resources] || 0) >= displayCost;
    }

    breakdown.push({
      text: `-${displayCost} ${resourceNameFormatted}`,
      satisfied,
    });
  });

  return breakdown;
}

// Combine all event types
export const allEvents: Record<string, GameEvent> = {
  ...caveEvents,
  ...huntEvents,
  ...storyEvents,
  ...loreEvents,
  ...madnessEvents,
  ...noChoiceEvents,
  ...recurringEvents,
  ...woodcutterEvents,
  ...villageAttackEvents,
  ...attackWaveEvents,
  ...choiceEvents,
  ...cubeEvents,
  ...feastEvents,
  ...merchantEvents,
  ...fellowshipEvents,
};
