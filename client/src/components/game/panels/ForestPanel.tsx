import React, { useState, useRef } from "react";
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import {
  getResourceGainTooltip,
  getActionDurationLine,
} from "@/game/rules/tooltips";
import { FOCUS_ELIGIBLE_ACTIONS } from "@/game/rules/actionEffects";
import { getFocusTooltipHeaderTrailing } from "@/game/rules/focusTooltipIndicator";
import { getResourceLimit, isResourceLimited } from "@/game/resourceLimits";
import CooldownButton from "@/components/CooldownButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ButtonLevelBadge } from "@/components/game/ButtonLevelBadge";
import { ButtonPriorBadge } from "@/components/game/ButtonPriorBadge";
import {
  ACTION_TO_UPGRADE_KEY,
  PRIOR_ELIGIBLE_ACTIONS,
} from "@/game/buttonUpgrades";
import { resolveActionLabel } from "@/i18n/actionLabels";
import { getResourceName } from "@/i18n/resolveGameText";
import { resolveActionTooltipEffects } from "@/i18n/tooltipLabels";
import { useTranslation } from "react-i18next";
import {
  SuccessChanceTooltipContent,
  hasSuccessChanceTooltip,
} from "@/components/game/EventChoiceSuccessTooltip";
import {
  BubblyButtonGlobalPortal,
} from "@/components/ui/bubbly-button";
import {
  generateParticleData,
  getBubbleRemoveDelayMs,
  getChopWoodParticleConfig,
  getHuntParticleConfig,
  type BubbleWithParticles,
} from "@/components/ui/bubbly-button.particles";
import type { Action, GameState } from "@shared/schema";
import { formatNumber } from "@/lib/utils";

function isTieredNumericRecord(r: unknown): r is Record<number, unknown> {
  if (!r || typeof r !== "object") return false;
  const keys = Object.keys(r as object);
  if (keys.length === 0) return false;
  return keys.every((k) => !isNaN(Number(k)));
}

function getForestPanelTradeActiveTier(action: Action, state: GameState): number {
  const sw = action.show_when;
  if (!isTieredNumericRecord(sw)) return 1;

  const tieredSw = sw as Record<number, Record<string, number>>;
  let activeTier = 1;
  if (tieredSw[3]) {
    const tier3Satisfied = Object.entries(tieredSw[3]).every(
      ([key, value]) => {
        const [category, prop] = key.split(".");
        return (
          (state[category as keyof GameState]?.[prop as never] as number | undefined) ||
          0
        ) >= value;
      },
    );
    if (tier3Satisfied) activeTier = 3;
  }
  if (activeTier === 1 && tieredSw[2]) {
    const tier2Satisfied = Object.entries(tieredSw[2]).every(
      ([key, value]) => {
        const [category, prop] = key.split(".");
        return (
          (state[category as keyof GameState]?.[prop as never] as number | undefined) ||
          0
        ) >= value;
      },
    );
    if (tier2Satisfied) activeTier = 2;
  }
  return activeTier;
}

function resolveForestPanelTradeEffects(
  action: Action,
  state: GameState,
): Record<string, number> | undefined {
  if (!action.effects) return undefined;
  if (typeof action.effects === "function") {
    return action.effects(state) as Record<string, number>;
  }
  const raw = action.effects as Record<string, Record<string, number>>;
  if (!isTieredNumericRecord(raw)) {
    return raw as unknown as Record<string, number>;
  }
  const tier = getForestPanelTradeActiveTier(action, state);
  return raw[tier];
}

function formatForestPanelResourceRowLabel(
  row: Record<string, number> | undefined,
): string | null {
  if (!row) return null;
  const key = Object.keys(row).find((k) => k.startsWith("resources."));
  if (!key || typeof row[key] !== "number") return null;
  const resourceKey = key.split(".")[1];
  const fallbackName = resourceKey
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return `${formatNumber(row[key])} ${getResourceName(resourceKey, fallbackName)}`;
}

/** Tooltip line for resource gained (e.g. "+250 Food", "+125 Gold"). */
function formatForestPanelResourceGainLine(
  row: Record<string, number> | undefined,
): string | null {
  const line = formatForestPanelResourceRowLabel(row);
  return line ? `+${line}` : null;
}

function resolveForestPanelTradeCost(
  action: Action,
  state: GameState,
): Record<string, number> | undefined {
  if (!action.cost || typeof action.cost === "function") return undefined;
  const raw = action.cost as Record<string, Record<string, number>>;
  if (!isTieredNumericRecord(raw)) {
    return raw as unknown as Record<string, number>;
  }
  const tier = getForestPanelTradeActiveTier(action, state);
  return raw[tier];
}

