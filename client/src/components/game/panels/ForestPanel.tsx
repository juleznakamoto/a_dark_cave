import React from "react";
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  calculateSuccessChance,
} from "@/game/rules";
import { getResourceGainTooltip } from "@/game/rules/tooltips";
import CooldownButton from "@/components/CooldownButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ButtonLevelBadge } from "@/components/game/ButtonLevelBadge";
import { ACTION_TO_UPGRADE_KEY } from "@/game/buttonUpgrades";

export default function ForestPanel() {
  const { executeAction } = useGameStore();
  const state = useGameStore();

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "",
      actions: [
        { id: "chopWood", label: "Chop Wood" },
        { id: "hunt", label: "Hunt" },
        { id: "layTrap", label: "Lay Trap" },
        { id: "damagedTower", label: "Damaged Tower" },
        { id: "castleRuins", label: "Castle Ruins" },
        { id: "hillGrave", label: "Hill Grave" },
        { id: "sunkenTemple", label: "Sunken Temple" },
      ],
    },
    {
      title: "Sacrifice",
      actions: [
        { id: "boneTotems", label: "Bone Totems" },
        { id: "leatherTotems", label: "Leather Totems" },
        { id: "animals", label: "Animals" },
        { id: "humans", label: "Villagers" },
      ],
    },
    {
      title: "Trade",
      actions: [
        { id: "tradeGoldForFood", label: "Buy Food" },
        { id: "tradeGoldForWood", label: "Buy Wood" },
        { id: "tradeGoldForStone", label: "Buy Stone" },
        { id: "tradeGoldForLeather", label: "Buy Leather" },
        { id: "tradeGoldForSteel", label: "Buy Steel" },
        { id: "tradeGoldForObsidian", label: "Buy Obsidian" },
        { id: "tradeGoldForAdamant", label: "Buy Adamant" },
        { id: "tradeGoldForTorch", label: "Buy Torch" },
        { id: "tradeGoldForEmberBomb", label: "Buy Silver" },
        { id: "tradeGoldForAshfireBomb", label: "Buy Ashfire Bomb" },
        { id: "tradeSilverForGold", label: "Buy Gold" },
      ],
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    const canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;
    const isTradeButton = actionId.startsWith("trade");

    // Check if this action is a forest scout action
    const isForestScoutAction = [
      "layTrap",
      "damagedTower",
      "castleRuins",
      "hillGrave",
      "sunkenTemple",
    ].includes(actionId);
    const successPercentage = isForestScoutAction
      ? calculateSuccessChance(actionId, state)
      : null;

    // Check if this action is chopWood, hunt, or sacrifice action
    const isChopWood = actionId === "chopWood";
    const isHunt = actionId === "hunt";
    const isSacrificeAction =
      actionId === "boneTotems" || actionId === "leatherTotems";
    const isAnimalsSacrifice = actionId === "animals";
    const isHumansSacrifice = actionId === "humans";
    const resourceGainTooltip =
      isChopWood || isHunt || isSacrificeAction
        ? getResourceGainTooltip(actionId, state)
        : null;

    // Get dynamic label for trade buttons based on the amount
    let displayLabel = label;
    if (isTradeButton && action.effects) {
      // Determine which tier is active based on show_when conditions
      let activeTier = 1;

      // Check tier 3 first (highest tier)
      if (action.show_when?.[3]) {
        const tier3Conditions = action.show_when[3];
        const tier3Satisfied = Object.entries(tier3Conditions).every(
          ([key, value]) => {
            const [category, prop] = key.split(".");
            return (
              (state[category as keyof typeof state]?.[prop as any] || 0) >=
              value
            );
          },
        );
        if (tier3Satisfied) {
          activeTier = 3;
        }
      }

      // Check tier 2 if tier 3 not satisfied
      if (activeTier === 1 && action.show_when?.[2]) {
        const tier2Conditions = action.show_when[2];
        const tier2Satisfied = Object.entries(tier2Conditions).every(
          ([key, value]) => {
            const [category, prop] = key.split(".");
            return (
              (state[category as keyof typeof state]?.[prop as any] || 0) >=
              value
            );
          },
        );
        if (tier2Satisfied) {
          activeTier = 2;
        }
      }

      // Get the effect amount for the active tier
      const effects = action.effects[activeTier];
      if (effects) {
        const resourceKey = Object.keys(effects)[0];
        const amount = effects[resourceKey];
        const resourceName = resourceKey.split(".")[1];
        // Replace underscores with spaces and capitalize
        const formattedName = resourceName
          .replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        displayLabel = `Buy ${amount} ${formattedName}`;
      }
    }

    // Check if this action has upgrade tracking
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];

    if (showCost || resourceGainTooltip || successPercentage) {
      let tooltipContent;

      if (resourceGainTooltip) {
        // For actions with resource gains (chopWood, hunt, sacrifice)
        tooltipContent = resourceGainTooltip;
      } else if (showCost || successPercentage) {
        // For actions with costs and/or success chance
        const costBreakdown = showCost ? getActionCostBreakdown(actionId, state) : [];
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {costBreakdown.map((cost, index) => (
              <div
                key={index}
                className={`${
                  cost.satisfied ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {cost.text}
              </div>
            ))}
            {successPercentage && (
              <>
                {costBreakdown.length > 0 && <div className="border-t border-border my-1" />}
                <div className="text-foreground">
                  Success Chance: {successPercentage}
                </div>
              </>
            )}
          </div>
        );
      }

      const button = (
        <CooldownButton
          key={actionId}
          onClick={() => executeAction(actionId)}
          cooldownMs={action.cooldown * 1000}
          data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
          button_id={actionId}
          size="xs"
          disabled={!canExecute}
          variant="outline"
          className={`hover:bg-transparent hover:text-foreground ${isTradeButton ? "w-fit" : ""}`}
          tooltip={tooltipContent}
        >
          {displayLabel}
        </CooldownButton>
      );

      return upgradeKey ? (
        <div key={actionId} className="relative inline-block">
          {button}
          <ButtonLevelBadge upgradeKey={upgradeKey} />
        </div>
      ) : (
        button
      );
    }

    const button = (
      <CooldownButton
        key={actionId}
        onClick={() => executeAction(actionId)}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        data-analytics-id={actionId}
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className={`hover:bg-transparent hover:text-foreground ${isTradeButton ? "w-fit" : ""}`}
      >
        {displayLabel}
      </CooldownButton>
    );

    return upgradeKey ? (
      <div key={actionId} className="relative inline-block">
        {button}
        <ButtonLevelBadge upgradeKey={upgradeKey} />
      </div>
    ) : (
      button
    );
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 mt-2">
        {actionGroups.map((group, groupIndex) => {
          const visibleActions = group.actions.filter((action) =>
            shouldShowAction(action.id, state),
          );

          if (visibleActions.length === 0) return null;

          return (
            <div key={groupIndex} className="space-y-2">
              {group.title && (
                <h3 className="text-xs font-bold text-foreground">
                  {group.title}
                </h3>
              )}
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {visibleActions.map((action, index) => (
                  <div key={action.id} className="contents">
                    {renderButton(action.id, action.label)}
                    {group.title === "Trade" &&
                      (index + 1) % 4 === 0 &&
                      index !== visibleActions.length - 1 && (
                        <div className="basis-full h-0" />
                      )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}