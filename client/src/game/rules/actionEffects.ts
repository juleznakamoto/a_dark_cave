import { GameState } from "@shared/schema";
import {
  getMaxBombLimit,
  isBombResource,
  BOMB_RESOURCES,
} from "@/game/resourceLimits";
import {
  getActionBonuses as getActionBonusesCalc,
  getTotalLuck as getTotalLuckCalc,
} from "./effectsCalculation";
import {
  getUpgradeBonusMultiplier,
  ACTION_TO_UPGRADE_KEY,
} from "../buttonUpgrades";
import { getNextBuildingLevel } from "./villageBuildActions";
import { calculateAdjustedCost } from "./costCalculation";
import { clothingEffects } from "./effects";

export const FOCUS_ELIGIBLE_ACTIONS = [
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

import { CROWS_EYE_UPGRADES } from "./skillUpgrades";
import { getGameActions } from "./actionsRegistry";

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

/**
 * Applies only the cost portion of an action (without effects).
 * Used to deduct resources immediately when execution starts.
 */
export function applyActionCostsOnly(actionId: string, state: GameState): Partial<GameState> {
  const action = getGameActions()[actionId];
  if (!action?.cost) return {};

  const updates: Partial<GameState> = {};
  let costs: Record<string, any> =
    typeof action.cost === "function" ? action.cost(state) : action.cost;

  if (action.building && typeof action.cost !== "function") {
    const level = getNextBuildingLevel(actionId, state);
    costs = (action.cost as Record<number, Record<string, any>>)[level];
  }

  const costKeys = Object.keys(costs || {});
  const hasTieredCost = costKeys.length > 0 && costKeys.every((key) => !isNaN(Number(key)));

  if (hasTieredCost) {
    const showWhenKeys = Object.keys(action.show_when || {});
    let activeTier = 1;

    for (const tierKey of showWhenKeys) {
      const tierConditions = action.show_when?.[tierKey as any];
      if (!tierConditions) continue;

      const tierSatisfied = Object.entries(tierConditions).every(([key, value]) => {
        const pathParts = key.split(".");
        let current: any = state;
        for (const part of pathParts) {
          current = current?.[part];
        }
        if (key.startsWith("buildings.")) {
          if (value === 0) return (current || 0) === 0;
          else return (current || 0) >= value;
        }
        return (current || 0) >= value;
      });

      if (tierSatisfied) activeTier = Number(tierKey);
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
        const gameActionsRef = getGameActions();
        const actionDef = gameActionsRef[actionId];

        const adjustedCost = calculateAdjustedCost(
          actionId,
          cost,
          path.startsWith("resources."),
          state,
          actionDef?.category as "crafting" | "building" | undefined,
        );

        const stateAmount = path.startsWith("resources.")
          ? (state.resources[finalKey as keyof typeof state.resources] || 0)
          : (state[pathParts[0] as keyof typeof state]?.[finalKey as any] || 0);

        current[finalKey] = stateAmount - adjustedCost;
      } else if (cost === true) {
        // Boolean cost: consume the item by setting it to false (e.g. schematics, relics)
        const pathParts = path.split(".");
        let current: any = updates;

        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          if (!current[part]) {
            current[part] =
              pathParts[i] === "schematics"
                ? { ...state.schematics }
                : pathParts[i] === "relics"
                  ? { ...state.relics }
                  : pathParts[i] === "resources"
                    ? { ...state.resources }
                    : {};
          }
          current = current[part];
        }

        const finalKey = pathParts[pathParts.length - 1];
        current[finalKey] = false;
      }
    });
  }

  return updates;
}

