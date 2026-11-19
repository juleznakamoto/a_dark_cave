import React from "react";
import { BUILD_ACTION_APPEND_LAST_IDS } from "@/game/actionUnlockOrder";
import { useActionUnlockOrder } from "@/game/useActionUnlockOrder";
import { useGameStore } from "@/game/state";
import {
  useDerivedGameState,
  useGameStoreWithoutTickClock,
} from "@/game/useGameStoreWithoutTickClock";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import { hasVisibleVillagerBlockingAction } from "@/game/rules/villagerBlockingActions";
import {
  ActionTooltipResourceRows,
  TooltipCostLines,
  costBenefitTooltip,
} from "@/game/rules/tooltips";
import { getBuildingDisplayName } from "@/game/rules/buildingTooltipSections";
import {
  resolveActionDescription,
  resolveActionLabel,
} from "@/i18n/actionLabels";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  formatTooltipCostLine,
  formatTooltipResourceName,
} from "@/i18n/tooltipLabels";
import {
  getPalisadesTierLabel,
  getWatchtowerTierLabel,
} from "@/i18n/fortificationLabels";
import CooldownButton, {
  gameActionButtonGridClassName,
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import { ConstructionQueueSlot } from "@/components/game/ConstructionQueueSlot";
import { ActionButtonSlot } from "@/components/game/GameActionButtonStack";
import { Button } from "@/components/ui/button";
import { CheckmarkIcon } from "@/components/ui/checkmark-icon";
import {
  getCurrentPopulation,
  getDisgracedPriorFoodUpkeepPerCycle,
  getExpeditionVillagerCount,
  getPopulationProduction,
  isVillagerFoodUpkeepActive,
  isVillagerWoodUpkeepActive,
} from "@/game/population";
import {
  countPriorSlotsUsed,
  hasHuntressPriorSlot,
} from "@/game/rules/pacts";
import {
  areVillagerCapsEnabled,
  getVillagerCapForJob,
  getVillagerCapUpgradeGroupForJob,
  type VillagerCapGroupId,
} from "@/game/villagerCapUpgrades";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_LG_SIZE_CLASS,
  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS,
} from "@/components/game/BuildingActionBadge";
import { VillagerCapUpgradeBadge } from "@/components/game/VillagerCapUpgradeBadge";
import { VillagerJobCap } from "@/components/game/VillagerJobCap";
import { formatCompactDuration, formatNumber } from "@/lib/utils";
import {
  arePresetsVisible,
  canPurchasePresetSlot,
  getNextPresetUnlockCost,
  getNextPurchasablePresetSlotIndex,
  getPresetSlot,
  getPresetSlotUnlockBuildingKey,
  getVisiblePresetSlotCount,
  hasAnyUnlockedPresetSlot,
  isPresetSlotBuildingLocked,
  isPresetSlotInsightPurchaseLocked,
  isPresetSlotUnlocked,
  getPresetUnlockCost,
} from "@/game/villagerJobPresets";
import {
  canPurchaseQueueSlot,
  isQueueSlotInUse,
  getNextPurchasableQueueSlotIndex,
  getNextQueueSlotUnlockCost,
  getQueueSlotUnlockBuildingKey,
  getVisibleQueueSlotCount,
  isConstructionBoostAvailable,
  isQueueSlotBuildingLocked,
  isQueueSlotLockedForUi,
  isQueueSlotInsightPurchaseLocked,
  getQueueSlotUnlockCost,
  QUEUE_SLOT_UNLOCK_INSIGHT_KEY,
} from "@/game/constructionQueueSlots";
import { useState, useEffect, useRef, useCallback } from "react";
import { useHoldToRepeat } from "./useHoldToRepeat";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  RedactedBar,
  RedactedLockedHint,
  RedactedMoreHint,
} from "@/components/game/RedactedHint";
import { DemoEndPromoBadge } from "@/components/game/DemoEndPromoBadge";
import { JobProductionHover } from "@/components/game/JobProductionTooltip";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import {
  useDemoEndCatalogActive,
  useDemoPlayFrozen,
} from "@/hooks/useSteamEditionActive";
import {
  DEMO_END_VILLAGE_UTILITY_ACTION_IDS,
  getDemoEndHiddenActionTeasers,
  isDemoEndVillageUtilityRevealed,
  type DemoEndVillageUtilityActionId,
} from "@/game/demoEndCatalog";
import { ConstructionBoostBadge } from "@/components/game/ConstructionBoostBadge";
import { useInsightSpendHighlight } from "@/components/game/useInsightSpendHighlight";
import { getRevealedEffectsForActionTooltip } from "@/game/rules/insightRevealTooltip";
import { composeActionTooltip } from "@/game/rules/actionTooltipLayout";
import {
  isBuildingDescriptionVisible,
  PRESET_UNLOCK_INSIGHT_KEY,
} from "@/game/rules/insightReveal";
import { useUntilTimestamp } from "@/lib/uiClock";
import {
  SuccessParticles,
  useFeedFireParticles,
} from "@/components/ui/feed-fire-particles";
import {
  audioManager,
  feedFirePlaybackRate,
  feedFireVolume,
} from "@/lib/audio";
import { playHaptic } from "@/lib/haptics";
import { BUILD_PARTICLE_CONFIG } from "@/components/ui/bubbly-button.particles";
import { ButtonPriorBadge } from "@/components/game/ButtonPriorBadge";
import { PRIOR_ELIGIBLE_ACTIONS } from "@/game/buttonUpgrades";
import {
  getBuildHoverHighlightId,
  isBuildingUpgrade,
} from "@/game/buildingHierarchy";
import { BuildingUpgradeTooltipIcon } from "@/game/rules/buildingUpgradeTooltipIndicator";
import cn from "clsx";
import InvestDialog from "@/components/game/InvestDialog";
import {
  getInvestmentWaveGapMs,
  isInvestmentWaveReadyForUi,
  MIN_INVESTMENT_STAKE_GOLD,
} from "@/game/rules/investmentHallTables";
import { GAME_CONSTANTS, getCallMerchantGoldCost } from "@/game/constants";
import {
  GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS,
  GAME_PANEL_HEADER_SLOT_ROW_CLASS,
  GAME_TAB_PANEL_BODY,
  GAME_TAB_PRODUCE_HEADER_ROW,
  GAME_TAB_SECTION_HEADER,
  GAME_TAB_SECTION_HEADER_ROW,
  GAME_TAB_SECTION_STACK,
} from "@/components/game/gameChrome";

const HEADER_SLOT_SIZE_CLASS = GAME_PANEL_HEADER_INSIGHT_BADGE_CLASS;
const HEADER_SLOT_INSIGHT_BUTTON_CLASS = HEADER_SLOT_SIZE_CLASS;
/** Interactive preset slot / save controls — must receive native clicks (no pointer-events-none). */
const HEADER_SLOT_BUTTON_CLASS = `${HEADER_SLOT_SIZE_CLASS} p-0 inline-flex items-center justify-center leading-none transition-colors appearance-none [-webkit-appearance:none]`;

/** See what's coming: one short bar per header slot, no insight badge or slot chrome. */
function DemoEndHeaderSlotRedacted({ testId }: { testId: string }) {
  return (
    <span
      data-testid={testId}
      className="game-panel-header-slot inline-flex items-center justify-center"
    >
      <RedactedBar />
    </span>
  );
}

/** − / count / + columns — shared by summary, stat, and job rows. */
const VILLAGER_COUNT_BUTTON_SIZE_CLASS = "villager-count-button";
/**
 * All population rows (summary, available/on Mission, jobs) share one grid so
 * /cap and optional upgrade-badge columns size to the widest row and labels line up.
 */
/** Row/column gaps scale with text size — see `.villager-count-stack` in CSS. */
const VILLAGER_COUNT_STACK_CLASS = "villager-count-stack grid";
const VILLAGER_COUNT_STACK_COLS_CLASS = "grid-cols-[auto_auto_1fr]";
const VILLAGER_COUNT_STACK_COLS_WITH_BADGE_CLASS =
  "grid-cols-[auto_auto_auto_1fr]";
const VILLAGER_COUNT_ROW_CLASS =
  "col-span-full grid min-w-0 grid-cols-subgrid items-center";
/** Summary and stat rows have no −/+. See `.villager-count-row--plain`. */
const VILLAGER_COUNT_PLAIN_ROW_CLASS = cn(
  VILLAGER_COUNT_ROW_CLASS,
  "villager-count-row--plain",
);
/** − / count / + only; /cap + optional Insight badge sit as grid siblings after. */
const VILLAGER_COUNT_CONTROL_GRID_CLASS =
  "villager-count-control-grid grid shrink-0 grid-cols-[auto_3.5ch_auto] items-center";
