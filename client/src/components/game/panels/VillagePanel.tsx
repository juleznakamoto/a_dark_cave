import React from "react";
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import {
  feastTooltip,
  solsticeTooltip,
  curseTooltip,
  miningBoostTooltip,
  frostfallTooltip,
  fogTooltip,
  disgustTooltip,
  heartfireTooltip,
  madnessProductionTooltip,
  getActionDurationLine,
} from "@/game/rules/tooltips";
import {
  getTotalMadness,
  getStrangerApproachProbability,
} from "@/game/rules/effectsCalculation";
import {
  resolveActionDescription,
  resolveActionLabel,
} from "@/i18n/actionLabels";
import { useTranslation } from "react-i18next";
import {
  formatTooltipCostLine,
  formatTooltipResourceName,
} from "@/i18n/tooltipLabels";
import {
  getPalisadesTierLabel,
  getWatchtowerTierLabel,
} from "@/i18n/fortificationLabels";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import { Button } from "@/components/ui/button";
import { getPopulationProduction } from "@/game/population";
import {
  areVillagerCapsEnabled,
  getVillagerCapForJob,
} from "@/game/villagerCapUpgrades";
import {
  BuildingActionBadge,
  getInsightBadgeTriggerClassName,
  INSIGHT_BADGE_ALIGN_CLASS,
} from "@/components/game/BuildingActionBadge";
import { formatNumber } from "@/lib/utils";
import {
  MAX_PRESET_SLOTS,
  arePresetsVisible,
  canPurchasePresetSlot,
  getNextPresetUnlockCost,
  getNextPurchasablePresetSlotIndex,
  getPresetSlot,
  getPurchasedPresetCount,
} from "@/game/villagerJobPresets";
import {
  canBoostConstruction,
  canPurchaseQueueSlot,
  getActiveBuildCount,
  getNextPurchasableQueueSlotIndex,
  getNextQueueSlotUnlockCost,
  getTotalQueueSlots,
  isConstructionQueueEnabled,
  QUEUE_SLOT_UNLOCK_INSIGHT_KEY,
} from "@/game/constructionQueueSlots";
import { CircularProgress } from "@/components/ui/circular-progress";
import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AnimatedCounter, ANIMATED_COUNTER_FONT_SIZE, ANIMATED_COUNTER_HEIGHT } from "@/components/ui/animated-counter";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { ActionInsightBadge } from "@/components/game/ActionInsightBadge";
import { ConstructionBoostBadge } from "@/components/game/ConstructionBoostBadge";
import { getRevealedEffectsForActionTooltip } from "@/game/rules/insightRevealTooltip";
import { composeActionTooltip } from "@/game/rules/actionTooltipLayout";
import {
  canRevealEffects,
  isInsightRevealInProgress,
  PRESET_UNLOCK_INSIGHT_KEY,
} from "@/game/rules/insightReveal";
import {
  SuccessParticles,
  useFeedFireParticles,
} from "@/components/ui/feed-fire-particles";
import { audioManager, feedFireVolume } from "@/lib/audio";
import { BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";
import {
  generateParticleData,
  type BubbleWithParticles,
} from "@/components/ui/bubbly-button.particles";
import { ButtonPriorBadge } from "@/components/game/ButtonPriorBadge";
import { PRIOR_ELIGIBLE_ACTIONS } from "@/game/buttonUpgrades";
import {
  curseLikeDurationMs,
  disgustDurationMs,
  cruelModeScale,
  riddleFogDurationMs,
} from "@/game/cruelMode";
import { isBuildingUpgrade } from "@/game/buildingHierarchy";
import cn from "clsx";
import InvestDialog from "@/components/game/InvestDialog";
import { isInvestmentWaveReadyForUi } from "@/game/rules/investmentHallTables";
import { GREAT_FEAST_DURATION_MS } from "@shared/shopItems";
import { useNewItemPulseTooltips } from "@/hooks/useNewItemPulseTooltip";

const VILLAGE_INDICATOR_TOOLTIP_IDS = [
  "production-cycle-progress",
  "feast-progress",
  "solstice-progress",
  "curse-progress",
  "disgust-progress",
  "mining-boost-progress",
  "heartfire-progress",
  "frostfall-progress",
  "fog-progress",
  "madness-production",
  "preset-save",
  "preset-unlock",
  "queue-slot-unlock",
  ...Array.from({ length: MAX_PRESET_SLOTS }, (_, i) => `preset-slot-${i + 1}`),
  ...Array.from({ length: 3 }, (_, i) => `queue-slot-${i + 1}`),
] as const;

/** Shared with the 18px circular progress indicators in the Produce header row. */
const PRODUCE_HEADER_INDICATOR_CLASS =
  "inline-flex shrink-0 items-center self-center cursor-pointer";
const PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS =
  "inline-flex items-center leading-none";

export default function VillagePanel() {
  const { t } = useTranslation("ui");
  const {
    villagers,
    buildings,
    story,
    timedEventTab,
    playTime,
    resources,
    executeAction,
    assignVillager,
    unassignVillager,
    setHighlightedResources,
    callMerchant,
    investmentHallState,
    investDialogOpen,
    setInvestDialogOpen,
    villagerJobPresets,
    activePresetSlot,
    villagerPresetsPurchased,
    saveVillagerJobPreset,
    applyVillagerJobPreset,
    setActivePresetSlot,
    purchaseVillagerPresetSlot,
    purchaseConstructionQueueSlot,
  } = useGameStore();
  const { pulseClassName, onMouseEnter, onMouseLeave } =
    useNewItemPulseTooltips(VILLAGE_INDICATOR_TOOLTIP_IDS);

  const handleInvestDialogOpenChange = useCallback(
    (next: boolean) => {
      if (next && !isInvestmentWaveReadyForUi(useGameStore.getState())) return;
      setInvestDialogOpen(next);
    },
    [setInvestDialogOpen],
  );

  const state =
    useGameStore.getState() as unknown as import("@shared/schema").GameState;

  // Particle effect state
  const feedFireButtonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();

  // Bubbly button animation state
  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);

  const [presetSaveConfirmed, setPresetSaveConfirmed] = useState(false);
  const presetSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const handlePresetSave = useCallback(() => {
    saveVillagerJobPreset(activePresetSlot);
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

  const presetUnlockRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[PRESET_UNLOCK_INSIGHT_KEY],
  );
  const insightRevealing = useGameStore((s) => s.insightRevealing);
  const isPresetUnlockAnimating = isInsightRevealInProgress(
    PRESET_UNLOCK_INSIGHT_KEY,
    insightRevealing,
  );
  const queueSlotUnlockRevealEnd = useGameStore(
    (s) => s.insightRevealing?.[QUEUE_SLOT_UNLOCK_INSIGHT_KEY],
  );
  const isQueueSlotUnlockAnimating = isInsightRevealInProgress(
    QUEUE_SLOT_UNLOCK_INSIGHT_KEY,
    insightRevealing,
  );
  const [, forcePresetUnlockUpdate] = useState(0);
  const [, forceQueueSlotUnlockUpdate] = useState(0);

  useEffect(() => {
    if (!isPresetUnlockAnimating) return;
    const id = setInterval(() => forcePresetUnlockUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isPresetUnlockAnimating, presetUnlockRevealEnd]);

  useEffect(() => {
    if (!isQueueSlotUnlockAnimating) return;
    const id = setInterval(() => forceQueueSlotUnlockUpdate((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [isQueueSlotUnlockAnimating, queueSlotUnlockRevealEnd]);

  useEffect(
    () => () => {
      if (presetSaveTimeoutRef.current) {
        clearTimeout(presetSaveTimeoutRef.current);
      }
    },
    [],
  );

  const handleAnimationTrigger = (x: number, y: number) => {
    // Use a counter to ensure unique IDs even for rapid clicks
    const id = `bubble-${bubbleIdCounter.current++}-${Date.now()}`;
    // Generate particle data once when bubble is created (prevents random regeneration)
    const particles = generateParticleData();
    setBubbles((prev) => [...prev, { id, x, y, particles }]);

    // Keep bubbles visible for animation duration
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 3000); // Match the bubbly-button animation duration
  };

  // Get progress from game loop state
  const loopProgress = useGameStore((state) => state.loopProgress);
  const productionSecondsRemaining = Math.max(
    0,
    Math.ceil(((100 - loopProgress) / 100) * 15),
  );
  const feastState = useGameStore((state) => state.feastState);
  const greatFeastState = useGameStore((state) => state.greatFeastState);
  const solsticeState = useGameStore((state) => state.solsticeState);

  // Calculate feast progress based on game loop timing
  const [feastProgress, setFeastProgress] = React.useState(0);
  const [solsticeProgress, setSolsticeProgress] = React.useState(0);

  React.useEffect(() => {
    const updateFeastProgress = () => {
      const now = Date.now();
      if (greatFeastState?.isActive && greatFeastState.endTime > now) {
        const greatFeastElapsed =
          GREAT_FEAST_DURATION_MS - (greatFeastState.endTime - now);
        setFeastProgress((greatFeastElapsed / GREAT_FEAST_DURATION_MS) * 100);
      } else if (feastState?.isActive && feastState.endTime > now) {
        const state = useGameStore.getState();
        const baseDuration = 10 * 60 * 1000; // 10 minutes
        const btpBonus = state.BTP === 1 ? 5 * 60 * 1000 : 0; // +5 minutes for BTP
        const feastDuration = baseDuration + btpBonus;
        const feastElapsed = feastDuration - (feastState.endTime - now);
        setFeastProgress((feastElapsed / feastDuration) * 100);
      } else {
        setFeastProgress(0);
      }
    };

    updateFeastProgress();
    const interval = setInterval(updateFeastProgress, 1000);

    return () => clearInterval(interval);
  }, [feastState, greatFeastState]);

  React.useEffect(() => {
    const updateSolsticeProgress = () => {
      const now = Date.now();
      if (solsticeState?.isActive && solsticeState.endTime > now) {
        const solsticeDuration = 10 * 60 * 1000; // 10 minutes
        const solsticeElapsed =
          solsticeDuration - (solsticeState.endTime - now);
        setSolsticeProgress((solsticeElapsed / solsticeDuration) * 100);
      } else {
        setSolsticeProgress(0);
      }
    };

    updateSolsticeProgress();
    const interval = setInterval(updateSolsticeProgress, 1000);

    return () => clearInterval(interval);
  }, [solsticeState]);

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
        { id: "buildWatchtower", label: "Watchtower" },
        { id: "buildPalisades", label: "Palisades" },
        { id: "buildFortifiedMoat", label: "Fortified Moat" },
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

  // Define population jobs
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

  const getHeartfireSymbol = (level: number) => {
    const config: Record<
      number,
      {
        symbol: string;
        marginTop: string;
        textSize: string;
        fontWeight?: number;
      }
    > = {
      1: {
        symbol: "·",
        marginTop: "3px",
        textSize: "text-[16px]",
        fontWeight: 800,
      },
      2: {
        symbol: ":",
        marginTop: "1px",
        textSize: "text-[12px]",
        fontWeight: 800,
      },
      3: {
        symbol: "∴",
        marginTop: "1px",
        textSize: "text-[12px]",
        fontWeight: 900,
      },
      4: {
        symbol: "⁘",
        marginTop: "0px",
        textSize: "text-[16px]",
        fontWeight: 700,
      },
      5: {
        symbol: "⁙",
        marginTop: "0px",
        textSize: "text-[14px]",
        fontWeight: 700,
      },
    };

    const entry = config[level];
    if (!entry) return null;

    return (
      <span
        className={entry.textSize}
        style={{
          marginTop: entry.marginTop,
          fontWeight: entry.fontWeight,
        }}
      >
        {entry.symbol}
      </span>
    );
  };

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
      const ih = investmentHallState;
      const active = ih?.active;
      const nextWave = ih?.nextWavePlayTime ?? 0;
      const currentPlayTime = playTime ?? 0;
      const formatRemaining = (ms: number) => {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };
      const investReady = isInvestmentWaveReadyForUi({
        playTime: currentPlayTime,
        investmentHallState: ih,
      });
      const tooltipContent = !investReady ? (
        active ? (
          <div className="text-xs max-w-[220px]">
            {t("village.investCompleteIn", {
              time: formatRemaining(
                Math.max(0, active.endPlayTime - currentPlayTime),
              ),
            })}
          </div>
        ) : currentPlayTime < nextWave ? (
          <div className="text-xs whitespace-nowrap">
            {t("village.investAvailableIn", {
              time: formatRemaining(Math.max(0, nextWave - currentPlayTime)),
            })}
          </div>
        ) : (
          <div className="text-xs whitespace-nowrap">
            {t("village.investPreparing")}
          </div>
        )
      ) : undefined;
      return (
        <React.Fragment key="invest">
          <CooldownButton
            onClick={() => setInvestDialogOpen(true)}
            cooldownMs={0}
            data-testid="button-invest"
            actionId="invest"
            button_id="invest"
            disabled={!investReady}
            playTimeProgress={
              active
                ? {
                  startPlayTime: active.startPlayTime,
                  endPlayTime: active.endPlayTime,
                }
                : null
            }
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

    // Special case for Call Merchant button (same CooldownButton structure as other actions)
    if (actionId === "callMerchant") {
      const callMerchantLastEndPlayTime = story?.seen
        ?.callMerchantLastEndPlayTime as number | undefined;
      const usageCount = (story?.seen?.callMerchantUsageCount as number) || 0;
      const price = Math.min(50 + 50 * usageCount, 250);
      const isMerchantActive =
        timedEventTab?.isActive &&
        timedEventTab?.event?.id?.includes?.("merchant");
      const isOtherEventActive = timedEventTab?.isActive && !isMerchantActive;

      const cooldownEndPlayTime =
        (callMerchantLastEndPlayTime ?? 0) + 5 * 60 * 1000;
      const currentPlayTime = playTime ?? 0;
      const isOnCooldown =
        callMerchantLastEndPlayTime != null &&
        currentPlayTime < cooldownEndPlayTime;
      const remainingMs = Math.max(0, cooldownEndPlayTime - currentPlayTime);
      const canAfford = (resources?.gold ?? 0) >= price;
      const isDisabled = isOtherEventActive || isOnCooldown || !canAfford;

      const formatRemaining = (ms: number) => {
        const totalSeconds = Math.ceil(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      };

      const tooltipContent = isOtherEventActive ? (
        <div className="text-xs">{t("village.merchantBlocked")}</div>
      ) : isOnCooldown ? (
        <div className="text-xs whitespace-nowrap">
          {t("village.merchantAvailableIn", {
            time: formatRemaining(remainingMs),
          })}
        </div>
      ) : (
        <div className="text-xs whitespace-nowrap">
          <div
            className={canAfford ? "text-foreground" : "text-muted-foreground"}
          >
            {formatTooltipCostLine(price, "gold")}
          </div>
        </div>
      );

      return (
        <CooldownButton
          key="callMerchant"
          onClick={() => callMerchant()}
          cooldownMs={0}
          data-testid="button-call-merchant"
          actionId="callMerchant"
          button_id="callMerchant"
          disabled={isDisabled}
          size="xs"
          variant="outline"
          className=""
          tooltip={tooltipContent}
          style={{ pointerEvents: "auto" }}
        >
          <span className="flex items-center gap-1">
            {resolveActionLabel("callMerchant", label)}
          </span>
        </CooldownButton>
      );
    }

    // Special case for Feed Fire button
    if (actionId === "feedFire") {
      const heartfireBuilt = buildings.heartfire > 0;
      if (!heartfireBuilt) return null;

      const currentLevel = state.heartfireState?.level || 0;
      const woodCost = 50 * (currentLevel + 1);
      const canExecute = state.resources.wood >= woodCost && currentLevel < 5;

      const tooltipContent =
        currentLevel < 5 ? (
          <div className="text-xs whitespace-nowrap">
            <div
              className={
                state.resources.wood >= woodCost
                  ? "text-foreground"
                  : "text-muted-foreground"
              }
            >
              {formatTooltipCostLine(woodCost, "wood")}
            </div>
          </div>
        ) : undefined;

      const button = (
        <CooldownButton
          key={actionId}
          ref={feedFireButtonRef}
          onClick={() => {
            executeAction(actionId);
            audioManager.playSound("feedFire", feedFireVolume(currentLevel));
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
          style={{ pointerEvents: "auto" }}
        >
          <span className="flex items-center gap-1">
            {resolveActionLabel("feedFire", label)}
          </span>
        </CooldownButton>
      );

      const isPriorEligible = PRIOR_ELIGIBLE_ACTIONS.has(actionId);
      return isPriorEligible ? (
        <div key={`${actionId}-wrapper`} className="relative inline-block">
          {button}
          <ButtonPriorBadge actionId={actionId} />
        </div>
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

    const hasRevealedEffects = (state.revealedEffects ?? []).includes(actionId);
    const buildingDescription =
      state.books?.book_of_craftsmanship || hasRevealedEffects
        ? resolveActionDescription(actionId, action.description)
        : undefined;
    const buildingKey = actionId.startsWith("build")
      ? actionId.slice(5, 6).toLowerCase() + actionId.slice(6)
      : null;
    const isUpgrade = buildingKey ? isBuildingUpgrade(buildingKey) : false;
    const revealedEffects = getRevealedEffectsForActionTooltip(actionId, state);
    const durationLine = getActionDurationLine(actionId, state);
    const tooltipContent = composeActionTooltip({
      header: (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 whitespace-nowrap">
            {costBreakdown.map((cost, index) => (
              <div
                key={index}
                className={
                  cost.satisfied ? "text-foreground" : "text-muted-foreground"
                }
              >
                {cost.text}
              </div>
            ))}
            {durationLine}
          </div>
          {isUpgrade && (
            <span className="font-noto-symbols-2 text-green-700 leading-none shrink-0">
              ↑
            </span>
          )}
        </div>
      ),
      description: buildingDescription,
      effects: revealedEffects,
      style:
        buildingDescription || revealedEffects ? { width: "12rem" } : undefined,
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
        onAnimationTrigger={handleAnimationTrigger}
        onMouseEnter={() => {
          setHighlightedResources(getResourcesFromActionCost(actionId, state));
        }}
        onMouseLeave={() => {
          setHighlightedResources([]);
        }}
        style={{ pointerEvents: "auto" }}
      >
        {displayLabel}
      </CooldownButton>
    );

    const showInsightReveal = canRevealEffects(actionId, state);
    const showConstructionBoost = canBoostConstruction(state, actionId);

    if (showInsightReveal || showConstructionBoost) {
      return (
        <div key={`${actionId}-wrapper`} className="relative inline-block">
          {button}
          {showConstructionBoost && (
            <ConstructionBoostBadge actionId={actionId} />
          )}
          {showInsightReveal && <ActionInsightBadge actionId={actionId} />}
        </div>
      );
    }

    return button;
  };

  // Hold-to-repeat state management (moved outside to avoid conditional hooks)
  // Use refs so we can clear from anywhere (e.g. when Merchant dialog opens and mouseup never fires)
  const holdRef = useRef<{
    interval: NodeJS.Timeout | null;
    timeout: NodeJS.Timeout | null;
  }>({ interval: null, timeout: null });

  // Track if a touch event occurred to prevent duplicate mouse events
  const touchActiveRef = useRef(false);

  const startHold = (action: () => void, isTouch: boolean = false) => {
    // If this is a mouse event but touch is active, skip it
    if (!isTouch && touchActiveRef.current) {
      return;
    }

    // Set touch active flag if this is a touch event
    if (isTouch) {
      touchActiveRef.current = true;
    }

    // Clear any existing hold before starting new one
    if (holdRef.current.timeout) clearTimeout(holdRef.current.timeout);
    if (holdRef.current.interval) clearInterval(holdRef.current.interval);
    holdRef.current = { interval: null, timeout: null };

    // Execute immediately
    action();

    // Wait 500ms before starting repeat
    const timeout = setTimeout(() => {
      // Then repeat every 100ms
      const interval = setInterval(action, 100);
      holdRef.current.interval = interval;
    }, 500);
    holdRef.current.timeout = timeout;
  };

  const stopHold = (isTouch: boolean = false) => {
    // Ignore synthetic mouse up/leave that browsers fire after touch — they would
    // cancel the hold before the repeat interval starts.
    if (!isTouch && touchActiveRef.current) {
      return;
    }

    if (holdRef.current.timeout) {
      clearTimeout(holdRef.current.timeout);
    }
    if (holdRef.current.interval) {
      clearInterval(holdRef.current.interval);
    }
    holdRef.current = { interval: null, timeout: null };

    // Reset touch flag after a delay to allow mouse event to be skipped
    if (isTouch) {
      setTimeout(() => {
        touchActiveRef.current = false;
      }, 100);
    }
  };

  // When the tab switches away (e.g. Merchant pops up and auto-switches to timedevent tab),
  // VillagePanel unmounts but the hold interval keeps running. Clear on unmount.
  useEffect(() => {
    return () => {
      if (holdRef.current.timeout) clearTimeout(holdRef.current.timeout);
      if (holdRef.current.interval) clearInterval(holdRef.current.interval);
      holdRef.current = { interval: null, timeout: null };
      touchActiveRef.current = false;
    };
  }, []);

  const renderPopulationControl = (jobId: string, label: string) => {
    const currentCount = villagers[jobId as keyof typeof villagers] || 0;
    const jobKey = jobId as keyof typeof villagers;
    const cap = getVillagerCapForJob(state, jobKey);
    const showCap =
      areVillagerCapsEnabled(state) && Number.isFinite(cap);
    const atCap = showCap && currentCount >= cap;
    const canAssignMore =
      villagers.free > 0 && (!showCap || currentCount < cap);

    const productionEntries =
      currentCount > 0
        ? getPopulationProduction(jobId, currentCount, state)
        : [];
    const productionKey = productionEntries
      .map((p) => `${p.resource}:${p.totalAmount}`)
      .join("|");

    return (
      <div key={jobId} className="flex min-w-0 items-center">
        <Button
          onMouseDown={() =>
            currentCount > 0 &&
            startHold(() => unassignVillager(jobId), false)
          }
          onMouseUp={() => stopHold(false)}
          onMouseLeave={() => stopHold(false)}
          onTouchStart={(e) => {
            if (currentCount > 0) {
              e.preventDefault(); // Prevent ghost click - synthetic mouse events cause unwanted assign on nearby +
              startHold(() => unassignVillager(jobId), true);
            }
          }}
          onTouchEnd={(e) => {
            if (e.cancelable) e.preventDefault();
            stopHold(true);
          }}
          onTouchCancel={() => stopHold(true)}
          disabled={currentCount === 0}
          variant="ghost"
          size="xs"
          className="h-5 w-5 shrink-0 flex items-center justify-center no-hover text-lg text-center"
          style={{ touchAction: "manipulation" }}
          button_id={`unassign-${jobId}`}
        >
          -
        </Button>
        <div className="flex w-[3ch] shrink-0 items-center justify-center">
          <AnimatedCounter
            value={currentCount}
            className={atCap ? "text-muted-foreground" : undefined}
          />
        </div>
        <Button
          onMouseDown={() =>
            canAssignMore && startHold(() => assignVillager(jobId), false)
          }
          onMouseUp={() => stopHold(false)}
          onMouseLeave={() => stopHold(false)}
          onTouchStart={(e) => {
            if (canAssignMore) {
              e.preventDefault(); // Prevent ghost click - synthetic mouse events cause unwanted actions
              startHold(() => assignVillager(jobId), true);
            }
          }}
          onTouchEnd={(e) => {
            if (e.cancelable) e.preventDefault();
            stopHold(true);
          }}
          onTouchCancel={() => stopHold(true)}
          disabled={!canAssignMore}
          variant="ghost"
          size="xs"
          className="h-5 w-5 shrink-0 flex items-center justify-center no-hover text-lg text-center"
          style={{ touchAction: "manipulation" }}
          button_id={`assign-${jobId}`}
        >
          +
        </Button>
        <span
          translate="no"
          className="notranslate w-[4ch] shrink-0 tabular-nums text-muted-foreground"
          style={{
            fontSize: ANIMATED_COUNTER_FONT_SIZE,
            lineHeight: `${ANIMATED_COUNTER_HEIGHT}px`,
          }}
        >
          {showCap ? `/${cap}` : ""}
        </span>
        <span className="ml-1 min-w-0 flex-1 text-left text-xs">
          {label}{" "}
          <span key={productionKey} className="text-xs text-muted-foreground">
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
      </div>
    );
  };

  // Filter visible population jobs
  const visiblePopulationJobs = populationJobs.filter((job) => {
    if (job.alwaysShow) return true;
    if (job.showWhen) return job.showWhen();
    return false;
  });

  return (
    <>
      <SuccessParticles buttonRef={feedFireButtonRef} sparks={sparks} />
      <BubblyButtonGlobalPortal bubbles={bubbles} />
      <ScrollArea className="h-full w-full">
        <div className="w-full space-y-4 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pr-2 pb-2">
          {actionGroups.map((group, groupIndex) => {
            const visibleActions = group.actions.filter((action) => {
              const actionWithShow = action as {
                id: string;
                label: string;
                showWhen?: () => boolean;
              };
              if (actionWithShow.showWhen !== undefined) {
                return actionWithShow.showWhen();
              }
              return (
                shouldShowAction(action.id, state) ||
                !!state.executionStartTimes?.[action.id]
              );
            });

            if (visibleActions.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.title === "Build" ? (
                  <div className="flex w-full items-center gap-2">
                    <h3 className="inline-flex shrink-0 items-center text-xs font-medium text-foreground leading-none">
                      {t("village.sectionBuild")}
                    </h3>
                    {isConstructionQueueEnabled(state) &&
                      (() => {
                        const nextUnlockIndex =
                          getNextPurchasableQueueSlotIndex(state);
                        const nextUnlockCost = getNextQueueSlotUnlockCost(state);
                        if (
                          nextUnlockIndex === null ||
                          nextUnlockCost === null
                        ) {
                          return null;
                        }
                        const canUnlock = canPurchaseQueueSlot(
                          state,
                          insightRevealing,
                        );
                        const canInteract =
                          canUnlock && !isQueueSlotUnlockAnimating;
                        return (
                          <div className="inline-flex shrink-0 items-center self-center">
                            <TooltipWrapper
                              tooltipId="queue-slot-unlock"
                              tooltip={
                                <div className="text-xs">
                                  {t("village.queueSlotUnlock", {
                                    cost: formatNumber(nextUnlockCost),
                                  })}
                                </div>
                              }
                              tooltipContentClassName="text-white"
                              className={pulseClassName(
                                "queue-slot-unlock",
                                "inline-flex items-center",
                              )}
                              tooltipTriggerClassName={
                                PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS
                              }
                              tooltipTriggerAsChild
                              disabled={!canInteract}
                              onMouseEnter={() => {
                                onMouseEnter("queue-slot-unlock");
                                setHighlightedResources(["insight"]);
                              }}
                              onMouseLeave={() => {
                                onMouseLeave("queue-slot-unlock");
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
                                    className: cn(
                                      "inline-flex h-5 w-5 shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:cursor-pointer",
                                      INSIGHT_BADGE_ALIGN_CLASS,
                                    ),
                                  }),
                                )}
                                aria-label={t("village.queueSlotUnlock", {
                                  cost: formatNumber(nextUnlockCost),
                                })}
                                disabled={!canInteract}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (canInteract) handleQueueSlotUnlock();
                                }}
                              >
                                <BuildingActionBadge
                                  playing={isQueueSlotUnlockAnimating}
                                  embedded
                                  size="lg"
                                />
                              </button>
                            </TooltipWrapper>
                          </div>
                        );
                      })()}
                    {isConstructionQueueEnabled(state) &&
                      (() => {
                        const totalSlots = getTotalQueueSlots(state);
                        const activeBuilds = getActiveBuildCount(state);
                        return (
                          <div className="ml-auto flex shrink-0 items-center gap-1">
                            {Array.from({ length: totalSlots }).map((_, i) => {
                              const slot = i + 1;
                              const isUsed = i < activeBuilds;
                              const queueTooltipId = `queue-slot-${slot}`;
                              return (
                                <TooltipWrapper
                                  key={queueTooltipId}
                                  tooltipId={queueTooltipId}
                                  tooltip={
                                    <div className="text-xs">
                                      {isUsed
                                        ? t("village.queueSlotUsed", { slot })
                                        : t("village.queueSlotFree", { slot })}
                                    </div>
                                  }
                                  tooltipTriggerClassName="inline-flex items-center leading-none"
                                  className={pulseClassName(
                                    queueTooltipId,
                                    "inline-flex items-center",
                                  )}
                                  onMouseEnter={() =>
                                    onMouseEnter(queueTooltipId)
                                  }
                                  onMouseLeave={() =>
                                    onMouseLeave(queueTooltipId)
                                  }
                                >
                                  <span
                                    data-testid={queueTooltipId}
                                    className={cn(
                                      "inline-block h-[10px] w-[10px] shrink-0 rounded-sm border",
                                      isUsed
                                        ? "border-primary bg-primary"
                                        : "border-muted-foreground/40 bg-transparent",
                                    )}
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
                    <h3 className="text-xs font-medium text-foreground ">
                      {group.title}
                    </h3>
                  )
                )}
                <div className="flex w-full flex-wrap gap-2">
                  {visibleActions.map((action) =>
                    renderButton(action.id, action.label),
                  )}
                </div>
              </div>
            );
          })}

          {/* Rule Section */}
          {story.seen?.hasVillagers && visiblePopulationJobs.length > 0 && (
            <div className="space-y-2">
              <div className="flex w-full items-center gap-2">
                <h3 className="inline-flex shrink-0 items-center text-xs font-medium text-foreground leading-none">
                  {t("village.sectionProduce")}
                </h3>
                {(() => {
                  if (!arePresetsVisible(state)) return null;
                  const nextUnlockIndex =
                    getNextPurchasablePresetSlotIndex(state);
                  const nextUnlockCost = getNextPresetUnlockCost(state);
                  if (nextUnlockIndex === null || nextUnlockCost === null) {
                    return null;
                  }
                  const canUnlock = canPurchasePresetSlot(state, insightRevealing);
                  const canInteract = canUnlock && !isPresetUnlockAnimating;
                  return (
                    <div className="inline-flex shrink-0 items-center self-center">
                      <TooltipWrapper
                        tooltipId="preset-unlock"
                        tooltip={
                          <div className="text-xs">
                            {t("village.presetUnlock", {
                              cost: formatNumber(nextUnlockCost),
                            })}
                          </div>
                        }
                        tooltipContentClassName="text-white"
                        className={pulseClassName(
                          "preset-unlock",
                          "inline-flex items-center",
                        )}
                        tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                        tooltipTriggerAsChild
                        disabled={!canInteract}
                        onMouseEnter={() => {
                          onMouseEnter("preset-unlock");
                          setHighlightedResources(["insight"]);
                        }}
                        onMouseLeave={() => {
                          onMouseLeave("preset-unlock");
                          setHighlightedResources([]);
                        }}
                      >
                        <button
                          type="button"
                          data-testid="preset-unlock"
                          className={cn(
                            getInsightBadgeTriggerClassName({
                              canAfford: canUnlock || isPresetUnlockAnimating,
                              playing: isPresetUnlockAnimating,
                              className: cn(
                                "inline-flex h-5 w-5 shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:cursor-pointer",
                                INSIGHT_BADGE_ALIGN_CLASS,
                              ),
                            }),
                          )}
                          aria-label={t("village.presetUnlock", {
                            cost: formatNumber(nextUnlockCost),
                          })}
                          disabled={!canInteract}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (canInteract) handlePresetUnlock();
                          }}
                        >
                          <BuildingActionBadge
                            playing={isPresetUnlockAnimating}
                            embedded
                            size="lg"
                          />
                        </button>
                      </TooltipWrapper>
                    </div>
                  );
                })()}
                {/* Production Cycle */}
                <TooltipWrapper
                  tooltip={(() => {
                    const state = useGameStore.getState();
                    const {
                      rawChance,
                      lowPopulationBonus,
                      fromBuildings,
                      fromBlessings,
                      fromEvents,
                      fromHeartfire,
                    } = getStrangerApproachProbability(state);
                    const chancePct = Math.round(rawChance * 100);
                    return (
                      <div className="text-xs">
                        <div className="font-semibold">
                          {t("village.cycle")}
                        </div>
                        <div>
                          {t("village.nextCycleIn", {
                            seconds: productionSecondsRemaining,
                          })}
                        </div>
                        <div className="border-t border-gray-600 my-1" />
                        <div>
                          {t("village.newVillagerChance", {
                            percent: chancePct,
                          })}
                        </div>
                        {lowPopulationBonus > 0 && (
                          <div className="text-gray-400/70">
                            {t("village.lowPopulationBonus", {
                              percent: Math.round(lowPopulationBonus * 100),
                            })}
                          </div>
                        )}
                        {fromBuildings > 0 && (
                          <div className="text-gray-400/70">
                            {t("village.fromBuildings", {
                              percent: Math.round(fromBuildings * 100),
                            })}
                          </div>
                        )}
                        {fromBlessings > 0 && (
                          <div className="text-gray-400/70">
                            {t("village.fromBlessings", {
                              percent: Math.round(fromBlessings * 100),
                            })}
                          </div>
                        )}
                        {fromEvents > 0 && (
                          <div className="text-gray-400/70">
                            {t("village.fromEvents", {
                              percent: Math.round(fromEvents * 100),
                            })}
                          </div>
                        )}
                        {fromHeartfire > 0 && (
                          <div className="text-gray-400/70">
                            {t("village.fromHeartfire", {
                              percent: Math.round(fromHeartfire * 100),
                            })}
                          </div>
                        )}
                        <div className="border-t border-gray-600 my-1" />
                        <div className="text-gray-400/70">
                          {t("village.cycleDescription")}
                        </div>
                      </div>
                    );
                  })()}
                  tooltipId="production-cycle-progress"
                  disabled
                  tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                  className={pulseClassName(
                    "production-cycle-progress",
                    PRODUCE_HEADER_INDICATOR_CLASS,
                  )}
                  onMouseEnter={() => onMouseEnter("production-cycle-progress")}
                  onMouseLeave={() => onMouseLeave("production-cycle-progress")}
                >
                  <div className="relative inline-flex items-center">
                    <CircularProgress
                      value={loopProgress}
                      size={18}
                      strokeWidth={2}
                      className="text-gray-400"
                    />
                    <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[10px] -mt-[1px] text-gray-400">
                      ↦
                    </span>
                  </div>
                </TooltipWrapper>
                {/* Feast Timer and other production effects */}
                {(() => {
                  const feastState = useGameStore.getState().feastState;
                  const greatFeastState =
                    useGameStore.getState().greatFeastState;
                  const solsticeState = useGameStore.getState().solsticeState;
                  const curseState = useGameStore.getState().curseState;
                  const disgustState = useGameStore.getState().disgustState;
                  const miningBoostState =
                    useGameStore.getState().miningBoostState;
                  const frostfallState = useGameStore.getState().frostfallState; // Assume frostfallState exists
                  const isGreatFeast =
                    greatFeastState?.isActive &&
                    greatFeastState.endTime > Date.now();
                  const isFeast =
                    feastState?.isActive && feastState.endTime > Date.now();
                  const isCursed =
                    curseState?.isActive && curseState.endTime > Date.now();
                  const isDisgusted =
                    disgustState?.isActive && disgustState.endTime > Date.now();
                  const isMiningBoosted =
                    miningBoostState?.isActive &&
                    miningBoostState.endTime > Date.now();
                  const isFrostfall =
                    frostfallState?.isActive &&
                    frostfallState.endTime > Date.now();
                  const isSolstice =
                    solsticeState?.isActive &&
                    solsticeState.endTime > Date.now();

                  return (
                    <>
                      {/* Feast/Great Feast Indicator */}
                      {(isGreatFeast || isFeast) && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs">
                              {feastTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="feast-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "feast-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("feast-progress")}
                          onMouseLeave={() => onMouseLeave("feast-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={feastProgress}
                              size={18}
                              strokeWidth={2}
                              className={
                                isGreatFeast
                                  ? "text-orange-600"
                                  : "text-yellow-600"
                              }
                            />
                            <span
                              className={`font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold ${isGreatFeast ? "text-[12px] -mt-[0px] text-orange-600" : "text-[12px] mt-[2px] text-yellow-600"}`}
                            >
                              {isGreatFeast ? "✦" : "⟡"}
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Solstice Gathering Indicator */}
                      {isSolstice && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs">
                              {solsticeTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="solstice-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "solstice-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("solstice-progress")}
                          onMouseLeave={() => onMouseLeave("solstice-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={solsticeProgress}
                              size={18}
                              strokeWidth={2}
                              className="text-orange-500"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[10px] mt-[3px] text-orange-500">
                              ☼
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Curse Indicator */}
                      {isCursed && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs whitespace-pre-line">
                              {curseTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="curse-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "curse-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("curse-progress")}
                          onMouseLeave={() => onMouseLeave("curse-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const timeRemaining = Math.max(
                                  0,
                                  curseState.endTime - Date.now(),
                                );
                                const totalDuration = curseLikeDurationMs(
                                  cruelModeScale(state),
                                );
                                const elapsed = totalDuration - timeRemaining;
                                return Math.min(
                                  100,
                                  (elapsed / totalDuration) * 100,
                                );
                              })()}
                              size={18}
                              strokeWidth={2}
                              className="text-purple-600"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[0px] text-purple-600">
                              ✶
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Disgust Indicator */}
                      {isDisgusted && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs whitespace-pre-line">
                              {disgustTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="disgust-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "disgust-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("disgust-progress")}
                          onMouseLeave={() => onMouseLeave("disgust-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const timeRemaining = Math.max(
                                  0,
                                  disgustState.endTime - Date.now(),
                                );
                                const totalDuration =
                                  disgustDurationMs(state.cruelMode);
                                const elapsed = totalDuration - timeRemaining;
                                return Math.min(
                                  100,
                                  (elapsed / totalDuration) * 100,
                                );
                              })()}
                              size={18}
                              strokeWidth={2}
                              className="text-green-800"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-normal text-[12px] mt-[4px] text-green-800">
                              ❢
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Mining Boost Indicator */}
                      {isMiningBoosted && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs whitespace-pre-line">
                              {miningBoostTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="mining-boost-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "mining-boost-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() =>
                            onMouseEnter("mining-boost-progress")
                          }
                          onMouseLeave={() =>
                            onMouseLeave("mining-boost-progress")
                          }
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const boostDuration = 30 * 60 * 1000;
                                const boostElapsed =
                                  boostDuration -
                                  (miningBoostState.endTime - Date.now());
                                return (boostElapsed / boostDuration) * 100;
                              })()}
                              size={18}
                              strokeWidth={2}
                              className="text-amber-600"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[7px] -mt-[0px] text-amber-600">
                              ⛰
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Heartfire Indicator */}
                      {state.heartfireState?.level > 0 && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs">
                              {heartfireTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="heartfire-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "heartfire-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("heartfire-progress")}
                          onMouseLeave={() => onMouseLeave("heartfire-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const now = Date.now();
                                const lastDecrease =
                                  state.heartfireState.lastLevelDecrease || 0;
                                const elapsed = now - lastDecrease;
                                return Math.min(100, (elapsed / 90000) * 100);
                              })()}
                              size={18}
                              strokeWidth={2}
                              className="text-red-700"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-red-700">
                              {getHeartfireSymbol(state.heartfireState.level)}
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Frostfall Indicator */}
                      {isFrostfall && (
                        <TooltipWrapper
                          tooltip={
                            <div className="text-xs">
                              {frostfallTooltip.getContent(state)}
                            </div>
                          }
                          tooltipId="frostfall-progress"
                          disabled
                          tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                          className={pulseClassName(
                            "frostfall-progress",
                            PRODUCE_HEADER_INDICATOR_CLASS,
                          )}
                          onMouseEnter={() => onMouseEnter("frostfall-progress")}
                          onMouseLeave={() => onMouseLeave("frostfall-progress")}
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const frostfallDuration = curseLikeDurationMs(
                                  cruelModeScale(state),
                                );
                                const timeRemaining = Math.max(
                                  0,
                                  frostfallState.endTime - Date.now(),
                                );
                                const elapsed =
                                  frostfallDuration - timeRemaining;
                                return Math.min(
                                  100,
                                  (elapsed / frostfallDuration) * 100,
                                );
                              })()}
                              size={18}
                              strokeWidth={2}
                              className="text-blue-600"
                            />
                            <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[12px] mt-[2px] text-blue-600">
                              ✼
                            </span>
                          </div>
                        </TooltipWrapper>
                      )}

                      {/* Fog Indicator */}
                      {(() => {
                        const fogState = useGameStore.getState().fogState;
                        const isFog =
                          fogState?.isActive && fogState.endTime > Date.now();

                        if (!isFog) return null;

                        return (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs">
                                {fogTooltip.getContent(state)}
                              </div>
                            }
                            tooltipId="fog-progress"
                            disabled
                            tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                            className={pulseClassName(
                              "fog-progress",
                              PRODUCE_HEADER_INDICATOR_CLASS,
                            )}
                            onMouseEnter={() => onMouseEnter("fog-progress")}
                            onMouseLeave={() => onMouseLeave("fog-progress")}
                          >
                            <div className="relative inline-flex items-center gap-1 mt-[0px]">
                              <CircularProgress
                                value={(() => {
                                  const fogDuration = riddleFogDurationMs(
                                    cruelModeScale(state),
                                  );
                                  const timeRemaining = Math.max(
                                    0,
                                    fogState.endTime - Date.now(),
                                  );
                                  const elapsed = fogDuration - timeRemaining;
                                  return Math.min(
                                    100,
                                    (elapsed / fogDuration) * 100,
                                  );
                                })()}
                                size={18}
                                strokeWidth={2}
                                className="text-gray-500"
                              />
                              <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[12px] leading-none mt-[1px] text-gray-500">
                                ≋
                              </span>
                            </div>
                          </TooltipWrapper>
                        );
                      })()}

                      {/* Madness Production Effect Indicator */}
                      {(() => {
                        const totalMadness = getTotalMadness(state);
                        if (totalMadness < 10) return null;
                        return (
                          <TooltipWrapper
                            tooltip={
                              <div className="text-xs">
                                {madnessProductionTooltip.getContent(state)}
                              </div>
                            }
                            tooltipId="madness-production"
                            disabled
                            tooltipTriggerClassName={PRODUCE_HEADER_INDICATOR_TRIGGER_CLASS}
                            className={pulseClassName(
                              "madness-production",
                              PRODUCE_HEADER_INDICATOR_CLASS,
                            )}
                            onMouseEnter={() =>
                              onMouseEnter("madness-production")
                            }
                            onMouseLeave={() =>
                              onMouseLeave("madness-production")
                            }
                          >
                            <div className="relative inline-flex items-center gap-1 mt-[0px]">
                              <CircularProgress
                                value={100}
                                size={18}
                                strokeWidth={2}
                                className="text-violet-600"
                              />
                              <span className="font-noto-symbols-2 absolute inset-0 flex items-center justify-center font-extrabold text-[12px] leading-none mt-[2px] text-violet-600">
                                ✺
                              </span>
                            </div>
                          </TooltipWrapper>
                        );
                      })()}
                    </>
                  );
                })()}
                {arePresetsVisible(state) &&
                  getPurchasedPresetCount(state) >= 1 &&
                  (() => {
                    const purchasedCount = getPurchasedPresetCount(state);
                    return (
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        {Array.from({ length: purchasedCount }).map((_, i) => {
                          const slot = i + 1;
                          const isActive = activePresetSlot === slot;
                          const hasPreset = !!getPresetSlot(state, i);
                          const tooltipText = hasPreset
                            ? t("village.presetApply", { slot })
                            : t("village.presetEmpty", { slot });
                          const presetTooltipId = `preset-slot-${slot}`;
                          return (
                            <TooltipWrapper
                              key={`preset-slot-${slot}`}
                              tooltipId={presetTooltipId}
                              tooltip={
                                <div className="text-xs">{tooltipText}</div>
                              }
                              tooltipTriggerClassName="inline-flex items-center leading-none"
                              className={pulseClassName(
                                presetTooltipId,
                                "group flex items-center cursor-pointer",
                              )}
                              onMouseEnter={() => onMouseEnter(presetTooltipId)}
                              onMouseLeave={() => onMouseLeave(presetTooltipId)}
                              onClick={() => applyVillagerJobPreset(slot)}
                            >
                              <Button
                                size="xs"
                                variant={isActive ? "default" : "outline"}
                                data-testid={`preset-slot-${slot}`}
                                button_id={`preset-slot-${slot}`}
                                className={cn(
                                  "h-[18px] w-[18px] min-h-0 shrink-0 p-0 text-[10px] tabular-nums leading-none pointer-events-none transition-colors appearance-none [-webkit-appearance:none]",
                                  isActive
                                    ? "group-hover:bg-primary/90"
                                    : gameActionOutlineButtonClassName(false, {
                                      groupHover: true,
                                    }),
                                )}
                                style={{ touchAction: "manipulation" }}
                              >
                                {slot}
                              </Button>
                            </TooltipWrapper>
                          );
                        })}
                        {purchasedCount >= 1 && (
                          <TooltipWrapper
                            tooltipId="preset-save"
                            tooltip={
                              <div className="text-xs">
                                {t("village.presetSave", {
                                  slot: activePresetSlot,
                                })}
                              </div>
                            }
                            tooltipTriggerClassName="inline-flex items-center leading-none"
                            className={pulseClassName(
                              "preset-save",
                              "group flex items-center cursor-pointer",
                            )}
                            onMouseEnter={() => onMouseEnter("preset-save")}
                            onMouseLeave={() => onMouseLeave("preset-save")}
                            onClick={handlePresetSave}
                          >
                            <Button
                              size="xs"
                              variant="outline"
                              data-testid="preset-save"
                              button_id="preset-save"
                              className={cn(
                                "h-[18px] w-[18px] min-h-0 shrink-0 p-0 pointer-events-none inline-flex items-center justify-center leading-none transition-colors appearance-none [-webkit-appearance:none]",
                                gameActionOutlineButtonClassName(false, {
                                  groupHover: true,
                                }),
                              )}
                              style={{ touchAction: "manipulation" }}
                            >
                              <span
                                className={
                                  presetSaveConfirmed
                                    ? "inline-flex items-center justify-center text-[11px] leading-none text-green-500"
                                    : "inline-flex items-center justify-center font-noto-symbols-2 text-[12px] leading-none translate-y-0.5"
                                }
                              >
                                {presetSaveConfirmed ? "✓" : "🖫"}
                              </span>
                            </Button>
                          </TooltipWrapper>
                        )}
                      </div>
                    );
                  })()}
              </div>
              <div className="space-y-1 leading-tight">
                {visiblePopulationJobs.map((job) =>
                  renderPopulationControl(
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