function rollResourceGain(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  // Check for action bonus chance (Tarnished Compass effect)
  const BONUS_CHANCE_ELIGIBLE_ACTIONS = [
    "exploreCave",
    "ventureDeeper",
    "descendFurther",
    "exploreRuins",
    "exploreTemple",
    "exploreCitadel",
    "mineStone",
    "mineIron",
    "mineCoal",
    "mineSulfur",
    "mineObsidian",
    "mineAdamant",
    "chopWood",
    "hunt",
  ];

  let actionBonusChanceTriggered = false;
  if (BONUS_CHANCE_ELIGIBLE_ACTIONS.includes(actionId)) {
    // Get total actionBonusChance from effects
    let totalActionBonusChance = 0;

    // Check relics for actionBonusChance (Tarnished Compass)
    if (state.relics?.tarnished_compass) {
      const compassEffect = clothingEffects.tarnished_compass;
      totalActionBonusChance += compassEffect.bonuses.generalBonuses?.actionBonusChance || 0;
    }

    // Check Crow's Eye skill for additional actionBonusChance
    if (state.crowsEyeSkills?.level > 0) {
      const upgrade = CROWS_EYE_UPGRADES.find(u => u.level === state.crowsEyeSkills.level);
      if (upgrade) {
        totalActionBonusChance += upgrade.doubleChance / 100;
      }
    }

    // Roll for bonus chance
    if (totalActionBonusChance > 0 && Math.random() < totalActionBonusChance) {
      actionBonusChanceTriggered = true;
    }
  }

  // Apply costs (as negative effects) - skip if costs already consumed at execution start
  const isCompletingExecution = (state as any)._completingExecution === actionId;
  if (!isCompletingExecution) {
    const costUpdates = applyActionCostsOnly(actionId, state);
    Object.keys(costUpdates).forEach((key) => {
      (updates as any)[key] = (costUpdates as any)[key];
    });
  }

  // Apply effects
  if (action.effects) {
    // Resolve effects (can be object or function)
    let effects = typeof action.effects === 'function'
      ? action.effects(state)
      : action.effects;

    const effectKeys = Object.keys(effects);
    const hasTieredEffects =
      effectKeys.length > 0 && effectKeys.every((key) => !isNaN(Number(key)));

    if (hasTieredEffects) {
      const showWhenKeys = Object.keys(action.show_when || {});
      let activeTier = 1;

      for (const tierKey of showWhenKeys) {
        const tierConditions = action.show_when?.[tierKey as any];
        if (!tierConditions) continue;

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
            // Bone totems: usage-based silver bonus (Pale Cross amplifies it)
            if (actionId === "boneTotems") {
              const usageCount =
                Number(state.story?.seen?.boneTotemsUsageCount) || 0;
              const hasPaleCross =
                (state.buildings?.paleCross || 0) >= 1 ||
                (state.buildings?.consecratedPaleCross || 0) >= 1;
              const cappedUsageCount = Math.min(
                usageCount,
                hasPaleCross ? 45 : 20,
              );
              const silverBonusPerLevel = hasPaleCross ? 4 : 2;
              min += cappedUsageCount * silverBonusPerLevel;
              max += cappedUsageCount * silverBonusPerLevel;
            }
            // Leather totems: +2 gold per usage, capped at 20
            else if (actionId === "leatherTotems") {
              const usageCount =
                Number(state.story?.seen?.leatherTotemsUsageCount) || 0;
              const cappedUsageCount = Math.min(usageCount, 20);
              min += cappedUsageCount * 2;
              max += cappedUsageCount * 2;
            }

            const actionBonuses = getActionBonusesCalc(actionId, state);

            // Apply multiplier first (like Bone Temple or Sacrificial Tunic)
            if (actionBonuses?.resourceMultiplier > 1) {
              min = Math.floor(min * actionBonuses.resourceMultiplier);
              max = Math.floor(max * actionBonuses.resourceMultiplier);
            }

            // Apply flat bonuses after multiplier (like devourer_crown +20 silver)
            const flatBonus = actionBonuses?.resourceBonus?.[finalKey] || 0;
            if (flatBonus > 0) {
              min += flatBonus;
              max += flatBonus;
            }

            // Generate and assign the random value for sacrifice actions
            const baseAmount = rollResourceGain(min, max);
            const originalAmount =
              state.resources[finalKey as keyof typeof state.resources] || 0;
            current[finalKey] = originalAmount + baseAmount;

            // Consecrated Pale Cross: bone totem sacrifices also grant gold.
            if (
              actionId === "boneTotems" &&
              finalKey === "silver" &&
              (state.buildings?.consecratedPaleCross || 0) >= 1
            ) {
              const goldBonus = Math.floor(Math.random() * 51) + 50; // 50-100
              const existingGold =
                typeof current.gold === "number"
                  ? current.gold
                  : (state.resources.gold || 0);
              current.gold = existingGold + goldBonus;
            }
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
              // Add cave explore bonus additively, not multiplicatively
              totalMultiplier += (actionBonuses?.caveExploreMultiplier || 1) - 1;
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

            const baseAmount = rollResourceGain(min, max);
            const originalAmount =
              state.resources[finalKey as keyof typeof state.resources] || 0;
            current[finalKey] = originalAmount + baseAmount;
          }
        }
      } else if (
        typeof effect === "object" &&
        effect !== null &&
        typeof effect === "object" &&
        "probability" in (effect as object)
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
          alsoSet?: Record<string, boolean | number>;
          addTo?: string;
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
            // Add the event to triggeredEvents so the UI can display the choice
            if (!updates.triggeredEvents) updates.triggeredEvents = [];
            updates.triggeredEvents.push(probabilityEffect.eventId);
            // Skip applying the item value - will be handled when player makes the choice
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

              const rolledAmount =
                pathParts[0] === "resources"
                  ? rollResourceGain(min, max)
                  : Math.floor(Math.random() * (max - min + 1)) + min;

              if (pathParts[0] === "resources") {
                current[finalKey] =
                  (state.resources[finalKey as keyof typeof state.resources] ||
                    0) + rolledAmount;
              } else {
                current[finalKey] = rolledAmount;
              }
            }
          } else if (typeof probabilityEffect.value === "number") {
            const targetPath = probabilityEffect.addTo || path;
            const targetParts = targetPath.split(".");
            const targetKey = targetParts[targetParts.length - 1];
            if (targetParts[0] === "resources") {
              if (!updates.resources) updates.resources = { ...state.resources };
              updates.resources[targetKey as keyof typeof updates.resources] =
                (updates.resources[targetKey as keyof typeof updates.resources] ??
                  state.resources[targetKey as keyof typeof state.resources] ??
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

        if (shouldTrigger && probabilityEffect.alsoSet) {
          Object.entries(probabilityEffect.alsoSet).forEach(
            ([alsoPath, alsoValue]) => {
              const alsoParts = alsoPath.split(".");
              if (alsoPath.startsWith("story.seen.")) {
                const key = alsoPath.replace("story.seen.", "");
                updates.story = {
                  ...state.story,
                  seen: {
                    ...state.story?.seen,
                    ...updates.story?.seen,
                    [key]: alsoValue,
                  },
                };
              } else {
                let target: any = updates;
                for (let i = 0; i < alsoParts.length - 1; i++) {
                  const part = alsoParts[i];
                  if (!target[part]) target[part] = {};
                  target = target[part];
                }
                target[alsoParts[alsoParts.length - 1]] = alsoValue;
              }
            },
          );
        }

        if (shouldTrigger && probabilityEffect.triggerEvent) {
          if (!updates.triggeredEvents) updates.triggeredEvents = [];
          updates.triggeredEvents.push(probabilityEffect.triggerEvent);
        }
      } else if (typeof effect === "number") {
        if (pathParts[0] === "resources") {
          // Apply resource multiplier (e.g. Disgraced Prior) for resource gains
          const actionBonuses = getActionBonusesCalc(actionId, state);
          const mult = actionBonuses?.resourceMultiplier ?? 1;
          const adjustedEffect = Math.floor(effect * mult);
          let newValue =
            (state.resources[finalKey as keyof typeof state.resources] || 0) +
            adjustedEffect;
          // Cap bombs to max (10 base, 20 with Grenadier's Bag)
          if (isBombResource(finalKey)) {
            newValue = Math.min(newValue, getMaxBombLimit(state));
          }
          current[finalKey] = newValue;
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

  // Don't apply resource bonuses here for sacrifice actions - they're already applied in the sacrifice logic
  const isSacrificeAction = actionId === "boneTotems" || actionId === "leatherTotems";

  if (updates.resources && !isSacrificeAction) {
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

  // Apply action bonus chance (2x multiplier) AFTER all other bonuses
  if (actionBonusChanceTriggered && updates.resources) {
    const originalResources = { ...state.resources };

    Object.keys(updates.resources).forEach((resource) => {
      const originalAmount = originalResources[resource as keyof typeof originalResources] || 0;
      const newAmount = updates.resources![resource];
      const gainedAmount = newAmount - originalAmount;

      // Double the gained amount
      if (gainedAmount > 0) {
        updates.resources![resource] = originalAmount + (gainedAmount * 2);
      }
    });

    // Mark that the compass bonus was triggered (for button glow effect)
    (updates as any).compassBonusTriggered = true;
  }

  // Accumulate resource gains for basic achievements (totalWoodGathered, etc.)
  const RESOURCE_ACCUMULATOR_KEYS: Record<string, string> = {
    wood: "totalWoodGathered",
    stone: "totalStoneGathered",
    iron: "totalIronGathered",
    coal: "totalCoalGathered",
    food: "totalFoodGathered",
  };
  if (updates.resources) {
    const storySeenUpdates: Record<string, number> = {};
    for (const [resource, seenKey] of Object.entries(RESOURCE_ACCUMULATOR_KEYS)) {
      const newVal =
        (updates.resources as Record<string, number>)[resource] ??
        state.resources[resource as keyof typeof state.resources] ??
        0;
      const oldVal =
        state.resources[resource as keyof typeof state.resources] ?? 0;
      const delta = Math.max(0, newVal - oldVal);
      if (delta > 0) {
        const prev = Number(state.story?.seen?.[seenKey]) || 0;
        storySeenUpdates[seenKey] = prev + delta;
      }
    }
    if (Object.keys(storySeenUpdates).length > 0) {
      updates.story = {
        ...state.story,
        seen: {
          ...state.story?.seen,
          ...(updates.story as { seen?: Record<string, unknown> })?.seen,
          ...storySeenUpdates,
        },
      };
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

  // Cap bomb resources to max (10 base, 20 with Grenadier's Bag)
  if (updates.resources) {
    const maxBombs = getMaxBombLimit(state);
    for (const bombKey of BOMB_RESOURCES) {
      if (
        updates.resources[bombKey] !== undefined &&
        updates.resources[bombKey] > maxBombs
      ) {
        updates.resources[bombKey] = maxBombs;
      }
    }
  }

  return updates;
}