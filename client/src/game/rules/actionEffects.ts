import { Action, GameState } from "@shared/schema";
import {
  getTotalCraftingCostReduction as getTotalCraftingCostReductionCalc,
  getTotalBuildingCostReduction as getTotalBuildingCostReductionCalc,
  getActionBonuses as getActionBonusesCalc,
  getTotalLuck as getTotalLuckCalc,
} from "./effectsCalculation";
import {
  getUpgradeBonusMultiplier,
  ACTION_TO_UPGRADE_KEY,
} from "../buttonUpgrades";
import { getNextBuildingLevel } from "./villageBuildActions";
import { getAdjustedCost } from "./index";

const FOCUS_ELIGIBLE_ACTIONS = [
  "exploreCave",
  "ventureDeeper",
  "descendFurther",
  "exploreRuins",
  "exploreTemple",
  "exploreCitadel",
  "mineCoal",
  "mineIron",
  "mineSulfur",
  "mineObsidian",
  "mineAdamant",
  "mineMoonstone",
  "hunt",
  "chopWood",
];

// Import gameActions - we'll use a getter function to avoid circular dependency
let gameActionsRef: Record<string, Action> | null = null;

export function setGameActionsRef(actions: Record<string, Action>) {
  gameActionsRef = actions;
}

function getGameActions(): Record<string, Action> {
  if (!gameActionsRef) {
    throw new Error(
      "gameActions not initialized. Call setGameActionsRef first.",
    );
  }
  return gameActionsRef;
}

const evaluateCondition = (condition: string, state: GameState): boolean => {
  const isNegated = condition.startsWith("!");
  const path = isNegated ? condition.slice(1) : condition;
  const pathParts = path.split(".");
  let current: any = state;

  for (const part of pathParts) {
    current = current?.[part];
    // If property doesn't exist at any point in the path, treat as false
    if (current === undefined) {
      current = false;
      break;
    }
  }

  return isNegated ? !current : !!current;
};

