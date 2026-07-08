import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import { getActionBonuses } from "@/game/rules/effectsCalculation";
import {
  getResourceGainTooltip,
  getActionDurationLine,
} from "@/game/rules/tooltips";
import CooldownButton, {
  gameActionButtonGridClassName,
  gameActionButtonRowsClassName,
} from "@/components/CooldownButton";
import { ActionButtonSlot } from "@/components/game/GameActionButtonStack";
import { ActionInsightBadge } from "@/components/game/ActionInsightBadge";
import { canRevealEffects } from "@/game/rules/insightReveal";
import { getCraftItemDescription } from "@/game/rules/craftItemDescription";
import { getRevealedEffectsForActionTooltip } from "@/game/rules/insightRevealTooltip";
import { composeActionTooltip } from "@/game/rules/actionTooltipLayout";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useExplosionEffect } from "@/components/ui/explosion-effect";
import { useRef, type ReactNode } from "react";
import {
  CRAFT_PARTICLE_CONFIG,
  getMineParticleConfig,
  getExploreParticleConfig,
  getChopWoodParticleConfig,
} from "@/components/ui/bubbly-button.particles";
import { ButtonLevelBadge } from "@/components/game/ButtonLevelBadge";
import { ButtonPriorBadge } from "@/components/game/ButtonPriorBadge";
import {
  ACTION_TO_UPGRADE_KEY,
  PRIOR_ELIGIBLE_ACTIONS,
  getUpgradeLevel,
  type UpgradeKey,
} from "@/game/buttonUpgrades";
import { getCraftProduceAmount } from "@/game/craftUpgradeUtils";
import { FOCUS_ELIGIBLE_ACTIONS } from "@/game/rules/actionEffects";
import { getFocusTooltipHeaderTrailing } from "@/game/rules/focusTooltipIndicator";
import { resolveActionLabel } from "@/i18n/actionLabels";
import { useTranslation } from "react-i18next";