/** Same size as timed-tab ActionInsightBadge (lg trigger + lg blob). */
const VILLAGER_COUNT_CAP_UPGRADE_SLOT_CLASS = cn(
  "inline-flex shrink-0 items-center justify-center self-center",
  INSIGHT_BADGE_LG_SIZE_CLASS,
);
const VILLAGER_COUNT_BUTTON_CLASS = cn(
  VILLAGER_COUNT_BUTTON_SIZE_CLASS,
  "min-h-0 shrink-0 p-0 inline-flex items-center justify-center leading-none font-normal appearance-none [-webkit-appearance:none] disabled:opacity-100",
);
const villagerCountButtonClassName = (isDisabled: boolean) =>
  cn(
    VILLAGER_COUNT_BUTTON_CLASS,
    gameActionOutlineButtonClassName(isDisabled),
    // Tiny −/+ share queue/preset chrome; only the glyph dims (see spans below).
    "opacity-100 disabled:opacity-100",
  );
const VILLAGER_COUNT_CAP_CLASS =
  "villager-count-cap notranslate inline-flex shrink-0 items-center justify-start self-center text-sm leading-tight tabular-nums";
const VILLAGER_COUNT_VALUE_CLASS =
  "notranslate inline-flex w-full items-center justify-center self-center text-sm leading-tight tabular-nums";
const VILLAGER_COUNT_LABEL_CLASS =
  "villager-count-label min-w-0 text-left text-sm leading-tight";
/** Same label class; column-gap on the stack spaces the upgrade slot. */
const VILLAGER_COUNT_LABEL_WITH_CAP_UPGRADE_CLASS =
  "villager-count-label min-w-0 text-left text-sm leading-tight";
/** Secondary resource rates/upkeep beside job labels — smaller with room when wrapped. */
const VILLAGER_RESOURCE_HINT_CLASS =
  "text-xs leading-snug text-muted-foreground";


function VillageInvestButton({ label }: { label: string }) {
  const { t } = useUiTranslation();
  const playFrozen = useDemoPlayFrozen();
  const playTime = useGameStore((s) => s.playTime);
  const gold = useGameStore((s) => s.resources?.gold ?? 0);
  const investmentHallState = useGameStore((s) => s.investmentHallState);
  const investDialogOpen = useGameStore((s) => s.investDialogOpen);
  const setInvestDialogOpen = useGameStore((s) => s.setInvestDialogOpen);
  const canAffordMinInvest = gold >= MIN_INVESTMENT_STAKE_GOLD;

  const handleInvestDialogOpenChange = useCallback(
    (next: boolean) => {
      if (next && playFrozen) return;
      const state = useGameStore.getState();
      if (next && !isInvestmentWaveReadyForUi(state)) return;
      if (
        next &&
        (state.resources?.gold ?? 0) < MIN_INVESTMENT_STAKE_GOLD
      ) {
        return;
      }
      setInvestDialogOpen(next);
    },
    [playFrozen, setInvestDialogOpen],
  );

  const ih = investmentHallState;
  const active = ih?.active;
  const nextWave = ih?.nextWavePlayTime ?? 0;
  const currentPlayTime = playTime ?? 0;
  const formatRemaining = (ms: number) =>
    formatCompactDuration(Math.max(0, ms) / 1000);
  const investReady = isInvestmentWaveReadyForUi({
    playTime: currentPlayTime,
    investmentHallState: ih,
  });
  const investPlayTimeCooldown = active
    ? {
      startPlayTime: active.startPlayTime,
      endPlayTime: active.endPlayTime,
      mode: "progress" as const,
    }
    : nextWave > 0 && currentPlayTime < nextWave
      ? {
        startPlayTime: nextWave - getInvestmentWaveGapMs(),
        endPlayTime: nextWave,
      }
      : null;
  const tooltipContent = !investReady ? (
    active ? (
      <div>
        {t("village.investCompleteIn", {
          time: formatRemaining(
            Math.max(0, active.endPlayTime - currentPlayTime),
          ),
        })}
      </div>
    ) : currentPlayTime < nextWave ? (
      <div>
        {t("village.investAvailableIn", {
          time: formatRemaining(Math.max(0, nextWave - currentPlayTime)),
        })}
      </div>
    ) : (
      <div>
        {t("village.investPreparing")}
      </div>
    )
  ) : !canAffordMinInvest ? (
    <div>
      {t("village.investNeedGold", {
        amount: MIN_INVESTMENT_STAKE_GOLD,
        defaultValue: "At least {{amount}} Gold needed to invest",
      })}
    </div>
  ) : undefined;

  return (
    <React.Fragment>
      <CooldownButton
        onClick={() => setInvestDialogOpen(true)}
        cooldownMs={0}
        data-testid="button-invest"
        actionId="invest"
        button_id="invest"
        disabled={playFrozen || !investReady || !canAffordMinInvest}
        playTimeCooldown={investPlayTimeCooldown}
        size="xs"
        variant="outline"
        className=""
        tooltip={tooltipContent}
        style={{ pointerEvents: "auto" }}
      >
        <span className="flex items-center gap-1">
          {resolveActionLabel("invest", label)}
        </span>
      </CooldownButton>
      <InvestDialog
        open={investDialogOpen}
        onOpenChange={handleInvestDialogOpenChange}
      />
    </React.Fragment>
  );
}

function VillageCallMerchantButton({ label }: { label: string }) {
  const { t } = useUiTranslation();
  const playFrozen = useDemoPlayFrozen();
  const playTime = useGameStore((s) => s.playTime);
  const story = useGameStore((s) => s.story);
  const timedEventTab = useGameStore((s) => s.timedEventTab);
  const resources = useGameStore((s) => s.resources);
  const callMerchant = useGameStore((s) => s.callMerchant);
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  const isCallingMerchant = useGameStore(
    (s) => !!s.executionStartTimes?.callMerchant,
  );

  const callMerchantLastEndPlayTime = story?.seen
    ?.callMerchantLastEndPlayTime as number | undefined;
  const usageCount = (story?.seen?.callMerchantUsageCount as number) || 0;
  const price = getCallMerchantGoldCost(usageCount);
  const isMerchantActive =
    timedEventTab?.isActive &&
    timedEventTab?.event?.id?.includes?.("merchant");
  const isOtherEventActive = timedEventTab?.isActive && !isMerchantActive;

  const cooldownEndPlayTime =
    (callMerchantLastEndPlayTime ?? 0) +
    GAME_CONSTANTS.CALL_MERCHANT_COOLDOWN_MS;
  const currentPlayTime = playTime ?? 0;
  const isOnCooldown =
    callMerchantLastEndPlayTime != null &&
    currentPlayTime < cooldownEndPlayTime;
  const remainingMs = Math.max(0, cooldownEndPlayTime - currentPlayTime);
  const merchantPlayTimeCooldown =
    isOnCooldown && callMerchantLastEndPlayTime != null
      ? {
        startPlayTime: callMerchantLastEndPlayTime,
        endPlayTime: cooldownEndPlayTime,
      }
      : null;
  const canAfford = (resources?.gold ?? 0) >= price;
  const isDisabled =
    playFrozen ||
    isOtherEventActive ||
    isOnCooldown ||
    (!isCallingMerchant && !canAfford);

  const formatRemaining = (ms: number) =>
    formatCompactDuration(Math.max(0, ms) / 1000);

  const tooltipContent = isOtherEventActive ? (
    <div>{t("village.merchantBlocked")}</div>
  ) : isOnCooldown ? (
    <div>
      {t("village.merchantAvailableIn", {
        time: formatRemaining(remainingMs),
      })}
    </div>
  ) : (
    <div>
      <TooltipCostLines
        costs={[
          {
            text: formatTooltipCostLine(price, "gold", {
              available: resources?.gold ?? 0,
            }),
            satisfied: canAfford,
          },
        ]}
      />
    </div>
  );

  return (
    <CooldownButton
      onClick={() => callMerchant()}
      cooldownMs={0}
      data-testid="button-call-merchant"
      actionId="callMerchant"
      button_id="callMerchant"
      disabled={isDisabled}
      playTimeCooldown={merchantPlayTimeCooldown}
      size="xs"
      variant="outline"
      className=""
      tooltip={tooltipContent}
      onMouseEnter={() => setHighlightedResources(["gold"])}
      onMouseLeave={() => setHighlightedResources([])}
      style={{ pointerEvents: "auto" }}
    >
      <span className="flex items-center gap-1">
        {resolveActionLabel("callMerchant", label)}
      </span>
    </CooldownButton>
  );
}

