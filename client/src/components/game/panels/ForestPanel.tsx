import React, { useState, useRef } from "react";
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import { getResourceGainTooltip } from "@/game/rules/tooltips";
import { getResourceLimit, isResourceLimited } from "@/game/resourceLimits";
import CooldownButton from "@/components/CooldownButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ButtonLevelBadge } from "@/components/game/ButtonLevelBadge";
import { ButtonPriorBadge } from "@/components/game/ButtonPriorBadge";
import { ACTION_TO_UPGRADE_KEY, PRIOR_ELIGIBLE_ACTIONS } from "@/game/buttonUpgrades";
import { FOCUS_ELIGIBLE_ACTIONS } from "@/game/rules/actionEffects";
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

export default function ForestPanel() {
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
        { id: "forestCave", label: "Forest Cave" },
        { id: "collapsedTower", label: "Collapsed Tower" },
        { id: "castleRuins", label: "Castle Ruins" },
        { id: "hillGrave", label: "Hill Grave" },
        { id: "sunkenTemple", label: "Sunken Temple" },
        { id: "blackreachCanyon", label: "Blackreach Canyon" },
        { id: "steelDelivery", label: "Steel Delivery" },
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
        { id: "tradeGoldForLeather", label: "Leather" },
        { id: "tradeGoldForSteel", label: "Steel" },
        { id: "tradeGoldForObsidian", label: "Obsidian" },
        { id: "tradeGoldForAdamant", label: "Adamant" },
        { id: "tradeGoldForBlacksteel", label: "Blacksteel" },
        { id: "tradeGoldForTorch", label: "Torch" },
        { id: "tradeGoldForEmberBomb", label: "Ember Bomb" },
        { id: "tradeGoldForAshfireBomb", label: "Ashfire Bomb" },
        { id: "tradeGoldForVoidBomb", label: "Void Bomb" },
        { id: "tradeSilverForGold", label: "Gold" },
      ],
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    let canExecute = canExecuteAction(actionId, state);
    const showCost = action.cost && Object.keys(action.cost).length > 0;
    const isTradeButton = actionId.startsWith("trade");

    // For trade buttons, check if there's enough space for the resource being bought
    if (isTradeButton && canExecute && action.effects) {
      // Determine active tier
      let activeTier = 1;
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
        if (tier3Satisfied) activeTier = 3;
      }
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
        if (tier2Satisfied) activeTier = 2;
      }

      // Get the effect amount for the active tier
      const effects = action.effects[activeTier];
      if (effects) {
        const resourceKey = Object.keys(effects)[0];
        const amount = effects[resourceKey];
        const resourceName = resourceKey.split(".")[1];

        // Check if resource is limited and if there's space
        if (isResourceLimited(resourceName, state)) {
          const currentAmount = state.resources[resourceName as keyof typeof state.resources] || 0;
          const limit = getResourceLimit(state);
          if (currentAmount + amount > limit) {
            canExecute = false;
          }
        }
      }
    }

    // Check if action has success chance (for forest scout actions)
    const successPercentage = action.success_chance && state.books?.book_of_war
      ? `${Math.round(Math.min(1, Math.max(0, action.success_chance(state))) * 100)}%`
      : null;

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
    const isBombTradeAction = [
      "tradeGoldForEmberBomb",
      "tradeGoldForAshfireBomb",
      "tradeGoldForVoidBomb",
    ].includes(actionId);
    const resourceGainTooltip =
      isChopWood || isHunt || isSacrificeAction || isBombTradeAction
        ? getResourceGainTooltip(actionId, state)
        : null;

    // Check if this action is affected by focus mode (only actions that get 2x bonus)
    const isFocusAffected = FOCUS_ELIGIBLE_ACTIONS.includes(actionId);
    const shouldGlow = isFocusAffected && state.focusState?.isActive;

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
        displayLabel = `${amount} ${formattedName}`;
      }
    }

    // Check if this action has upgrade tracking
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];

    if (
      showCost ||
      resourceGainTooltip ||
      isAnimalsSacrifice ||
      isHumansSacrifice ||
      successPercentage ||
      hasExpeditionRequirement
    ) {
      let tooltipContent;

      const villagerMessage = hasExpeditionRequirement ? (
        <div className={villagerRequirementNotMet ? "text-muted-foreground" : ""}>
          Requires {expeditionVillagersRequired} free villagers
        </div>
      ) : null;

      if (resourceGainTooltip && !villagerRequirementNotMet) {
        // chopWood or hunt: show resource gains only
        tooltipContent = resourceGainTooltip;
      } else if (
        (isAnimalsSacrifice || isHumansSacrifice) &&
        action.tooltipEffects
      ) {
        // Animals/Humans sacrifice: show madness effect
        const costBreakdown = getActionCostBreakdown(actionId, state);
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {action.tooltipEffects.map((effect, index) => (
              <div key={`effect-${index}`}>{effect}</div>
            ))}
            {costBreakdown.length > 0 && (
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
          </div>
        );
      } else {
        // Other actions with costs and/or success chance
        const costBreakdown = getActionCostBreakdown(actionId, state);
        tooltipContent = (
          <div className="text-xs whitespace-nowrap">
            {villagerMessage}
            {villagerMessage && (costBreakdown.length > 0 || successPercentage) && (
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
            {successPercentage && (
              <>
                {costBreakdown.length > 0 && (
                  <div className="border-t border-border my-1" />
                )}
                <div className="flex items-center gap-1">
                  <span>{successPercentage}</span>
                  {action.relevant_stats && (
                    <div className="flex gap-1">
                      {action.relevant_stats.map((stat) => {
                        if (stat === "strength") {
                          return <span key={stat} className="text-red-300/80">⬡</span>;
                        } else if (stat === "knowledge") {
                          return <span key={stat} className="text-blue-300/80">✧</span>;
                        } else if (stat === "luck") {
                          return <span key={stat} className="text-green-300/80">☆</span>;
                        }
                        return null;
                      })}
                    </div>
                  )}
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
          className={`hover:bg-background hover:text-foreground ${isTradeButton ? "flex-[0_0_calc(25%-0.375rem)]" : ""} ${shouldGlow ? "focus-glow" : ""}`}
          tooltip={tooltipContent}
          onAnimationTrigger={
            isChopWood ? handleChopWoodAnimationTrigger : isHunt ? handleHuntAnimationTrigger : undefined
          }
          onMouseEnter={() => {
            if (state.buildings.inkwardenAcademy > 0) {
              const resources: string[] = [];

              // For trade buttons, extract both buy and sell resources
              if (isTradeButton && action.cost && action.effects) {
                // Determine active tier
                let activeTier = 1;
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
                  if (tier3Satisfied) activeTier = 3;
                }
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
                  if (tier2Satisfied) activeTier = 2;
                }

                // Get cost resource (what you pay)
                const costKeys = Object.keys(action.cost[activeTier] || {});
                const costResourceKey = costKeys.find(key => key.startsWith('resources.'));
                if (costResourceKey) {
                  resources.push(costResourceKey.split('.')[1]);
                }

                // Get effect resource (what you get)
                const effectKeys = Object.keys(action.effects[activeTier] || {});
                const effectResourceKey = effectKeys.find(key => key.startsWith('resources.'));
                if (effectResourceKey) {
                  resources.push(effectResourceKey.split('.')[1]);
                }
              } else {
                // For non-trade actions, use existing logic
                const actionResources = getResourcesFromActionCost(actionId, state);
                resources.push(...actionResources);
              }

              setHighlightedResources(new Set(resources));
            }
          }}
          onMouseLeave={() => {
            if (state.buildings.inkwardenAcademy > 0) {
              setHighlightedResources(new Set());
            }
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
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className={`hover:bg-background hover:text-foreground ${isTradeButton ? "flex-[0_0_calc(25%-0.375rem)]" : ""} ${shouldGlow ? "focus-glow" : ""}`}
        onAnimationTrigger={
          isChopWood ? handleChopWoodAnimationTrigger : isHunt ? handleHuntAnimationTrigger : undefined
        }
        onMouseEnter={() => {
          if (state.buildings.inkwardenAcademy > 0) {
            const resources = getResourcesFromActionCost(actionId, state);
            setHighlightedResources(new Set(resources));
          }
        }}
        onMouseLeave={() => {
          if (state.buildings.inkwardenAcademy > 0) {
            setHighlightedResources(new Set());
          }
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
        <div className="space-y-4 mt-2 mb-2 pl-[3px] pr-[3px]">
          {actionGroups.map((group, groupIndex) => {
            const visibleActions = group.actions.filter((action) =>
              shouldShowAction(action.id, state) || !!state.executionStartTimes?.[action.id],
            );

            if (visibleActions.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.title && (
                  <h3 className="text-xs font-medium text-foreground">
                    {group.title}
                  </h3>
                )}
                <div className="w-full md:max-w-96">
                  <div className="flex flex-wrap gap-2 justify-start">
                    {visibleActions.map((action) => (
                      renderButton(action.id, action.label)
                    ))}
                  </div>
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