export default function CavePanel() {
  const { t } = useTranslation(["ui", "common"]);
  const {
    executeAction,
    setHighlightedResources,
    story,
    timedEventTab,
    playTime,
    resources,
    buildings,
  } = useGameStore();
  const state = useGameStore();
  const explosionEffect = useExplosionEffect();

  // Separate refs for each explosion button
  const blastPortalRef = useRef<HTMLButtonElement>(null);

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "",
      subGroups: [
        {
          actions: [
            {
              id: "chopWood",
              label: "Gather Wood",
              showWhen: !state.flags.forestUnlocked,
            },
            { id: "exploreCave", label: "Explore Cave" },
            { id: "ventureDeeper", label: "Venture Deeper" },
            { id: "descendFurther", label: "Descend Further" },
            { id: "exploreRuins", label: "Explore Ruins" },
            { id: "exploreTemple", label: "Explore Temple" },
            { id: "exploreCitadel", label: "Explore Citadel" },
          ],
        },
        {
          actions: [
            { id: "lowChamber", label: "Low Chamber" },
            { id: "occultistChamber", label: "Occultist Chamber" },
            { id: "hiddenLibrary", label: "Hidden Library" },
            { id: "blastPortal", label: "Blast Gate" },
            { id: "encounterBeyondPortal", label: "Venture Beyond Gate" },
            { id: "exploreUndergroundLake", label: "Underground Lake" },
            { id: "lureLakeCreature", label: "Lure Lake Creature" },
          ],
        },
      ],
    },
    {
      title: t("cave.sectionMine"),
      actions: [
        { id: "mineStone", label: "Stone" },
        { id: "mineIron", label: "Iron" },
        { id: "mineCoal", label: "Coal" },
        { id: "mineSulfur", label: "Sulfur" },
        { id: "mineObsidian", label: "Obsidian" },
        { id: "mineAdamant", label: "Adamant" },
      ],
    },
    {
      title: t("cave.sectionCraft"),
      subGroups: [
        {
          actions: [
            { id: "craftTorches", label: "Torches" },
            { id: "craftBoneTotems", label: "Bone Totems" },
            { id: "craftLeatherTotems", label: "Leather Totems" },
            { id: "craftIronLantern", label: "Iron Lantern" },
            { id: "craftSteelLantern", label: "Steel Lantern" },
            { id: "craftObsidianLantern", label: "Obsidian Lantern" },
            { id: "craftAdamantLantern", label: "Adamant Lantern" },
          ],
        },
        {
          actions: [
            { id: "craftExplorerPack", label: "Explorer's Pack" },
            { id: "craftHunterCloak", label: "Hunter Cloak" },
            { id: "craftLoggersGloves", label: "Logger's Gloves" },
            { id: "craftGrenadierBag", label: "Grenadier's Bag" },
            { id: "craftFlaskHarness", label: "Flask Harness" },
            { id: "craftHighpriestRobe", label: "Highpriest Robe" },
            { id: "craftSacrificialTunic", label: "Sacrificial Tunic" },
            { id: "craftShadowBoots", label: "Shadow Boots" },
          ],
        },
        {
          actions: [
            { id: "craftStoneAxe", label: "Stone Axe" },
            { id: "craftIronAxe", label: "Iron Axe" },
            { id: "craftSteelAxe", label: "Steel Axe" },
            { id: "craftObsidianAxe", label: "Obsidian Axe" },
            { id: "craftAdamantAxe", label: "Adamant Axe" },
            { id: "craftStonePickaxe", label: "Stone Pickaxe" },
            { id: "craftIronPickaxe", label: "Iron Pickaxe" },
            { id: "craftSteelPickaxe", label: "Steel Pickaxe" },
            { id: "craftObsidianPickaxe", label: "Obsidian Pickaxe" },
            { id: "craftAdamantPickaxe", label: "Adamant Pickaxe" },
          ],
        },
        {
          actions: [
            { id: "craftEmberBomb", label: "Ember Bomb" },
            { id: "craftAshfireBomb", label: "Ashfire Bomb" },
            { id: "craftVoidBomb", label: "Void Bomb" },
            { id: "craftVeinfireElixir", label: "Veinfire Elixir" },
          ],
        },
        {
          actions: [
            { id: "craftIronSword", label: "Iron Sword" },
            { id: "craftSteelSword", label: "Steel Sword" },
            { id: "craftObsidianSword", label: "Obsidian Sword" },
            { id: "craftAdamantSword", label: "Adamant Sword" },
            { id: "craftFrostglassSword", label: "Frostglass Sword" },
            { id: "craftCrudeBow", label: "Crude Bow" },
            { id: "craftHuntsmanBow", label: "Huntsman Bow" },
            { id: "craftLongBow", label: "Long Bow" },
            { id: "craftWarBow", label: "War Bow" },
            { id: "craftMasterBow", label: "Master Bow" },
            { id: "craftArbalest", label: "Arbalest" },
            { id: "craftNightshadeBow", label: "Nightshade Bow" },
            { id: "craftBloodstoneStaff", label: "Bloodstone Staff" },
            { id: "craftStormglassHalberd", label: "Stormglass Halberd" },
            { id: "craftAshenGreatshield", label: "Ashen Greatshield" },
            { id: "craftSkeletonKey", label: "Skeleton Key" },
            { id: "craftObsidianOrb", label: "Obsidian Orb" },
          ],
        },
        {
          actions: [
            { id: "craftBlacksteelAxe", label: "Blacksteel Axe" },
            { id: "craftBlacksteelPickaxe", label: "Blacksteel Pickaxe" },
            { id: "craftBlacksteelLantern", label: "Blacksteel Lantern" },
            { id: "craftBlacksteelSword", label: "Blacksteel Sword" },
            { id: "craftBlacksteelBow", label: "Blacksteel Bow" },
            { id: "craftBlacksteelArmor", label: "Blacksteel Armor" },
          ],
        },
      ],
    },
  ];

  const CRAFT_BUTTON_LABELS: Record<
    string,
    { singularKey: string; pluralKey: string }
  > = {
    craftTorches: {
      singularKey: "cave.craftTorch_one",
      pluralKey: "cave.craftTorch_other",
    },
    craftBoneTotems: {
      singularKey: "cave.craftBoneTotem_one",
      pluralKey: "cave.craftBoneTotem_other",
    },
    craftLeatherTotems: {
      singularKey: "cave.craftLeatherTotem_one",
      pluralKey: "cave.craftLeatherTotem_other",
    },
  };

  /** Bombs / Veinfire: cost & gain tooltip only; skip Book of Craftsmanship flavour text */
  const CRAFT_NO_BOOK_DESCRIPTION = new Set([
    "craftEmberBomb",
    "craftAshfireBomb",
    "craftVoidBomb",
    "craftVeinfireElixir",
  ]);

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

    // Use singular/plural for craft upgrade buttons based on produce amount
    let displayLabel = resolveActionLabel(actionId, label);
    const craftLabels = CRAFT_BUTTON_LABELS[actionId];
    if (craftLabels) {
      const produceAmount = getCraftProduceAmount(actionId, state);
      displayLabel =
        produceAmount === 1
          ? t(craftLabels.singularKey, { count: 1 })
          : t(craftLabels.pluralKey, { count: produceAmount });
    }

    const canExecute = canExecuteAction(actionId, state);
    const showCost =
      action.cost &&
      (typeof action.cost === "function" ||
        Object.keys(action.cost as object).length > 0);

    // Check if this is a mine action or cave exploration action or craft action
    const isMineAction = actionId.startsWith("mine");
    const caveExploreActions = [
      "exploreCave",
      "ventureDeeper",
      "descendFurther",
      "exploreRuins",
      "exploreTemple",
      "exploreCitadel",
      "lowChamber",
      "occultistChamber",
      "hiddenLibrary",
      "exploreUndergroundLake",
      "lureLakeCreature",
      "encounterBeyondPortal",
    ];
    const isCaveExploreAction = caveExploreActions.includes(actionId);
    const isChopWood = actionId === "chopWood";
    const isCraftAction = actionId.startsWith("craft");
    const expeditionVillagersRequired = action.expeditionVillagersRequired
      ? action.expeditionVillagersRequired(state)
      : 0;
    const hasExpeditionRequirement = expeditionVillagersRequired > 0;
    const focusTrailing = getFocusTooltipHeaderTrailing(actionId, state);
    const resourceGainTooltip =
      isChopWood || isMineAction || isCaveExploreAction || isCraftAction
        ? getResourceGainTooltip(actionId, state, focusTrailing)
        : null;

    // Check if this action is affected by focus mode (only actions that get 2x bonus)
    const isFocusAffected = FOCUS_ELIGIBLE_ACTIONS.includes(actionId);
    const shouldGlow = isFocusAffected && state.focusState?.isActive;

    // Special handling for Blast Gate button
    const isBlastPortal = actionId === "blastPortal";
    const handleClick = () => {
      if (isBlastPortal) {
        // Capture button position before it's potentially removed
        const buttonElement = blastPortalRef.current;
        if (buttonElement) {
          const rect = buttonElement.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          explosionEffect.triggerExplosion(centerX, centerY);
        }
      }
      executeAction(actionId);
    };

    // Check if this action has upgrade tracking
    const upgradeKey = ACTION_TO_UPGRADE_KEY[actionId];

    if (showCost || resourceGainTooltip || hasExpeditionRequirement) {
      const villagerRequirementLine = hasExpeditionRequirement ? (
        <div>
          {t("cave.requiresFreeVillagers", {
            count: expeditionVillagersRequired,
          })}
        </div>
      ) : null;

      let tooltipHeader: ReactNode;
      if (resourceGainTooltip) {
        tooltipHeader = villagerRequirementLine ? (
          <div className="whitespace-nowrap">
            {villagerRequirementLine}
            <div className="border-t border-border my-1" />
            {resourceGainTooltip}
          </div>
        ) : (
          resourceGainTooltip
        );
      } else {
        const costBreakdown = getActionCostBreakdown(actionId, state);
        const bonuses = state.activeEffects?.actionBonuses?.[actionId];
        const cooldownReduction = bonuses?.cooldownReduction || 0;

        const durationLine = getActionDurationLine(actionId, state);
        tooltipHeader = (
          <div className="whitespace-nowrap">
            {villagerRequirementLine}
            {villagerRequirementLine &&
              (costBreakdown.length > 0 ||
                cooldownReduction > 0 ||
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
            {cooldownReduction > 0 && (
              <div>
                {t("cave.cooldownReduction", { seconds: cooldownReduction })}
              </div>
            )}
          </div>
        );
      }

      const hasRevealedEffects = (state.revealedEffects ?? []).includes(
        actionId,
      );
      const craftDescription =
        isCraftAction &&
          !CRAFT_NO_BOOK_DESCRIPTION.has(actionId) &&
          (state.books?.book_of_craftsmanship || hasRevealedEffects)
          ? getCraftItemDescription(actionId)
          : undefined;
      const revealedEffects = getRevealedEffectsForActionTooltip(
        actionId,
        state,
      );
      const tooltipContent = composeActionTooltip({
        header: tooltipHeader,
        headerTrailing: resourceGainTooltip ? undefined : focusTrailing,
        description: craftDescription,
        effects: revealedEffects,
        style:
          craftDescription || revealedEffects ? { width: "12rem" } : undefined,
      });

      const button = (
        <CooldownButton
          key={actionId}
          ref={isBlastPortal ? blastPortalRef : undefined}
          onClick={handleClick}
          cooldownMs={action.cooldown * 1000}
          data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
          button_id={actionId}
          actionId={actionId}
          size="xs"
          disabled={!canExecute}
          variant="outline"
          className={`${shouldGlow ? "focus-glow" : ""}`}
          tooltip={tooltipContent}
          particleConfig={
            isCraftAction
              ? CRAFT_PARTICLE_CONFIG
              : isMineAction
                ? () => {
                  const upgradeKey = (ACTION_TO_UPGRADE_KEY[actionId] ?? actionId) as UpgradeKey;
                  const level = getUpgradeLevel(upgradeKey, state);
                  return getMineParticleConfig(actionId, level);
                }
                : isCaveExploreAction
                  ? () => getExploreParticleConfig(actionId)
                  : isChopWood
                    ? () => getChopWoodParticleConfig(state.buttonUpgrades?.chopWood?.level ?? 0)
                    : undefined
          }
          onMouseEnter={() => {
            setHighlightedResources(
              getResourcesFromActionCost(actionId, state),
            );
          }}
          onMouseLeave={() => {
            setHighlightedResources([]);
          }}
          style={{ pointerEvents: "auto" }}
        >
          {displayLabel}
        </CooldownButton>
      );

      const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
      const needsWrapper = upgradeKey || isPriorEligible;
      const showInsightBadge = canRevealEffects(actionId, state);
      const wrapWithBadges = (inner: React.ReactNode) => {
        if (!needsWrapper && !showInsightBadge) {
          return (
            <ActionButtonSlot key={actionId}>
              {inner}
            </ActionButtonSlot>
          );
        }
        return (
          <ActionButtonSlot key={actionId}>
            {inner}
            {upgradeKey && <ButtonLevelBadge upgradeKey={upgradeKey} />}
            {isPriorEligible && <ButtonPriorBadge actionId={actionId} />}
            {showInsightBadge && (
              <ActionInsightBadge actionId={actionId} />
            )}
          </ActionButtonSlot>
        );
      };
      return wrapWithBadges(button);
    }

    const button = (
      <CooldownButton
        key={actionId}
        ref={isBlastPortal ? blastPortalRef : undefined}
        onClick={handleClick}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        data-analytics-id={actionId}
        actionId={actionId}
        size="xs"
        disabled={!canExecute}
        variant="outline"
        className={`${shouldGlow ? "focus-glow" : ""}`}
        particleConfig={
          isCraftAction
            ? CRAFT_PARTICLE_CONFIG
            : isMineAction
              ? () => {
                const upgradeKey = (ACTION_TO_UPGRADE_KEY[actionId] ?? actionId) as UpgradeKey;
                const level = getUpgradeLevel(upgradeKey, state);
                return getMineParticleConfig(actionId, level);
              }
              : isCaveExploreAction
                ? () => getExploreParticleConfig(actionId)
                : isChopWood
                  ? () => getChopWoodParticleConfig(state.buttonUpgrades?.chopWood?.level ?? 0)
                  : undefined
        }
        onMouseEnter={() => {
          setHighlightedResources(
            getResourcesFromActionCost(actionId, state),
          );
        }}
        onMouseLeave={() => {
          setHighlightedResources([]);
        }}
        style={{ pointerEvents: "auto" }}
      >
        {displayLabel}
      </CooldownButton>
    );

    const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
    const needsWrapper = upgradeKey || isPriorEligible;
    const showInsightBadge = canRevealEffects(actionId, state);
    if (!needsWrapper && !showInsightBadge) {
      return (
        <ActionButtonSlot key={actionId}>
          {button}
        </ActionButtonSlot>
      );
    }
    return (
      <ActionButtonSlot key={actionId}>
        {button}
        {upgradeKey && <ButtonLevelBadge upgradeKey={upgradeKey} />}
        {isPriorEligible && <ButtonPriorBadge actionId={actionId} />}
        {showInsightBadge && (
          <ActionInsightBadge actionId={actionId} />
        )}
      </ActionButtonSlot>
    );
  };

  return (
    <>
      <ScrollArea className="h-full w-full">
        {explosionEffect.ExplosionEffectRenderer()}
        <div className="w-full space-y-4 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pr-2 pb-2">
          {actionGroups.map((group, groupIndex) => {
            // Handle groups with subGroups (like Craft)
            if (group.subGroups) {
              const hasAnyVisibleActions = group.subGroups.some((subGroup) =>
                subGroup.actions.some((action) => {
                  if (action.showWhen !== undefined) {
                    return action.showWhen;
                  }
                  return shouldShowAction(action.id, state) || !!state.executionStartTimes?.[action.id];
                }),
              );

              if (!hasAnyVisibleActions) return null;

              return (
                <div key={groupIndex} className="space-y-2">
                  {group.title && (
                    <h3 className="text-xs font-medium text-foreground">
                      {group.title}
                    </h3>
                  )}
                  <div className={gameActionButtonRowsClassName("w-full")}>
                    {group.subGroups.map((subGroup, subGroupIndex) => {
                      const visibleActions = subGroup.actions.filter((action) => {
                        if (action.showWhen !== undefined) {
                          return action.showWhen;
                        }
                        return shouldShowAction(action.id, state) || !!state.executionStartTimes?.[action.id];
                      });

                      if (visibleActions.length === 0) return null;

                      return (
                        <div key={subGroupIndex} className={gameActionButtonGridClassName("w-full")}>
                          {visibleActions.map((action) =>
                            renderButton(action.id, action.label),
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Handle regular groups (like Explore, Mine)
            const visibleActions = group.actions.filter((action) => {
              // Handle custom show conditions
              if (action.showWhen !== undefined) {
                return action.showWhen;
              }
              // Use standard shouldShowAction for others, or keep visible if executing
              return shouldShowAction(action.id, state) || !!state.executionStartTimes?.[action.id];
            });

            if (visibleActions.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.title && (
                  <h3 className="text-xs font-medium text-foreground">
                    {group.title}
                  </h3>
                )}
                <div className={gameActionButtonGridClassName("w-full")}>
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
    </>
  );
}