export default function ForestPanel() {
  const { t } = useTranslation("ui");
  const { executeAction, setHighlightedResources } = useGameStore();
  const state = useGameStore();

  // Chop wood particle animation
  const [chopWoodBubbles, setChopWoodBubbles] = useState<BubbleWithParticles[]>([]);
  const chopWoodBubbleIdCounter = useRef(0);
  const handleChopWoodAnimationTrigger = (x: number, y: number) => {
    const level = state.buttonUpgrades?.chopWood?.level ?? 0;
    const config = getChopWoodParticleConfig(level);
    const id = `chop-bubble-${chopWoodBubbleIdCounter.current++}-${Date.now()}`;
    const particles = generateParticleData(config);
    setChopWoodBubbles((prev) => [...prev, { id, x, y, particles }]);
    setTimeout(() => {
      setChopWoodBubbles((prev) => prev.filter((b) => b.id !== id));
    }, getBubbleRemoveDelayMs(config));
  };

  // Hunt particle animation
  const [huntBubbles, setHuntBubbles] = useState<BubbleWithParticles[]>([]);
  const huntBubbleIdCounter = useRef(0);
  const handleHuntAnimationTrigger = (x: number, y: number) => {
    const level = state.buttonUpgrades?.hunt?.level ?? 0;
    const config = getHuntParticleConfig(level);
    const id = `hunt-bubble-${huntBubbleIdCounter.current++}-${Date.now()}`;
    const particles = generateParticleData(config);
    setHuntBubbles((prev) => [...prev, { id, x, y, particles }]);
    setTimeout(() => {
      setHuntBubbles((prev) => prev.filter((b) => b.id !== id));
    }, getBubbleRemoveDelayMs(config));
  };

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "",
      actions: [
        { id: "chopWood", label: "Chop Wood" },
        { id: "hunt", label: "Hunt" },
        { id: "layTrap", label: "Lay Trap" },
        { id: "banditLair", label: "Bandit Lair" },
        { id: "forestCave", label: "Forest Cave" },
        { id: "collapsedTower", label: "Collapsed Tower" },
        { id: "castleRuins", label: "Castle Ruins" },
        { id: "hillGrave", label: "Hill Grave" },
        { id: "sunkenTemple", label: "Sunken Temple" },
        { id: "swampSanctuary", label: "Swamp Sanctuary" },
        { id: "blackreachCanyon", label: "Blackreach Canyon" },
        { id: "steelDelivery", label: "Steel Delivery" },
        { id: "risingSmoke", label: "Rising smoke" },
        { id: "canyonBridge", label: "Canyon Bridge" },
        { id: "financeExpedition", label: "Finance Expedition" },
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
      title: "Buy",
      actions: [
        { id: "tradeGoldForFood", label: "Food" },
        { id: "tradeGoldForWood", label: "Wood" },
        { id: "tradeGoldForStone", label: "Stone" },
        { id: "tradeGoldForIron", label: "Iron" },
        { id: "tradeGoldForLeather", label: "Leather" },
        { id: "tradeGoldForSteel", label: "Steel" },
        { id: "tradeGoldForObsidian", label: "Obsidian" },
        { id: "tradeGoldForAdamant", label: "Adamant" },
        { id: "tradeGoldForBlacksteel", label: "Blacksteel" },
        { id: "tradeGoldForTorch", label: "Torch" },
        { id: "tradeGoldForEmberBomb", label: "Ember Bomb" },
        { id: "tradeGoldForAshfireBomb", label: "Ashfire Bomb" },
        { id: "tradeGoldForVoidBomb", label: "Void Bomb" },
        { id: "tradeGoldForVeinfireElixir", label: "Veinfire Elixir" },
        { id: "tradeSilverForGold", label: "Gold" },
      ],
    },
    {
      title: "Sell",
      actions: [
        { id: "sellLeatherBatch", label: "Leather" },
        { id: "sellSteelBatch", label: "Steel" },
        { id: "sellBlacksteelBatch", label: "Blacksteel" },
      ],
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    let canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;
    const isTradeButton =
      actionId.startsWith("trade") || actionId.startsWith("sell");
    const isSellButton = actionId.startsWith("sell");

    // Buy buttons: only disable when the target resource is already at cap.
    // Partial purchases are allowed — execution caps gains at the storage limit.
    if (isTradeButton && !isSellButton && canExecute && action.effects) {
      const effects = resolveForestPanelTradeEffects(action, state);
      if (effects) {
        const resourceKey = Object.keys(effects).find((k) =>
          k.startsWith("resources."),
        );
        if (resourceKey) {
          const resourceName = resourceKey.split(".")[1];
          if (isResourceLimited(resourceName, state)) {
            const currentAmount =
              state.resources[resourceName as keyof typeof state.resources] || 0;
            const limit = getResourceLimit(state);
            if (currentAmount >= limit) {
              canExecute = false;
            }
          }
        }
      }
    }

    // Check if action has success chance (for forest scout actions)
    const showSuccessTooltip = hasSuccessChanceTooltip(
      action.success_chance,
      action.relevant_stats,
    );

    // Expedition actions require free villagers during execution
    const expeditionVillagersRequired = action.expeditionVillagersRequired
      ? action.expeditionVillagersRequired(state)
      : 0;
    const hasExpeditionRequirement = expeditionVillagersRequired > 0;
    const villagerRequirementNotMet =
      hasExpeditionRequirement &&
      (state.villagers?.free ?? 0) < expeditionVillagersRequired;

    // Check if this is chopWood, hunt, sacrifice, or bomb trade action
    const isChopWood = actionId === "chopWood";
    const isHunt = actionId === "hunt";
    const isSacrificeAction =
      actionId === "boneTotems" || actionId === "leatherTotems";
    const isAnimalsSacrifice = actionId === "animals";
    const isHumansSacrifice = actionId === "humans";
    const isFinanceExpedition = actionId === "financeExpedition";
    const isBombTradeAction = [
      "tradeGoldForEmberBomb",
      "tradeGoldForAshfireBomb",
      "tradeGoldForVoidBomb",
    ].includes(actionId);
    const isVeinfireElixirTradeAction =
      actionId === "tradeGoldForVeinfireElixir";
    const focusTrailing = getFocusTooltipHeaderTrailing(actionId, state);
    const resourceGainTooltip =
      isChopWood ||
        isHunt ||
        isSacrificeAction ||
        isBombTradeAction ||
        isVeinfireElixirTradeAction
        ? getResourceGainTooltip(actionId, state, focusTrailing)
        : null;

    // Check if this action is affected by focus mode (only actions that get 2x bonus)
    const isFocusAffected = FOCUS_ELIGIBLE_ACTIONS.includes(actionId);
    const shouldGlow = isFocusAffected && state.focusState?.isActive;

    // Get dynamic label: sell = amount + resource sold; buy = amount + resource received
    let displayLabel = resolveActionLabel(actionId, label);
    if (isSellButton && action.cost) {
      const costRow = resolveForestPanelTradeCost(action, state);
      const sellText = formatForestPanelResourceRowLabel(costRow);
      if (sellText) displayLabel = sellText;
    } else if (isTradeButton && action.effects) {
      const buyText = formatForestPanelResourceRowLabel(
        resolveForestPanelTradeEffects(action, state),
      );
      if (buyText) displayLabel = buyText;
    }

    // Check if this action has upgrade tracking
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];

    if (
      showCost ||
      resourceGainTooltip ||
      isAnimalsSacrifice ||
      isHumansSacrifice ||
      isFinanceExpedition ||
      showSuccessTooltip ||
      hasExpeditionRequirement
    ) {
      let tooltipContent;

      const villagerMessage = hasExpeditionRequirement ? (
        <div className={villagerRequirementNotMet ? "text-muted-foreground" : ""}>
          {t("cave.requiresFreeVillagers", {
            count: expeditionVillagersRequired,
          })}
        </div>
      ) : null;

      if (resourceGainTooltip && !villagerRequirementNotMet) {
        // chopWood or hunt: show resource gains only
        tooltipContent = resourceGainTooltip;
      } else if (
        (isAnimalsSacrifice || isHumansSacrifice || isFinanceExpedition) &&
        action.tooltipEffects
      ) {
        // Animals/Humans sacrifice / Finance Expedition: show effect + cost
        const costBreakdown = getActionCostBreakdown(actionId, state);
        const durationLine = getActionDurationLine(actionId, state);
        const effectLines = resolveActionTooltipEffects(
          action.tooltipEffects,
          state,
        );
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {effectLines.map((effect, index) => (
              <div key={`effect-${index}`}>{effect}</div>
            ))}
            {(costBreakdown.length > 0 ||
              durationLine != null ||
              (isFinanceExpedition && villagerMessage)) &&
              effectLines.length > 0 && (
                <div className="border-t border-border my-1" />
              )}
            {isFinanceExpedition && villagerMessage}
            {costBreakdown.map((costItem, index) => (
              <div
                key={index}
                className={costItem.satisfied ? "" : "text-muted-foreground"}
              >
                {costItem.text}
              </div>
            ))}
            {durationLine}
          </div>
        );
      } else {
        // Other actions with costs and/or success chance
        const costBreakdown = getActionCostBreakdown(actionId, state);
        const durationLine = getActionDurationLine(actionId, state);
        const forestTradeGainLine =
          isTradeButton && action.effects
            ? formatForestPanelResourceGainLine(
              resolveForestPanelTradeEffects(action, state),
            )
            : null;
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {villagerMessage}
            {villagerMessage &&
              (costBreakdown.length > 0 ||
                showSuccessTooltip ||
                durationLine != null) && (
                <div className="border-t border-border my-1" />
              )}
            {costBreakdown.map((costItem, index) => (
              <div
                key={index}
                className={costItem.satisfied ? "" : "text-muted-foreground"}
              >
                {costItem.text}
              </div>
            ))}
            {durationLine}
            {forestTradeGainLine != null && (
              <>
                {(villagerMessage || costBreakdown.length > 0) && (
                  <div className="border-t border-border my-1" />
                )}
                <div>{forestTradeGainLine}</div>
              </>
            )}
            {showSuccessTooltip && (
              <>
                {(villagerMessage ||
                  costBreakdown.length > 0 ||
                  forestTradeGainLine != null) && (
                    <div className="border-t border-border my-1" />
                  )}
                <SuccessChanceTooltipContent
                  gameState={state}
                  successChance={action.success_chance}
                  relevantStats={action.relevant_stats}
                />
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
          actionId={actionId}
          size="xs"
          disabled={!canExecute}
          variant="outline"
          className={`${isTradeButton ? "flex-[0_0_calc(25%-0.375rem)]" : ""} ${shouldGlow ? "focus-glow" : ""}`}
          tooltip={tooltipContent}
          onAnimationTrigger={
            isChopWood ? handleChopWoodAnimationTrigger : isHunt ? handleHuntAnimationTrigger : undefined
          }
          onMouseEnter={() => {
            const resources: string[] = [];

            if (isTradeButton && action.cost && action.effects) {
              const costRow = resolveForestPanelTradeCost(action, state);
              const effectRow = resolveForestPanelTradeEffects(action, state);

              const costResourceKey = costRow
                ? Object.keys(costRow).find((key) => key.startsWith("resources."))
                : undefined;
              if (costResourceKey) {
                resources.push(costResourceKey.split(".")[1]);
              }

              const effectResourceKey = effectRow
                ? Object.keys(effectRow).find((key) => key.startsWith("resources."))
                : undefined;
              if (effectResourceKey) {
                resources.push(effectResourceKey.split(".")[1]);
              }
            } else {
              resources.push(...getResourcesFromActionCost(actionId, state));
            }

            setHighlightedResources(resources);
          }}
          onMouseLeave={() => {
            setHighlightedResources([]);
          }}
          style={{ pointerEvents: 'auto' }}
        >
          {displayLabel}
        </CooldownButton>
      );

      const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
      const needsWrapper = upgradeKey || isPriorEligible;
      return needsWrapper ? (
        <div key={actionId} className="relative inline-block">
          {button}
          {upgradeKey && <ButtonLevelBadge upgradeKey={upgradeKey} />}
          {isPriorEligible && <ButtonPriorBadge actionId={actionId} />}
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
        button_id={actionId}
        actionId={actionId}
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className={`${isTradeButton ? "flex-[0_0_calc(25%-0.375rem)]" : ""} ${shouldGlow ? "focus-glow" : ""}`}
        onAnimationTrigger={
          isChopWood ? handleChopWoodAnimationTrigger : isHunt ? handleHuntAnimationTrigger : undefined
        }
        onMouseEnter={() => {
          setHighlightedResources(
            getResourcesFromActionCost(actionId, state),
          );
        }}
        onMouseLeave={() => {
          setHighlightedResources([]);
        }}
        style={{ pointerEvents: 'auto' }}
      >
        {displayLabel}
      </CooldownButton>
    );

    const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
    const needsWrapper = upgradeKey || isPriorEligible;
    return needsWrapper ? (
      <div key={actionId} className="relative inline-block">
        {button}
        {upgradeKey && <ButtonLevelBadge upgradeKey={upgradeKey} />}
        {isPriorEligible && <ButtonPriorBadge actionId={actionId} />}
      </div>
    ) : (
      button
    );
  };

  return (
    <>
      <ScrollArea className="h-full w-full">
        <div className="w-full space-y-4 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pr-2 pb-2">
          {actionGroups.map((group, groupIndex) => {
            const visibleActions = group.actions.filter((action) =>
              shouldShowAction(action.id, state) || !!state.executionStartTimes?.[action.id],
            );

            if (visibleActions.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.title && (
                  <h3 className="text-xs font-medium text-foreground">
                    {group.title === "Sacrifice"
                      ? t("forest.sectionSacrifice")
                      : group.title === "Buy"
                        ? t("forest.sectionBuy")
                        : group.title === "Sell"
                          ? t("forest.sectionSell")
                          : group.title}
                  </h3>
                )}
                <div className="flex w-full flex-wrap gap-2 justify-start">
                  {visibleActions.map((action) =>
                    renderButton(action.id, action.label),
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <BubblyButtonGlobalPortal bubbles={[...chopWoodBubbles, ...huntBubbles]} />
    </>
  );
}