export default function VillagePanel() {
  const { t } = useUiTranslation();
  const catalogActive = useDemoEndCatalogActive();
  const {
    villagers,
    buildings,
    story,
    timedEventTab,
    resources,
    executeAction,
    assignVillager,
    unassignVillager,
    setHighlightedResources,
    villagerJobPresets,
    activePresetSlot,
    villagerPresetsPurchased,
    villagerPresetSlotsFromShop,
    saveVillagerJobPreset,
    applyVillagerJobPreset,
    setActivePresetSlot,
    purchaseVillagerPresetSlot,
    purchaseConstructionQueueSlot,
    constructionQueueSlotsPurchased,
  } = useGameStoreWithoutTickClock();

  const state =
    useGameStore.getState() as unknown as import("@shared/schema").GameState;

  // Particle effect state
  const feedFireButtonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();

  const [presetSaveConfirmed, setPresetSaveConfirmed] = useState(false);
  const presetSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handlePresetSave = useCallback(() => {
    if (!saveVillagerJobPreset(activePresetSlot)) return;
    setPresetSaveConfirmed(true);
    if (presetSaveTimeoutRef.current) {
      clearTimeout(presetSaveTimeoutRef.current);
    }
    presetSaveTimeoutRef.current = setTimeout(() => {
      setPresetSaveConfirmed(false);
      presetSaveTimeoutRef.current = null;
    }, 2000);
  }, [activePresetSlot, saveVillagerJobPreset]);

  const handlePresetUnlock = useCallback(() => {
    purchaseVillagerPresetSlot();
  }, [purchaseVillagerPresetSlot]);

  const handleQueueSlotUnlock = useCallback(() => {
    purchaseConstructionQueueSlot();
  }, [purchaseConstructionQueueSlot]);

  const usedQueueSlotMask = useGameStore((s) => {
    const visibleSlots = getVisibleQueueSlotCount();
    let mask = 0;
    for (let i = 0; i < visibleSlots; i++) {
      if (isQueueSlotInUse(s, i)) mask |= 1 << i;
    }
    return mask;
  });
  const insightRevealing = useGameStore((s) => s.insightRevealing);
  const presetUnlockRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[PRESET_UNLOCK_INSIGHT_KEY],
  );
  const queueSlotUnlockRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[QUEUE_SLOT_UNLOCK_INSIGHT_KEY],
  );
  const isPresetUnlockAnimating = useUntilTimestamp(presetUnlockRevealEnd);
  const isQueueSlotUnlockAnimating = useUntilTimestamp(queueSlotUnlockRevealEnd);
  useInsightSpendHighlight(isQueueSlotUnlockAnimating);
  useInsightSpendHighlight(isPresetUnlockAnimating);
  const presetUnlockRevealStartedRef = useRef(false);
  const queueSlotUnlockRevealStartedRef = useRef(false);

  useEffect(() => {
    if (isPresetUnlockAnimating) presetUnlockRevealStartedRef.current = true;
  }, [isPresetUnlockAnimating]);

  useEffect(() => {
    if (isQueueSlotUnlockAnimating)
      queueSlotUnlockRevealStartedRef.current = true;
  }, [isQueueSlotUnlockAnimating]);

  useEffect(() => {
    presetUnlockRevealStartedRef.current = false;
  }, [villagerPresetsPurchased]);

  useEffect(() => {
    queueSlotUnlockRevealStartedRef.current = false;
  }, [constructionQueueSlotsPurchased]);

  useEffect(
    () => () => {
      if (presetSaveTimeoutRef.current) {
        clearTimeout(presetSaveTimeoutRef.current);
      }
    },
    [],
  );

  // Define action groups with their actions (same structure as CavePanel)
  const actionGroups = [
    {
      title: "",
      actions: [
        {
          id: "feedFire",
          label: "Feed Fire",
          showWhen: () => buildings.heartfire > 0,
        },
        {
          id: "tameWolf",
          label: "Tame Wolf",
          showWhen: () =>
            Boolean(state.clothing?.alphas_hide) &&
            !state.fellowship?.grey_one,
        },
        {
          id: "callMerchant",
          label: "Call Merchant",
          showWhen: () =>
            (buildings?.tradePost ?? 0) >= 1 &&
            !(
              timedEventTab?.isActive &&
              timedEventTab?.event?.id?.includes?.("merchant")
            ),
        },
        {
          id: "invest",
          label: "Invest",
          showWhen: () => (buildings?.coinhouse ?? 0) >= 1,
        },
      ],
    },
    {
      title: "Build",
      actions: [
        { id: "buildHeartfire", label: "Heartfire" },
        { id: "buildWoodenHut", label: "Wooden Hut" },
        { id: "buildBuildersLodge", label: "Builder's Lodge" },
        { id: "buildBuildersHall", label: "Builder's Hall" },
        { id: "buildBuildersGuild", label: "Builder's Guild" },
        { id: "buildStoneHut", label: "Stone Hut" },
        { id: "buildLonghouse", label: "Longhouse" },
        { id: "buildFurTents", label: "Fur Tent" },
        { id: "buildCabin", label: "Hunter Cabin" },
        { id: "buildGreatCabin", label: "Great Hunter Cabin" },
        { id: "buildGrandHunterLodge", label: "Grand Hunter Lodge" },
        { id: "buildBlacksmith", label: "Blacksmith" },
        { id: "buildAdvancedBlacksmith", label: "Advanced Blacksmith" },
        { id: "buildShallowPit", label: "Shallow Pit" },
        { id: "buildDeepeningPit", label: "Deepening Pit" },
        { id: "buildDeepPit", label: "Deep Pit" },
        { id: "buildBottomlessPit", label: "Bottomless Pit" },
        { id: "buildFoundry", label: "Foundry" },
        { id: "buildPrimeFoundry", label: "Prime Foundry" },
        { id: "buildMasterworkFoundry", label: "Masterwork Foundry" },
        { id: "buildAltar", label: "Altar" },
        { id: "buildShrine", label: "Shrine" },
        { id: "buildTemple", label: "Temple" },
        { id: "buildSanctum", label: "Sanctum" },
        { id: "buildBlackMonolith", label: "Black Monolith" },
        { id: "buildBoneyard", label: "Boneyard" },
        { id: "buildHerbGarden", label: "Herb Garden" },
        { id: "buildBoneTemple", label: "Bone Temple" },
        { id: "buildPaleCross", label: "Pale Cross" },
        { id: "buildTimberMill", label: "Timber Mill" },
        { id: "buildQuarry", label: "Quarry" },
        { id: "buildClerksHut", label: "Clerk's Hut" },
        { id: "buildScriptorium", label: "Scriptorium" },
        { id: "buildInkwardenAcademy", label: "Tomewarden Academy" },
        { id: "buildScribesOffice", label: "Scribe's Office" },
        { id: "buildRecordsHall", label: "Records Hall" },
        { id: "buildGrandArchive", label: "Grand Archive" },
        { id: "buildTannery", label: "Tannery" },
        { id: "buildMasterTannery", label: "Master Tannery" },
        { id: "buildHighTannery", label: "High Tannery" },
        { id: "buildAlchemistHall", label: "Alchemist's Hall" },
        { id: "buildRepairAlchemistHall", label: "Repair Alchemist's Hall" },
        { id: "buildTradePost", label: "Trade Post" },
        { id: "buildGrandBazaar", label: "Grand Bazaar" },
        { id: "buildMerchantsGuild", label: "Merchants Guild" },
        { id: "buildWizardTower", label: "Wizard Tower" },
        { id: "buildGrandBlacksmith", label: "Grand Blacksmith" },
        { id: "buildDarkEstate", label: "Dark Estate" },
        { id: "buildBlackEstate", label: "Black Estate" },
        { id: "buildPillarOfClarity", label: "Pillar of Clarity" },
        { id: "buildTraps", label: "Traps" },
        { id: "buildImprovedTraps", label: "Improved Traps" },
        { id: "buildBastion", label: "Bastion" },
        { id: "buildHighBastion", label: "High Bastion" },
        { id: "buildWatchtower", label: "Watchtower" },
        { id: "buildPalisades", label: "Palisades" },
        { id: "buildFortifiedMoat", label: "Fortified Moat" },
        { id: "buildHungeringMoat", label: "Hungering Moat" },
        { id: "buildChitinPlating", label: "Chitin Plating" },
        { id: "buildCoinhouse", label: "Coinhouse" },
        { id: "buildBank", label: "Bank" },
        { id: "buildTreasury", label: "Treasury" },
        { id: "buildSupplyHut", label: "Supply Hut" },
        { id: "buildStorehouse", label: "Storehouse" },
        { id: "buildFortifiedStorehouse", label: "Fortified Storehouse" },
        { id: "buildVillageWarehouse", label: "Village Warehouse" },
        { id: "buildGrandRepository", label: "Grand Repository" },
        { id: "buildGreatVault", label: "Great Vault" },
      ],
    },
  ];

  // Job rows. Miners follow the cave Mine buttons (stone is gathered, not a job).
  // Forgers come after the ore jobs, same as steel and blacksteel on the resource list.
  const populationJobs = [
    { id: "gatherer", label: "Gatherer", alwaysShow: true },
    { id: "hunter", label: "Hunter", showWhen: () => buildings.cabin > 0 },
    {
      id: "iron_miner",
      label: "Iron Miner",
      showWhen: () => buildings.shallowPit >= 1,
    },
    {
      id: "coal_miner",
      label: "Coal Miner",
      showWhen: () => buildings.shallowPit >= 1,
    },
    {
      id: "sulfur_miner",
      label: "Sulfur Miner",
      showWhen: () => buildings.deepeningPit >= 1,
    },
    {
      id: "obsidian_miner",
      label: "Obsidian Miner",
      showWhen: () => buildings.deepPit >= 1,
    },
    {
      id: "adamant_miner",
      label: "Adamant Miner",
      showWhen: () => buildings.bottomlessPit >= 1,
    },
    {
      id: "moonstone_miner",
      label: "Moonstone Miner",
      showWhen: () => buildings.bottomlessPit >= 1,
    },
    {
      id: "steel_forger",
      label: "Steel Forger",
      showWhen: () => state.buildings.foundry >= 1,
    },
    {
      id: "blacksteel_forger",
      label: "Blacksteel Forger",
      showWhen: () => state.buildings.masterworkFoundry >= 1,
    },
    {
      id: "tanner",
      label: "Tanner",
      alwaysShow: false,
      showWhen: () => state.buildings.tannery >= 1,
    },
    {
      id: "powder_maker",
      label: "Black Powder Maker",
      showWhen: () => buildings.alchemistHall >= 1,
    },
    {
      id: "ashfire_dust_maker",
      label: "Ashfire Dust Maker",
      showWhen: () => state.story?.seen?.canMakeAshfireDust === true,
    },
    {
      id: "scholar",
      label: "Scholar",
      showWhen: () => buildings.clerksHut > 0,
    },
  ];

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (
      !action &&
      actionId !== "feedFire" &&
      actionId !== "callMerchant" &&
      actionId !== "invest"
    )
      return null;

    if (actionId === "invest") {
      return <VillageInvestButton key="invest" label={label} />;
    }

    if (actionId === "callMerchant") {
      return <VillageCallMerchantButton key="callMerchant" label={label} />;
    }

    // Special case for Feed Fire button
    if (actionId === "feedFire") {
      const heartfireBuilt = buildings.heartfire > 0;
      if (!heartfireBuilt) return null;

      const currentLevel = state.heartfireState?.level || 0;
      const woodCost = 50 * (currentLevel + 1);
      const canExecute =
        state.resources.wood >= woodCost && currentLevel < 5;

      const tooltipContent =
        currentLevel < 5 ? (
          <div>
            <TooltipCostLines
              costs={[
                {
                  text: formatTooltipCostLine(woodCost, "wood", {
                    available: state.resources.wood ?? 0,
                  }),
                  satisfied: state.resources.wood >= woodCost,
                },
              ]}
            />
          </div>
        ) : undefined;

      const button = (
        <CooldownButton
          key={actionId}
          ref={feedFireButtonRef}
          onClick={() => {
            executeAction(actionId);
            audioManager.playSound(
              "feedFire",
              feedFireVolume(currentLevel),
              false,
              feedFirePlaybackRate(currentLevel),
            );
            playHaptic("feedFire");
            // Generate 10 * current heartfire level particles
            const particleCount = 10 * (currentLevel + 1);
            if (particleCount > 0) {
              spawnParticles(particleCount, feedFireButtonRef);
            }
          }}
          cooldownMs={30000}
          data-testid="button-feed-fire"
          actionId="feedFire"
          button_id={actionId}
          disabled={!canExecute || (state.cooldowns[actionId] || 0) > 0}
          size="xs"
          variant="outline"
          className=""
          tooltip={tooltipContent}
          onMouseEnter={() => {
            if (currentLevel < 5) setHighlightedResources(["wood"]);
          }}
          onMouseLeave={() => setHighlightedResources([])}
          style={{ pointerEvents: "auto" }}
        >
          <span className="flex items-center gap-1">
            {resolveActionLabel("feedFire", label)}
          </span>
        </CooldownButton>
      );

      const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
      return isPriorEligible ? (
        <ActionButtonSlot key={`${actionId}-wrapper`}>
          {button}
          <ButtonPriorBadge actionId={actionId} />
        </ActionButtonSlot>
      ) : (
        button
      );
    }

    const canExecute = canExecuteAction(actionId, state);
    const costBreakdown = getActionCostBreakdown(actionId, state);

    // Dynamic label for watchtower based on current level
    let displayLabel = resolveActionLabel(actionId, label);
    if (actionId === "buildWatchtower") {
      displayLabel = getWatchtowerTierLabel(buildings.watchtower || 0);
    }

    if (actionId === "buildPalisades") {
      displayLabel = getPalisadesTierLabel(buildings.palisades || 0);
    }

    const buildingDescription = isBuildingDescriptionVisible(state, actionId)
      ? resolveActionDescription(actionId, action.description)
      : undefined;
    const buildingKey = actionId.startsWith("build")
      ? actionId.slice(5, 6).toLowerCase() + actionId.slice(6)
      : null;
    const isUpgrade = buildingKey ? isBuildingUpgrade(buildingKey) : false;
    const revealedEffects = getRevealedEffectsForActionTooltip(actionId, state);
    const tooltipContent = composeActionTooltip({
      header: (
        <div className="min-w-0 flex-1">
          <ActionTooltipResourceRows
            actionId={actionId}
            state={state}
            costs={costBreakdown}
          />
        </div>
      ),
      headerTrailing: isUpgrade ? <BuildingUpgradeTooltipIcon /> : undefined,
      description: buildingDescription,
      effects: revealedEffects,
    });

    const button = (
      <CooldownButton
        key={actionId}
        onClick={() => executeAction(actionId)}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        button_id={actionId}
        actionId={actionId}
        disabled={!canExecute}
        size="xs"
        variant="outline"
        className=""
        tooltip={tooltipContent}
        particleConfig={BUILD_PARTICLE_CONFIG}
        onMouseEnter={() => {
          const highlights = getResourcesFromActionCost(actionId, state);
          if (buildingKey) {
            const buildingHighlight = getBuildHoverHighlightId(
              buildingKey,
              state.buildings,
            );
            if (buildingHighlight && !highlights.includes(buildingHighlight)) {
              highlights.push(buildingHighlight);
            }
          }
          setHighlightedResources(highlights);
        }}
        onMouseLeave={() => {
          setHighlightedResources([]);
        }}
        style={{ pointerEvents: "auto" }}
      >
        {displayLabel}
      </CooldownButton>
    );

    const showConstructionBoost = isConstructionBoostAvailable(state, actionId);

    if (showConstructionBoost) {
      return (
        <ActionButtonSlot key={`${actionId}-wrapper`}>
          {button}
          <ConstructionBoostBadge actionId={actionId} />
        </ActionButtonSlot>
      );
    }

    return (
      <ActionButtonSlot key={`${actionId}-wrapper`}>{button}</ActionButtonSlot>
    );
  };

  // Hold-to-repeat. The hook clears itself on unmount so leaving the tab
  // cannot keep assigning after the panel is gone.
  const { startHold, stopHold, beginTouchHold, endTouchHold } =
    useHoldToRepeat();

  const totalPopulation = useGameStore((s) => getCurrentPopulation(s));
  const maxPopulation = useGameStore((s) => s.total_population);
  const onMissionCount = useGameStore((s) => getExpeditionVillagerCount(s));
  const showVillagerMissionRows = useDerivedGameState(
    hasVisibleVillagerBlockingAction,
  );
  const priorFoodUpkeep = useGameStore((s) =>
    getDisgracedPriorFoodUpkeepPerCycle(s),
  );
  const priorAssignedCount = useGameStore((s) =>
    s.fellowship?.disgraced_prior
      ? countPriorSlotsUsed(s.priorAssignedActions, hasHuntressPriorSlot(s))
      : 0,
  );
  const freeVillagers = villagers.free ?? 0;

  const actionUnlock = useActionUnlockOrder();

  // Filter visible population jobs
  const visiblePopulationJobs = populationJobs.filter((job) => {
    if (job.alwaysShow) return true;
    if (job.showWhen) return job.showWhen();
    return false;
  });

  // Badge on every upgradeable job (one Insight track per job).
  const capUpgradeGroupByJobId = (() => {
    const byJob = new Map<string, VillagerCapGroupId>();
    for (const job of visiblePopulationJobs) {
      const groupId = getVillagerCapUpgradeGroupForJob(state, job.id);
      if (groupId) byJob.set(job.id, groupId);
    }
    return byJob;
  })();

  // Keep a reserved badge slot after /cap on every row until no upgrades remain.
  const reserveCapUpgradeSlot = capUpgradeGroupByJobId.size > 0;
  const villagerCountLabelClass = reserveCapUpgradeSlot
    ? VILLAGER_COUNT_LABEL_WITH_CAP_UPGRADE_CLASS
    : VILLAGER_COUNT_LABEL_CLASS;

  const renderCapUpgradeSlot = (
    groupId?: VillagerCapGroupId,
    jobId?: string,
  ) => {
    if (!reserveCapUpgradeSlot) return null;
    return (
      <span
        className={VILLAGER_COUNT_CAP_UPGRADE_SLOT_CLASS}
        aria-hidden={!groupId}
      >
        {groupId && jobId ? (
          <VillagerCapUpgradeBadge groupId={groupId} jobId={jobId} />
        ) : null}
      </span>
    );
  };

  const renderVillagerCount = (value: number, className?: string) => (
    <span translate="no" className={cn(VILLAGER_COUNT_VALUE_CLASS, className)}>
      {value}
    </span>
  );

  const villagerCountStackClass = cn(
    VILLAGER_COUNT_STACK_CLASS,
    reserveCapUpgradeSlot
      ? VILLAGER_COUNT_STACK_COLS_WITH_BADGE_CLASS
      : VILLAGER_COUNT_STACK_COLS_CLASS,
  );

  const renderVillagerStatRow = (
    key: string,
    label: string,
    count: number,
    options?: {
      className?: string;
      jobId?: string;
      productionEntries?: { resource: string; totalAmount: number }[];
    },
  ) => {
    const productionEntries = options?.productionEntries ?? [];
    const productionKey = productionEntries
      .map((p) => `${p.resource}:${p.totalAmount}`)
      .join("|");
    const labelBody = (
      <>
        <span translate="no" className="notranslate" aria-hidden>
          •{" "}
        </span>
        {label}
        {productionEntries.length > 0 && (
          <>
            {" "}
            <span key={productionKey} className={VILLAGER_RESOURCE_HINT_CLASS}>
              {productionEntries.map((prod, i) => (
                <React.Fragment key={prod.resource}>
                  {i > 0 && ", "}
                  <span translate="no" className="notranslate">
                    {prod.totalAmount > 0 ? "+" : ""}
                    {prod.totalAmount}
                  </span>{" "}
                  {formatTooltipResourceName(prod.resource)}
                </React.Fragment>
              ))}
            </span>
          </>
        )}
      </>
    );
    return (
      <div key={key} className={VILLAGER_COUNT_PLAIN_ROW_CLASS}>
        <div className={VILLAGER_COUNT_CONTROL_GRID_CLASS}>
          <span
            className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
            aria-hidden
          />
          {renderVillagerCount(count, options?.className)}
          <span
            className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
            aria-hidden
          />
        </div>
        {/* Empty /cap cell; subgrid matches width to the widest /cap in the stack. */}
        <span translate="no" className={VILLAGER_COUNT_CAP_CLASS} aria-hidden />
        {renderCapUpgradeSlot()}
        {options?.jobId ? (
          <JobProductionHover
            jobId={options.jobId}
            className={villagerCountLabelClass}
          >
            <span>{labelBody}</span>
          </JobProductionHover>
        ) : (
          <span className={villagerCountLabelClass}>{labelBody}</span>
        )}
      </div>
    );
  };

  const renderVillagersSummaryRow = () => (
    <div key="villagers-summary" className={VILLAGER_COUNT_PLAIN_ROW_CLASS}>
      <div className={VILLAGER_COUNT_CONTROL_GRID_CLASS}>
        <span
          className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          aria-hidden
        />
        {renderVillagerCount(totalPopulation)}
        <span
          className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          aria-hidden
        />
      </div>
      <span
        translate="no"
        className={cn(VILLAGER_COUNT_CAP_CLASS, "text-muted-foreground")}
      >
        {maxPopulation > 0 ? `/${maxPopulation}` : ""}
      </span>
      {renderCapUpgradeSlot()}
      <span className={villagerCountLabelClass}>
        {t("village.villagers")}{" "}
        {totalPopulation > 0 &&
          (isVillagerFoodUpkeepActive(state) ||
            isVillagerWoodUpkeepActive(state)) && (
            <span className={VILLAGER_RESOURCE_HINT_CLASS}>
              {isVillagerFoodUpkeepActive(state) && (
                <>
                  <span translate="no" className="notranslate">
                    -{totalPopulation}
                  </span>{" "}
                  {formatTooltipResourceName("food")}
                </>
              )}
              {isVillagerFoodUpkeepActive(state) &&
                isVillagerWoodUpkeepActive(state) &&
                ", "}
              {isVillagerWoodUpkeepActive(state) && (
                <>
                  <span translate="no" className="notranslate">
                    -{totalPopulation}
                  </span>{" "}
                  {formatTooltipResourceName("wood")}
                </>
              )}
            </span>
          )}
      </span>
    </div>
  );

  const renderRedactedJobRow = (jobId: string, label: string) => (
    <div
      key={jobId}
      className={VILLAGER_COUNT_ROW_CLASS}
      data-testid={`village-job-${jobId}-redacted`}
    >
      <div className="relative col-span-2 flex min-w-0 items-center">
        <div
          className={cn(
            VILLAGER_COUNT_CONTROL_GRID_CLASS,
            "invisible pointer-events-none",
          )}
          aria-hidden
        >
          <span
            className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          />
          <span />
          <span
            className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          />
        </div>
        <span className="absolute inset-0 flex items-center">
          <RedactedLockedHint
            fill
            tooltipId={`village-job-${jobId}-count`}
          />
        </span>
      </div>
      {renderCapUpgradeSlot()}
      <span className={villagerCountLabelClass}>
        <RedactedLockedHint
          label={label}
          tooltipId={`village-job-${jobId}-label`}
        />
      </span>
    </div>
  );

  const renderDisgracedPriorRow = () => (
    <div
      key="disgraced-prior"
      className={VILLAGER_COUNT_ROW_CLASS}
      data-testid="villager-disgraced-prior"
    >
      <div className={VILLAGER_COUNT_CONTROL_GRID_CLASS}>
        <span
          className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          aria-hidden
        />
        {renderVillagerCount(priorAssignedCount)}
        <span
          className={cn(VILLAGER_COUNT_BUTTON_SIZE_CLASS, "inline-block")}
          aria-hidden
        />
      </div>
      <span
        translate="no"
        className={VILLAGER_COUNT_CAP_CLASS}
        aria-hidden
      />
      {renderCapUpgradeSlot()}
      <span className={villagerCountLabelClass}>
        {t("village.priorActions", {
          defaultValue: "Disgraced Prior Actions",
        })}{" "}
        <span className={VILLAGER_RESOURCE_HINT_CLASS}>
          <span translate="no" className="notranslate">
            -{priorFoodUpkeep}
          </span>{" "}
          {formatTooltipResourceName("food")}
        </span>
      </span>
    </div>
  );

  const renderPopulationControl = (jobId: string, label: string) => {
    const currentCount = villagers[jobId as keyof typeof villagers] || 0;
    const jobKey = jobId as keyof typeof villagers;
    const cap = getVillagerCapForJob(state, jobKey);
    const showCap =
      Number.isFinite(cap) &&
      (jobId === "gatherer" || areVillagerCapsEnabled(state));
    const atCap = showCap && currentCount >= cap;
    const canAssignMore =
      villagers.free > 0 && (!showCap || currentCount < cap);
    const capUpgradeGroupId = capUpgradeGroupByJobId.get(jobId);

    const productionEntries =
      currentCount > 0
        ? getPopulationProduction(jobId, currentCount, state)
        : [];
    const productionKey = productionEntries
      .map((p) => `${p.resource}:${p.totalAmount}`)
      .join("|");

    return (
      <div key={jobId} className={VILLAGER_COUNT_ROW_CLASS}>
        <div className={VILLAGER_COUNT_CONTROL_GRID_CLASS}>
          <Button
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (currentCount <= 0) return;
              // Ctrl/Cmd or Shift + left click: ±10 (same as right click)
              if (e.ctrlKey || e.metaKey || e.shiftKey) {
                e.preventDefault();
                unassignVillager(jobId, 10);
                return;
              }
              startHold(() => unassignVillager(jobId), false);
            }}
            onMouseUp={() => stopHold(false)}
            onMouseLeave={() => stopHold(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (currentCount > 0) {
                unassignVillager(jobId, 10);
              }
            }}
            onTouchStart={(e) => {
              beginTouchHold(e, () => unassignVillager(jobId), currentCount > 0);
            }}
            onTouchEnd={endTouchHold}
            onTouchCancel={endTouchHold}
            disabled={currentCount === 0}
            variant="outline"
            size="xs"
            compactChrome
            className={villagerCountButtonClassName(currentCount === 0)}
            style={{
              touchAction: "manipulation",
            }}
            button_id={`unassign-${jobId}`}
          >
            <span
              className={cn(
                "leading-none tabular-nums",
                currentCount === 0 && "opacity-60",
              )}
            >
              -
            </span>
          </Button>
          {renderVillagerCount(currentCount)}
          <Button
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if (!canAssignMore) return;
              // Ctrl/Cmd or Shift + left click: ±10 (same as right click)
              if (e.ctrlKey || e.metaKey || e.shiftKey) {
                e.preventDefault();
                assignVillager(jobId, 10);
                return;
              }
              startHold(() => assignVillager(jobId), false);
            }}
            onMouseUp={() => stopHold(false)}
            onMouseLeave={() => stopHold(false)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (canAssignMore) {
                assignVillager(jobId, 10);
              }
            }}
            onTouchStart={(e) => {
              beginTouchHold(e, () => assignVillager(jobId), canAssignMore);
            }}
            onTouchEnd={endTouchHold}
            onTouchCancel={endTouchHold}
            disabled={!canAssignMore}
            variant="outline"
            size="xs"
            compactChrome
            className={villagerCountButtonClassName(!canAssignMore)}
            style={{
              touchAction: "manipulation",
            }}
            button_id={`assign-${jobId}`}
          >
            <span
              className={cn(
                "leading-none tabular-nums",
                !canAssignMore && "opacity-60",
              )}
            >
              +
            </span>
          </Button>
        </div>
        {showCap ? (
          <VillagerJobCap
            jobId={jobId}
            cap={cap}
            atCap={atCap}
            className={VILLAGER_COUNT_CAP_CLASS}
          />
        ) : (
          <span translate="no" className={VILLAGER_COUNT_CAP_CLASS} />
        )}
        {renderCapUpgradeSlot(capUpgradeGroupId, jobId)}
        <JobProductionHover
          jobId={jobId}
          className={villagerCountLabelClass}
        >
          <span>
            {label}{" "}
            <span key={productionKey} className={VILLAGER_RESOURCE_HINT_CLASS}>
              {productionEntries.map((prod, i) => (
                <React.Fragment key={prod.resource}>
                  {i > 0 && ", "}
                  <span translate="no" className="notranslate">
                    {prod.totalAmount > 0 ? "+" : ""}
                    {prod.totalAmount}
                  </span>{" "}
                  {formatTooltipResourceName(prod.resource)}
                </React.Fragment>
              ))}
            </span>
          </span>
        </JobProductionHover>
      </div>
    );
  };

  return (
    <>
      <SuccessParticles buttonRef={feedFireButtonRef} sparks={sparks} />
      <ScrollArea className="h-full w-full">
        <div className={`w-full space-y-4 pr-2 pb-2 ${GAME_TAB_PANEL_BODY}`}>
          {actionGroups.map((group, groupIndex) => {
            const visibleActions = group.actions.filter((action) => {
              const actionWithShow = action as {
                id: string;
                label: string;
                showWhen?: () => boolean;
              };
              if (actionWithShow.showWhen !== undefined) {
                return (
                  actionWithShow.showWhen() ||
                  !!state.executionStartTimes?.[action.id]
                );
              }
              return (
                shouldShowAction(action.id, state) ||
                !!state.executionStartTimes?.[action.id]
              );
            });

            const redactedUtilityActions = catalogActive
              ? group.actions.filter((action) => {
                if (
                  !(DEMO_END_VILLAGE_UTILITY_ACTION_IDS as readonly string[]).includes(
                    action.id,
                  )
                ) {
                  return false;
                }
                if (visibleActions.some((visible) => visible.id === action.id)) {
                  return false;
                }
                return !isDemoEndVillageUtilityRevealed(
                  state,
                  action.id as DemoEndVillageUtilityActionId,
                );
              })
              : [];

            const { teasers: buildTeasers, showEllipsis: showBuildEllipsis } =
              catalogActive && group.title === "Build"
                ? getDemoEndHiddenActionTeasers(
                  group.actions,
                  new Set(visibleActions.map((action) => action.id)),
                )
                : { teasers: [], showEllipsis: false };

            const orderedVisibleActions =
              group.title === "Build" && visibleActions.length > 0
                ? actionUnlock.order(visibleActions, (action) => action.id, {
                    appendLastIds: BUILD_ACTION_APPEND_LAST_IDS,
                  })
                : visibleActions;

            if (
              orderedVisibleActions.length === 0 &&
              redactedUtilityActions.length === 0 &&
              buildTeasers.length === 0
            ) {
              return null;
            }

            return (
              <div key={groupIndex} className={GAME_TAB_SECTION_STACK}>
                {group.title === "Build" ? (
                  <div className={GAME_TAB_SECTION_HEADER_ROW}>
                    <h3 className={GAME_TAB_SECTION_HEADER}>
                      {t("village.sectionBuild")}
                      {catalogActive ? <DemoEndPromoBadge kind="build" /> : null}
                    </h3>
                    {(() => {
                      if (catalogActive) {
                        return (
                          <div className={GAME_PANEL_HEADER_SLOT_ROW_CLASS}>
                            {Array.from(
                              { length: getVisibleQueueSlotCount() },
                              (_, i) => (
                                <DemoEndHeaderSlotRedacted
                                  key={`queue-slot-${i + 1}-redacted`}
                                  testId={`queue-slot-${i + 1}-redacted`}
                                />
                              ),
                            )}
                          </div>
                        );
                      }
                      const nextUnlockCost = getNextQueueSlotUnlockCost(state);
                      const visibleSlots = getVisibleQueueSlotCount();
                      const nextUnlockIndex =
                        getNextPurchasableQueueSlotIndex(state);
                      const showQueueSlotUnlock =
                        nextUnlockIndex !== null && nextUnlockCost !== null;
                      const canUnlock = showQueueSlotUnlock
                        ? canPurchaseQueueSlot(state, insightRevealing)
                        : false;
                      const canInteractQueueUnlock =
                        canUnlock && !isQueueSlotUnlockAnimating;
                      const hideQueueSlotUnlockAfterReveal =
                        queueSlotUnlockRevealStartedRef.current &&
                        !isQueueSlotUnlockAnimating;
                      // Buying the slot clears the next offer immediately. Keep
                      // the badge mounted until the reveal animation finishes.
                      const showQueueSlotUnlockBadge =
                        isQueueSlotUnlockAnimating ||
                        (showQueueSlotUnlock && !hideQueueSlotUnlockAfterReveal);
                      const insightHeld = state.resources.insight ?? 0;
                      const queueUnlockAmount = isQueueSlotUnlockAnimating
                        ? getQueueSlotUnlockCost(
                            Math.max(0, constructionQueueSlotsPurchased - 1),
                          )
                        : nextUnlockCost;
                      const queueUnlock =
                        queueUnlockAmount != null
                          ? costBenefitTooltip({
                              amount: queueUnlockAmount,
                              available: insightHeld,
                              satisfied: isQueueSlotUnlockAnimating
                                ? true
                                : insightHeld >= queueUnlockAmount,
                              benefit: t("village.queueSlotUnlock", {
                                defaultValue: "Unlock construction queue slot",
                              }),
                            })
                          : null;
                      return (
                        <div className={GAME_PANEL_HEADER_SLOT_ROW_CLASS}>
                          {showQueueSlotUnlockBadge && (
                              <TooltipWrapper
                                tooltipId="queue-slot-unlock"
                                tooltip={queueUnlock?.tooltip}
                                className="inline-flex items-center"
                                tooltipTriggerClassName={
                                  INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS
                                }
                                disabled={!canInteractQueueUnlock}
                                onMouseEnter={() => {
                                  setHighlightedResources(["insight"]);
                                }}
                                onMouseLeave={() => {
                                  setHighlightedResources([]);
                                }}
                              >
                                <button
                                  type="button"
                                  data-testid="queue-slot-unlock"
                                  className={cn(
                                    getInsightBadgeTriggerClassName({
                                      canAfford:
                                        canUnlock || isQueueSlotUnlockAnimating,
                                      playing: isQueueSlotUnlockAnimating,
                                      className:
                                        HEADER_SLOT_INSIGHT_BUTTON_CLASS,
                                    }),
                                  )}
                                  aria-label={queueUnlock?.label}
                                  disabled={!canInteractQueueUnlock}
                                  aria-busy={isQueueSlotUnlockAnimating}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (canInteractQueueUnlock) {
                                      handleQueueSlotUnlock();
                                    }
                                  }}
                                >
                                  <BuildingActionBadge
                                    embedded
                                    size="lg"
                                    playing={isQueueSlotUnlockAnimating}
                                  />
                                </button>
                              </TooltipWrapper>
                            )}
                          {Array.from({ length: visibleSlots }).map((_, i) => {
                            const slot = i + 1;
                            const isBuildingLocked = isQueueSlotBuildingLocked(
                              state,
                              i,
                            );
                            const unlockBuildingKey =
                              getQueueSlotUnlockBuildingKey(i);
                            const isLocked = isQueueSlotLockedForUi(state, i);
                            const isInsightPurchaseLocked =
                              isQueueSlotInsightPurchaseLocked(state, i);
                            const isUsed = (usedQueueSlotMask & (1 << i)) !== 0;
                            const insightUnlockCost =
                              isInsightPurchaseLocked && i > 0
                                ? getQueueSlotUnlockCost(i - 1)
                                : null;
                            const queueTooltipId = `queue-slot-${slot}`;
                            return (
                              <TooltipWrapper
                                key={queueTooltipId}
                                tooltipId={queueTooltipId}
                                disabled
                                tooltip={
                                  <div>
                                    {isBuildingLocked
                                      ? t(
                                        "village.slotBuildingNeededToUnlock",
                                        {
                                          building: unlockBuildingKey
                                            ? getBuildingDisplayName(
                                              unlockBuildingKey,
                                            )
                                            : "",
                                          defaultValue:
                                            "{{building}} required to unlock",
                                        },
                                      )
                                      : insightUnlockCost !== null
                                        ? costBenefitTooltip({
                                            amount: insightUnlockCost,
                                            available:
                                              state.resources.insight ?? 0,
                                            satisfied:
                                              (state.resources.insight ?? 0) >=
                                              insightUnlockCost,
                                            benefit: t(
                                              "village.slotInsightUnlockAvailable",
                                              {
                                                defaultValue: "Can be unlocked",
                                              },
                                            ),
                                          }).tooltip
                                        : isLocked
                                          ? t("village.queueSlotLocked", {
                                            slot,
                                          })
                                          : isUsed
                                            ? t("village.queueSlotUsed", {
                                              slot,
                                            })
                                            : t("village.queueSlotFree", {
                                              slot,
                                            })}
                                  </div>
                                }
                                tooltipTriggerClassName="inline-flex items-center leading-none"
                                className="inline-flex items-center"
                              >
                                <ConstructionQueueSlot
                                  testId={queueTooltipId}
                                  kind={
                                    isLocked
                                      ? isInsightPurchaseLocked
                                        ? "plus"
                                        : "locked"
                                      : isUsed
                                        ? "used"
                                        : "free"
                                  }
                                />
                              </TooltipWrapper>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  group.title && (
                    <div className={GAME_TAB_SECTION_HEADER_ROW}>
                      <h3 className={GAME_TAB_SECTION_HEADER}>
                        {group.title}
                      </h3>
                    </div>
                  )
                )}
                <div className={gameActionButtonGridClassName("w-full")}>
                  {orderedVisibleActions.map((action) =>
                    renderButton(action.id, action.label),
                  )}
                  {redactedUtilityActions.map((action) => (
                    <RedactedLockedHint
                      key={action.id}
                      label={resolveActionLabel(action.id, action.label)}
                      tooltipId={`village-${action.id}-redacted`}
                    />
                  ))}
                  {buildTeasers.map((action) => (
                    <RedactedLockedHint
                      key={action.id}
                      label={resolveActionLabel(action.id, action.label)}
                      tooltipId={`village-${action.id}-redacted`}
                    />
                  ))}
                  {showBuildEllipsis ? (
                    <RedactedMoreHint tooltipId="village-build-more-redacted" />
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Rule Section */}
          {(catalogActive ||
            (story.seen?.hasVillagers && visiblePopulationJobs.length > 0)) && (
              <div className={GAME_TAB_SECTION_STACK}>
                <div className={GAME_TAB_PRODUCE_HEADER_ROW}>
                  <h3 className={GAME_TAB_SECTION_HEADER}>
                    {catalogActive && !story.seen?.hasVillagers ? (
                      <RedactedLockedHint
                        label={t("village.sectionProduce")}
                        tooltipId="village-produce-header-redacted"
                      />
                    ) : (
                      t("village.sectionProduce")
                    )}
                    {catalogActive ? <DemoEndPromoBadge kind="produce" /> : null}
                  </h3>
                  {(arePresetsVisible(state) || catalogActive) &&
                    (() => {
                      if (catalogActive) {
                        return (
                          <div className={GAME_PANEL_HEADER_SLOT_ROW_CLASS}>
                            {Array.from(
                              { length: getVisiblePresetSlotCount() },
                              (_, i) => (
                                <DemoEndHeaderSlotRedacted
                                  key={`village-preset-slot-${i + 1}-redacted`}
                                  testId={`village-preset-slot-${i + 1}-redacted`}
                                />
                              ),
                            )}
                          </div>
                        );
                      }
                      const presetState = {
                        buildings: state.buildings,
                        villagerPresetsPurchased,
                        villagerPresetSlotsFromShop,
                        villagerJobPresets,
                      };
                      const visibleSlots = getVisiblePresetSlotCount();
                      const nextUnlockIndex =
                        getNextPurchasablePresetSlotIndex(presetState);
                      const nextUnlockCost = getNextPresetUnlockCost(presetState);
                      const showPresetUnlock =
                        nextUnlockIndex !== null && nextUnlockCost !== null;
                      const canUnlockPreset = showPresetUnlock
                        ? canPurchasePresetSlot(state, insightRevealing)
                        : false;
                      const canInteractPresetUnlock =
                        canUnlockPreset && !isPresetUnlockAnimating;
                      const hidePresetUnlockAfterReveal =
                        presetUnlockRevealStartedRef.current &&
                        !isPresetUnlockAnimating;
                      const showPresetUnlockBadge =
                        isPresetUnlockAnimating ||
                        (showPresetUnlock && !hidePresetUnlockAfterReveal);
                      const insightHeld = state.resources.insight ?? 0;
                      const presetUnlockAmount = isPresetUnlockAnimating
                        ? getPresetUnlockCost(
                            Math.max(0, villagerPresetsPurchased - 1),
                          )
                        : nextUnlockCost;
                      const presetUnlock =
                        presetUnlockAmount != null
                          ? costBenefitTooltip({
                              amount: presetUnlockAmount,
                              available: insightHeld,
                              satisfied: isPresetUnlockAnimating
                                ? true
                                : insightHeld >= presetUnlockAmount,
                              benefit: t("village.presetUnlock", {
                                defaultValue: "Unlock villager preset",
                              }),
                            })
                          : null;
                      return (
                        <div className={GAME_PANEL_HEADER_SLOT_ROW_CLASS}>
                          {showPresetUnlockBadge && (
                            <TooltipWrapper
                              tooltipId="preset-unlock"
                              tooltip={presetUnlock?.tooltip}
                              className="inline-flex items-center"
                              tooltipTriggerClassName={
                                INSIGHT_BADGE_TOOLTIP_TRIGGER_CLASS
                              }
                              disabled={!canInteractPresetUnlock}
                              onMouseEnter={() => {
                                setHighlightedResources(["insight"]);
                              }}
                              onMouseLeave={() => {
                                setHighlightedResources([]);
                              }}
                            >
                              <button
                                type="button"
                                data-testid="preset-unlock"
                                className={cn(
                                  getInsightBadgeTriggerClassName({
                                    canAfford:
                                      canUnlockPreset || isPresetUnlockAnimating,
                                    playing: isPresetUnlockAnimating,
                                    className: HEADER_SLOT_INSIGHT_BUTTON_CLASS,
                                  }),
                                )}
                                aria-label={presetUnlock?.label}
                                disabled={!canInteractPresetUnlock}
                                aria-busy={isPresetUnlockAnimating}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (canInteractPresetUnlock) {
                                    handlePresetUnlock();
                                  }
                                }}
                              >
                                <BuildingActionBadge
                                  embedded
                                  size="lg"
                                  playing={isPresetUnlockAnimating}
                                />
                              </button>
                            </TooltipWrapper>
                          )}
                          {Array.from({ length: visibleSlots }).map((_, i) => {
                            const slot = i + 1;
                            const isBuildingLocked = isPresetSlotBuildingLocked(
                              presetState,
                              i,
                            );
                            const unlockBuildingKey =
                              getPresetSlotUnlockBuildingKey(i);
                            const isUnlocked = isPresetSlotUnlocked(
                              presetState,
                              i,
                            );
                            const presetTooltipId = `preset-slot-${slot}`;

                            if (isBuildingLocked) {
                              return (
                                <TooltipWrapper
                                  key={`preset-slot-${slot}`}
                                  tooltipId={presetTooltipId}
                                  disabled
                                  tooltip={
                                    <div>
                                      {t("village.slotBuildingNeededToUnlock", {
                                        building: unlockBuildingKey
                                          ? getBuildingDisplayName(
                                            unlockBuildingKey,
                                          )
                                          : "",
                                        defaultValue:
                                          "{{building}} required to unlock",
                                      })}
                                    </div>
                                  }
                                  tooltipTriggerClassName="inline-flex items-center leading-none"
                                  className="inline-flex items-center"
                                >
                                  <ConstructionQueueSlot
                                    testId={presetTooltipId}
                                    kind="locked"
                                  />
                                </TooltipWrapper>
                              );
                            }

                            if (!isUnlocked) {
                              const isInsightPurchaseLocked =
                                isPresetSlotInsightPurchaseLocked(presetState, i);
                              const insightUnlockCost = isInsightPurchaseLocked
                                ? getPresetUnlockCost(i)
                                : null;
                              return (
                                <TooltipWrapper
                                  key={`preset-slot-${slot}`}
                                  tooltipId={presetTooltipId}
                                  disabled
                                  tooltip={
                                    <div>
                                      {insightUnlockCost !== null
                                        ? costBenefitTooltip({
                                            amount: insightUnlockCost,
                                            available:
                                              state.resources.insight ?? 0,
                                            satisfied:
                                              (state.resources.insight ?? 0) >=
                                              insightUnlockCost,
                                            benefit: t(
                                              "village.slotInsightUnlockAvailable",
                                              {
                                                defaultValue: "Can be unlocked",
                                              },
                                            ),
                                          }).tooltip
                                        : t("village.presetLocked", {
                                          defaultValue:
                                            "Locked: available for purchase",
                                        })}
                                    </div>
                                  }
                                  tooltipTriggerClassName="inline-flex items-center leading-none"
                                  className="inline-flex items-center"
                                >
                                  <ConstructionQueueSlot
                                    testId={presetTooltipId}
                                    kind={
                                      isInsightPurchaseLocked ? "plus" : "locked"
                                    }
                                  />
                                </TooltipWrapper>
                              );
                            }

                            const isActive = activePresetSlot === slot;
                            const hasPreset = !!getPresetSlot(presetState, i);
                            const tooltipText = hasPreset
                              ? t("village.presetApply", { slot })
                              : t("village.presetEmpty", { slot });
                            return (
                              <TooltipWrapper
                                key={`preset-slot-${slot}`}
                                tooltipId={presetTooltipId}
                                openOnTap
                                tooltip={
                                  <div>{tooltipText}</div>
                                }
                                tooltipTriggerClassName="inline-flex items-center leading-none"
                                className="group flex items-center cursor-pointer"
                              >
                                <Button
                                  size="xs"
                                  variant={isActive ? "default" : "outline"}
                                  compactChrome
                                  haptic="light"
                                  data-testid={`preset-slot-${slot}`}
                                  button_id={`preset-slot-${slot}`}
                                  className={cn(
                                    HEADER_SLOT_BUTTON_CLASS,
                                    "text-2xs tabular-nums",
                                    isActive
                                      ? "group-hover:bg-primary/90"
                                      : gameActionOutlineButtonClassName(false, {
                                        groupHover: true,
                                      }),
                                  )}
                                  style={{
                                    touchAction: "manipulation",
                                  }}
                                  onClick={() => applyVillagerJobPreset(slot)}
                                >
                                  <span
                                    className={cn(!hasPreset && "opacity-70")}
                                  >
                                    {slot}
                                  </span>
                                </Button>
                              </TooltipWrapper>
                            );
                          })}
                          {hasAnyUnlockedPresetSlot(presetState) && (
                            <TooltipWrapper
                              tooltipId="preset-save"
                              tooltip={
                                <div>
                                  {t("village.presetSave", {
                                    slot: activePresetSlot,
                                  })}
                                </div>
                              }
                              tooltipTriggerClassName="inline-flex items-center leading-none"
                              className="group flex items-center cursor-pointer"
                            >
                              <Button
                                size="xs"
                                variant="outline"
                                compactChrome
                                haptic="light"
                                data-testid="preset-save"
                                button_id="preset-save"
                                className={cn(
                                  HEADER_SLOT_BUTTON_CLASS,
                                  gameActionOutlineButtonClassName(false, {
                                    groupHover: true,
                                  }),
                                )}
                                style={{
                                  touchAction: "manipulation",
                                }}
                                onClick={handlePresetSave}
                              >
                                <span
                                  className={
                                    presetSaveConfirmed
                                      ? "game-panel-header-slot-glyph inline-flex items-center justify-center leading-none text-green-500"
                                      : "game-panel-header-slot-glyph inline-flex items-center justify-center font-noto-symbols-2 leading-none translate-y-0.5"
                                  }
                                >
                                  {presetSaveConfirmed ? <CheckmarkIcon /> : "🖫"}
                                </span>
                              </Button>
                            </TooltipWrapper>
                          )}
                        </div>
                      );
                    })()}
                </div>
                <div className={villagerCountStackClass}>
                  {story.seen?.hasVillagers && (
                    <>
                      {renderVillagersSummaryRow()}
                      {renderVillagerStatRow(
                        "villagers-available",
                        t("village.villagersAvailable"),
                        freeVillagers,
                        {
                          jobId: "free",
                          productionEntries:
                            freeVillagers > 0
                              ? getPopulationProduction(
                                  "free",
                                  freeVillagers,
                                  state,
                                )
                              : [],
                        },
                      )}
                      {showVillagerMissionRows &&
                        renderVillagerStatRow(
                          "villagers-on-mission",
                          t("village.villagersOnMission"),
                          onMissionCount,
                        )}
                      {visiblePopulationJobs.map((job) =>
                        renderPopulationControl(
                          job.id,
                          t(`village.jobs.${job.id}`, { defaultValue: job.label }),
                        ),
                      )}
                      {priorAssignedCount > 0 && renderDisgracedPriorRow()}
                    </>
                  )}
                  {catalogActive &&
                    populationJobs
                      .filter(
                        (job) =>
                          !story.seen?.hasVillagers ||
                          !visiblePopulationJobs.some((visible) => visible.id === job.id),
                      )
                      .map((job) =>
                        renderRedactedJobRow(
                          job.id,
                          t(`village.jobs.${job.id}`, { defaultValue: job.label }),
                        ),
                      )}
                </div>
              </div>
            )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </>
  );
}
