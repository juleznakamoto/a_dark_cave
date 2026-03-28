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
} from "@/game/rules/tooltips";
import {
  getTotalMadness,
  getStrangerApproachProbability,
} from "@/game/rules/effectsCalculation";
import CooldownButton from "@/components/CooldownButton";
import { Button } from "@/components/ui/button";
import { getPopulationProduction } from "@/game/population";
import { CircularProgress } from "@/components/ui/circular-progress";
import { capitalizeWords, formatNumber } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
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
} from "@/game/cruelMode";
import { isBuildingUpgrade } from "@/game/buildingHierarchy";
import cn from "clsx";

export default function VillagePanel() {
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
  } = useGameStore();
  const state = useGameStore.getState();

  // Particle effect state
  const feedFireButtonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();

  // Bubbly button animation state
  const [bubbles, setBubbles] = useState<BubbleWithParticles[]>([]);
  const bubbleIdCounter = useRef(0);

  const handleAnimationTrigger = (x: number, y: number) => {
    // Use a counter to ensure unique IDs even for rapid clicks
    const id = `bubble-${bubbleIdCounter.current++}-${Date.now()}`;
    // Generate particle data once when bubble is created (prevents random regeneration)
    const particles = generateParticleData();
    setBubbles((prev) => [...prev, { id, x, y, particles }]);

    // Keep bubbles visible for animation duration
    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 3000); // Match the 3-second duration used in button-test
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
        const greatFeastDuration = 30 * 60 * 1000; // 30 minutes
        const greatFeastElapsed =
          greatFeastDuration - (greatFeastState.endTime - now);
        setFeastProgress((greatFeastElapsed / greatFeastDuration) * 100);
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
      ],
    },
    {
      title: "Build",
      actions: [
        { id: "buildHeartfire", label: "Heartfire" },
        { id: "buildWoodenHut", label: "Wooden Hut" },
        { id: "buildStoneHut", label: "Stone Hut" },
        { id: "buildLonghouse", label: "Longhouse" },
        { id: "buildFurTents", label: "Fur Tent" },
        { id: "buildCabin", label: "Cabin" },
        { id: "buildGreatCabin", label: "Great Cabin" },
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
        { id: "buildBoneTemple", label: "Bone Temple" },
        { id: "buildPaleCross", label: "Pale Cross" },
        { id: "buildTimberMill", label: "Timber Mill" },
        { id: "buildQuarry", label: "Quarry" },
        { id: "buildClerksHut", label: "Clerk's Hut" },
        { id: "buildScriptorium", label: "Scriptorium" },
        { id: "buildInkwardenAcademy", label: "Inkwarden Academy" },
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
        { id: "buildPillarOfClarity", label: "Pillar of Clarity" },
        { id: "buildTraps", label: "Traps" },
        { id: "buildImprovedTraps", label: "Improved Traps" },
        { id: "buildBastion", label: "Bastion" },
        { id: "buildWatchtower", label: "Watchtower" },
        { id: "buildPalisades", label: "Palisades" },
        { id: "buildFortifiedMoat", label: "Fortified Moat" },
        { id: "buildChitinPlating", label: "Chitin Plating" },
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
        marginTop: "-1px",
        textSize: "text-[14px]",
        fontWeight: 800,
      },
      2: {
        symbol: ":",
        marginTop: "-2px",
        textSize: "text-[12px]",
        fontWeight: 800,
      },
      3: {
        symbol: "∴",
        marginTop: "-2px",
        textSize: "text-[12px]",
        fontWeight: 900,
      },
      4: {
        symbol: "⁘",
        marginTop: "-4px",
        textSize: "text-[16px]",
        fontWeight: 700,
      },
      5: {
        symbol: "⁙",
        marginTop: "-4px",
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
    if (!action && actionId !== "feedFire" && actionId !== "callMerchant")
      return null;

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
        <div className="text-xs">
          Merchant cannot be called while another event is active
        </div>
      ) : isOnCooldown ? (
        <div className="text-xs whitespace-nowrap">
          Available in {formatRemaining(remainingMs)}
        </div>
      ) : (
        <div className="text-xs whitespace-nowrap">
          <div
            className={canAfford ? "text-foreground" : "text-muted-foreground"}
          >
            -{formatNumber(price)} Gold
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
          className="hover:bg-background hover:text-foreground"
          tooltip={tooltipContent}
          style={{ pointerEvents: "auto" }}
        >
          <span className="flex items-center gap-1">{label}</span>
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
              -{formatNumber(woodCost)} Wood
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
          className="hover:bg-background hover:text-foreground"
          tooltip={tooltipContent}
          style={{ pointerEvents: "auto" }}
        >
          <span className="flex items-center gap-1">{label}</span>
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
    let displayLabel = label;
    if (actionId === "buildWatchtower") {
      const watchtowerLevel = buildings.watchtower || 0;
      const watchtowerLabels = [
        "Watchtower",
        "Guard Tower",
        "Fortified Tower",
        "Cannon Tower",
      ];
      displayLabel = watchtowerLabels[watchtowerLevel] || "Watchtower";
    }

    // Dynamic label for palisades based on current level
    if (actionId === "buildPalisades") {
      const palisadesLevel = buildings.palisades || 0;
      const palisadesLabels = [
        "Wooden Palisades",
        "Fortified Palisades",
        "Stone Wall",
        "Reinforced Wall",
      ];
      displayLabel = palisadesLabels[palisadesLevel] || "Wooden Palisades";
    }

    const buildingHint = state.books?.book_of_craftsmanship
      ? action.description
      : undefined;
    const buildingKey = actionId.startsWith("build")
      ? actionId.slice(5, 6).toLowerCase() + actionId.slice(6)
      : null;
    const isUpgrade = buildingKey ? isBuildingUpgrade(buildingKey) : false;
    const tooltipContent = (
      <div
        className="text-xs flex items-start gap-2"
        style={buildingHint ? { width: "12rem" } : undefined}
      >
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
          {buildingHint && (
            <div className="border-t border-border my-1 pt-1 text-muted-foreground whitespace-normal">
              {buildingHint}
            </div>
          )}
        </div>
        {isUpgrade && (
          <span className="text-green-700 leading-none shrink-0">↑</span>
        )}
      </div>
    );

    return (
      <CooldownButton
        key={actionId}
        onClick={() => executeAction(actionId)}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        button_id={actionId}
        disabled={!canExecute}
        size="xs"
        variant="outline"
        className="hover:bg-background hover:text-foreground"
        tooltip={tooltipContent}
        onAnimationTrigger={handleAnimationTrigger}
        onMouseEnter={() => {
          // Only highlight resources if Inkwarden Academy is built
          if (buildings.inkwardenAcademy > 0) {
            setHighlightedResources(
              getResourcesFromActionCost(actionId, state),
            );
          }
        }}
        onMouseLeave={() => {
          if (buildings.inkwardenAcademy > 0) {
            setHighlightedResources([]);
          }
        }}
        style={{ pointerEvents: "auto" }}
      >
        {displayLabel}
      </CooldownButton>
    );
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

    // Get total production for this job type
    const getTotalProductionText = (jobId: string, count: number): string => {
      if (count === 0) return "";

      const production = getPopulationProduction(jobId, count, state);
      const productionText = production
        .map(
          (prod) =>
            `${prod.totalAmount > 0 ? "+" : ""}${prod.totalAmount} ${capitalizeWords(prod.resource)}`,
        )
        .join(", ");

      return productionText ? ` ${productionText}` : "";
    };

    return (
      <div key={jobId} className="flex items-center justify-between">
        <div className="flex items-center gap-1">
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
            className="h-5 w-5 flex items-center justify-center no-hover text-lg text-center"
            style={{ touchAction: "manipulation" }}
            button_id={`unassign-${jobId}`}
          >
            -
          </Button>
          <div className="w-5 flex items-center justify-center">
            <AnimatedCounter value={currentCount} />
          </div>
          <Button
            onMouseDown={() =>
              villagers.free > 0 &&
              startHold(() => assignVillager(jobId), false)
            }
            onMouseUp={() => stopHold(false)}
            onMouseLeave={() => stopHold(false)}
            onTouchStart={(e) => {
              if (villagers.free > 0) {
                e.preventDefault(); // Prevent ghost click - synthetic mouse events cause unwanted actions
                startHold(() => assignVillager(jobId), true);
              }
            }}
            onTouchEnd={(e) => {
              if (e.cancelable) e.preventDefault();
              stopHold(true);
            }}
            onTouchCancel={() => stopHold(true)}
            disabled={villagers.free === 0}
            variant="ghost"
            size="xs"
            className="h-5 w-5 flex items-center justify-center no-hover text-lg text-center"
            style={{ touchAction: "manipulation" }}
            button_id={`assign-${jobId}`}
          >
            +
          </Button>
        </div>
        <span className="text-xs ml-1 text-left flex-1">
          {label}{" "}
          <span className="text-xs text-muted-foreground">
            {getTotalProductionText(jobId, currentCount)}
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
        <div className="space-y-4 mt-2 mb-2 pl-[3px] pr-[3px]">
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
                {group.title && (
                  <h3 className="text-xs font-medium text-foreground ">
                    {group.title}
                  </h3>
                )}
                <div
                  className={cn(
                    "flex flex-wrap gap-2",
                    group.title === "Build" && "max-w-full md:max-w-96",
                  )}
                >
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
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-medium text-foreground">Produce</h3>
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
                        <div className="font-semibold">Cycle</div>
                        <div>
                          Next cycle in {productionSecondsRemaining} seconds
                        </div>
                        <div className="border-t border-gray-600 my-1" />
                        <div>New Villager Chance: {chancePct}%</div>
                        {lowPopulationBonus > 0 && (
                          <div className="text-gray-400/70">
                            {Math.round(lowPopulationBonus * 100)} % low
                            population bonus
                          </div>
                        )}
                        {fromBuildings > 0 && (
                          <div className="text-gray-400/70">
                            {Math.round(fromBuildings * 100)} % from buildings
                          </div>
                        )}
                        {fromBlessings > 0 && (
                          <div className="text-gray-400/70">
                            {Math.round(fromBlessings * 100)} % from Blessings
                          </div>
                        )}
                        {fromEvents > 0 && (
                          <div className="text-gray-400/70">
                            {Math.round(fromEvents * 100)} % from Events
                          </div>
                        )}
                        {fromHeartfire > 0 && (
                          <div className="text-gray-400/70">
                            {Math.round(fromHeartfire * 100)} % from Heartfire
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  tooltipId="production-cycle-progress"
                  disabled
                  className="text-xs flex items-center cursor-pointer"
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
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
                              className={`absolute inset-0 flex items-center justify-center font-extrabold ${isGreatFeast ? "text-[12px] -mt-[0px] text-orange-600" : "text-[12px] -mt-[1px] text-yellow-600"}`}
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={solsticeProgress}
                              size={18}
                              strokeWidth={2}
                              className="text-orange-500"
                            />
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[10px] -mt-[0px] text-orange-500">
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
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
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[0px] text-purple-600">
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                        >
                          <div className="relative inline-flex items-center gap-1 mt-[0px]">
                            <CircularProgress
                              value={(() => {
                                const timeRemaining = Math.max(
                                  0,
                                  disgustState.endTime - Date.now(),
                                );
                                const totalDuration = disgustDurationMs(
                                  state.cruelMode,
                                );
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
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[0px] text-green-800">
                              ⥉
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
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
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[7px] -mt-[0px] text-amber-600">
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
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
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-red-700">
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
                          className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
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
                            <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[0px] text-blue-600">
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
                            className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                          >
                            <div className="relative inline-flex items-center gap-1 mt-[0px]">
                              <CircularProgress
                                value={(() => {
                                  const fogDuration =
                                    fogState.duration || 5 * 60 * 1000;
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
                              <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[1px] text-gray-500">
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
                            className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                          >
                            <div className="relative inline-flex items-center gap-1 mt-[0px]">
                              <CircularProgress
                                value={100}
                                size={18}
                                strokeWidth={2}
                                className="text-violet-600"
                              />
                              <span className="absolute inset-0 flex items-center justify-center font-normal text-[12px] -mt-[0px] text-violet-600">
                                ✺
                              </span>
                            </div>
                          </TooltipWrapper>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>
              <div className="space-y-1 leading-tight">
                {visiblePopulationJobs.map((job) =>
                  renderPopulationControl(job.id, job.label),
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