// Main export: applyActionEffects
export function applyActionEffects(
  actionId: string,
  state: GameState,
): Partial<GameState> {
  const action = getGameActions()[actionId];
  if (!action) return {};

  const updates: Partial<GameState> & {
    logMessages?: string[];
    triggeredEvents?: string[];
  } = {};

  // Apply costs (as negative effects)
  if (action.cost) {
    let costs = action.cost;

    if (action.building) {
      const level = getNextBuildingLevel(actionId, state);
      costs = action.cost[level];
    }

    const costKeys = Object.keys(costs);
    const hasTieredCost =
      costKeys.length > 0 && costKeys.every((key) => !isNaN(Number(key)));

    if (hasTieredCost) {
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

    if (costs) {
      Object.entries(costs).forEach(([path, cost]) => {
        if (typeof cost === "number") {
          const pathParts = path.split(".");
          let current: any = updates;

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

          // Use centralized cost adjustment function (same as tooltip)
          const adjustedCost = getAdjustedCost(
            actionId,
            cost,
            path.startsWith("resources."),
            state,
          );

          current[finalKey] = (current[finalKey] || 0) - (typeof adjustedCost === 'number' ? adjustedCost : 0);
        }
      });
    }
  }

  // Apply effects
  if (action.effects) {
    let effects = action.effects;

    const effectKeys = Object.keys(effects);
    const hasTieredEffects =
      effectKeys.length > 0 && effectKeys.every((key) => !isNaN(Number(key)));

    if (hasTieredEffects) {
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

      effects = effects[activeTier];
    }

    for (const [path, effect] of Object.entries(effects)) {
      const pathParts = path.split(".");
      let current: any = updates;

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

      if (typeof effect === "function") {
        const computedValue = effect(state);
        current[finalKey] = computedValue;
      } else if (typeof effect === "string" && effect.startsWith("random(")) {
        const match = effect.match(/random\((\d+),(\d+)\)/);
        if (match) {
          let min = parseInt(match[1]);
          let max = parseInt(match[2]);

          const isSacrificeAction =
            actionId === "boneTotems" || actionId === "leatherTotems";

          if (isSacrificeAction) {
            const usageCountKey =
              actionId === "boneTotems"
                ? "boneTotemsUsageCount"
                : "leatherTotemsUsageCount";
            const usageCount = Number(state.story?.seen?.[usageCountKey]) || 0;
            const cappedUsageCount = Math.min(usageCount, 20);
            min += cappedUsageCount;
            max += cappedUsageCount;

            const actionBonuses = getActionBonusesCalc(actionId, state);
            if (actionBonuses?.resourceMultiplier > 1) {
              min = Math.floor(min * actionBonuses.resourceMultiplier);
              max = Math.floor(max * actionBonuses.resourceMultiplier);
            }

            // Generate and assign the random value for sacrifice actions
            const baseAmount =
              Math.floor(Math.random() * (max - min + 1)) + min;
            const originalAmount =
              state.resources[finalKey as keyof typeof state.resources] || 0;
            current[finalKey] = originalAmount + baseAmount;
          } else if (!isSacrificeAction) {
            const actionBonuses = getActionBonusesCalc(actionId, state);
            if (
              actionBonuses?.resourceBonus?.[
                finalKey as keyof typeof actionBonuses.resourceBonus
              ]
            ) {
              const bonus =
                actionBonuses.resourceBonus[
                  finalKey as keyof typeof actionBonuses.resourceBonus
                ];
              min += bonus;
              max += bonus;
            }

            let totalMultiplier = actionBonuses?.resourceMultiplier || 1;

            const caveExploreActions = [
              "exploreCave",
              "ventureDeeper",
              "descendFurther",
              "exploreRuins",
              "exploreTemple",
              "exploreCitadel",
            ];
            if (caveExploreActions.includes(actionId)) {
              totalMultiplier *= actionBonuses?.caveExploreMultiplier || 1;
            }

            if (totalMultiplier !== 1) {
              min = Math.floor(min * totalMultiplier);
              max = Math.floor(max * totalMultiplier);
            }

            // Apply focus multiplier for eligible actions (exclude sacrifice actions)
            if (
              !isSacrificeAction &&
              FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
              state.focusState?.isActive &&
              state.focusState.endTime > Date.now()
            ) {
              min = Math.floor(min * 2);
              max = Math.floor(max * 2);
            }

            const baseAmount =
              Math.floor(Math.random() * (max - min + 1)) + min;
            const originalAmount =
              state.resources[finalKey as keyof typeof state.resources] || 0;
            current[finalKey] = originalAmount + baseAmount;
          }
        }
      } else if (
        typeof effect === "object" &&
        effect !== null &&
        "probability" in effect
      ) {
        const probabilityEffect = effect as {
          probability: number | ((state: GameState) => number);
          value:
            | number
            | string
            | boolean
            | {
                probability: number;
                value: number | string | boolean;
                logMessage?: string;
                isChoice?: boolean;
                eventId?: string;
              };
          logMessage?: string;
          condition?: string;
          triggerEvent?: string;
          isChoice?: boolean;
          eventId?: string;
        };

        let conditionMet = true;
        if (probabilityEffect.condition) {
          if (typeof probabilityEffect.condition === "function") {
            conditionMet = probabilityEffect.condition(state);
          } else {
            conditionMet = evaluateCondition(
              probabilityEffect.condition,
              state,
            );
          }
        }

        const baseProbability =
          typeof probabilityEffect.probability === "function"
            ? probabilityEffect.probability(state)
            : probabilityEffect.probability;

        const totalLuck = getTotalLuckCalc(state);
        const luckBonus = totalLuck / 100;
        const adjustedProbability = Math.min(
          baseProbability + baseProbability * luckBonus,
          1.0,
        );
        const shouldTrigger =
          conditionMet && Math.random() < adjustedProbability;

        if (shouldTrigger) {
          if (probabilityEffect.isChoice && probabilityEffect.eventId) {
            // Skip applying the item value for choice events
            continue;
          }

          if (
            typeof probabilityEffect.value === "string" &&
            probabilityEffect.value.startsWith("random(")
          ) {
            const match = probabilityEffect.value.match(
              /random\((\d+),(\d+)\)/,
            );
            if (match) {
              let min = parseInt(match[1]);
              let max = parseInt(match[2]);

              const actionBonuses = getActionBonusesCalc(actionId, state);
              if (
                actionBonuses?.resourceBonus?.[
                  finalKey as keyof typeof actionBonuses.resourceBonus
                ]
              ) {
                const bonus =
                  actionBonuses.resourceBonus[
                    finalKey as keyof typeof actionBonuses.resourceBonus
                  ];
                min += bonus;
                max += bonus;
              }

              let totalMultiplier = actionBonuses?.resourceMultiplier || 1;
              const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];
              if (upgradeKey && state.books?.book_of_ascension) {
                const upgradeMultiplier = getUpgradeBonusMultiplier(
                  upgradeKey,
                  state,
                );
                totalMultiplier = totalMultiplier * upgradeMultiplier;
              }

              if (totalMultiplier !== 1) {
                min = Math.floor(min * totalMultiplier);
                max = Math.floor(max * totalMultiplier);
              }

              // Apply focus multiplier for eligible actions
              if (
                FOCUS_ELIGIBLE_ACTIONS.includes(actionId) &&
                state.focusState?.isActive &&
                state.focusState.endTime > Date.now()
              ) {
                min = Math.floor(min * 2);
                max = Math.floor(max * 2);
              }

              const randomAmount =
                Math.floor(Math.random() * (max - min + 1)) + min;

              if (pathParts[0] === "resources") {
                current[finalKey] =
                  (state.resources[finalKey as keyof typeof state.resources] ||
                    0) + randomAmount;
              } else {
                current[finalKey] = randomAmount;
              }
            }
          } else if (typeof probabilityEffect.value === "number") {
            if (pathParts[0] === "resources") {
              current[finalKey] =
                (state.resources[finalKey as keyof typeof state.resources] ||
                  0) + probabilityEffect.value;
            } else {
              current[finalKey] = probabilityEffect.value;
            }
          } else if (typeof probabilityEffect.value === "boolean") {
            current[finalKey] = probabilityEffect.value;
          }
        }

        if (shouldTrigger && probabilityEffect.logMessage) {
          if (!updates.logMessages) updates.logMessages = [];
          updates.logMessages.push(probabilityEffect.logMessage);
        }

        if (shouldTrigger && probabilityEffect.triggerEvent) {
          if (!updates.triggeredEvents) updates.triggeredEvents = [];
          updates.triggeredEvents.push(probabilityEffect.triggerEvent);
        }
      } else if (typeof effect === "number") {
        if (pathParts[0] === "resources") {
          current[finalKey] =
            (state.resources[finalKey as keyof typeof state.resources] || 0) +
            effect;
        } else if (path === "madness") {
          current[finalKey] = (state.madness || 0) + effect;
        } else {
          current[finalKey] = effect;
        }
      } else if (typeof effect === "boolean") {
        current[finalKey] = effect;
      } else if (pathParts[0] === "tools") {
        current[finalKey] = effect;
      } else if (pathParts[0] === "clothing") {
        current[finalKey] = effect;
      }
    }
  }

  if (updates.resources) {
    const actionBonuses = getActionBonusesCalc(actionId, state);

    if (actionBonuses.resourceBonus) {
      Object.entries(actionBonuses.resourceBonus).forEach(
        ([resource, bonus]) => {
          if (updates.resources![resource] !== undefined) {
            updates.resources![resource] += bonus;
          }
        },
      );
    }
  }

  if (state.devMode && updates.resources) {
    for (const [resource, amount] of Object.entries(updates.resources)) {
      if (typeof amount === "number") {
        const currentAmount =
          state.resources[resource as keyof typeof state.resources] || 0;
        const addedAmount = amount - currentAmount;
        if (addedAmount > 0) {
          updates.resources[resource] = currentAmount + addedAmount * 100;
        }
      }
    }
  }

  return updates;
}