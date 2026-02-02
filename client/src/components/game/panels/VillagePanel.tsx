import React from "react";
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
  getResourcesFromActionCost,
} from "@/game/rules";
import { getResourcesFromActionCost as getResourcesFromActionCostImport } from "@/game/rules";
import {
  feastTooltip,
  curseTooltip,
  miningBoostTooltip,
  frostfallTooltip,
  fogTooltip,
  disgustTooltip,
} from "@/game/rules/tooltips";
import CooldownButton from "@/components/CooldownButton";
import { Button } from "@/components/ui/button";
import {
  getPopulationProduction,
  getTotalPopulationEffects,
} from "@/game/population";
import { CircularProgress } from "@/components/ui/circular-progress";
import { capitalizeWords } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import {
  SuccessParticles,
  useFeedFireParticles,
} from "@/components/ui/feed-fire-particles";
import { audioManager } from "@/lib/audio";
import { BubblyButton, BubblyButtonGlobalPortal } from "@/components/ui/bubbly-button";
import NonUpgradeableBuildButton from "@/components/ui/non-upgradeable-build-button";

export default function VillagePanel() {
  const {
    villagers,
    buildings,
    story,
    executeAction,
    assignVillager,
    unassignVillager,
    setHighlightedResources,
  } = useGameStore();
  const state = useGameStore.getState();
  const mobileTooltip = useMobileTooltip();

  // Particle effect state
  const feedFireButtonRef = useRef<HTMLButtonElement>(null);
  const { sparks, spawnParticles } = useFeedFireParticles();

  // Bubbly button animation state
  const [bubbles, setBubbles] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const handleAnimationTrigger = (x: number, y: number) => {
    const id = `bubble-${Date.now()}`;
    setBubbles(prev => [...prev, { id, x, y }]);

    // Keep bubbles visible for animation duration
    setTimeout(() => {
      setBubbles(prev => prev.filter(b => b.id !== id));
    }, 3000); // Match the 3-second duration used in button-test
  };

  // Get progress from game loop state
  const loopProgress = useGameStore((state) => state.loopProgress);
  const feastState = useGameStore((state) => state.feastState);
  const greatFeastState = useGameStore((state) => state.greatFeastState);

  // Calculate feast progress based on game loop timing
  const [feastProgress, setFeastProgress] = React.useState(0);

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

  // Define action groups with their actions
  const actionGroups = [
    {
      title: "Build",
      actions: [
        { id: "buildHeartfire", label: "Heartfire" },
        { id: "buildWoodenHut", label: "Wooden Hut" },
        { id: "buildStoneHut", label: "Stone Hut" },
        { id: "buildLonghouse", label: "Longhouse" },
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
    if (!action && actionId !== "feedFire") return null;

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
              {woodCost} Wood
            </div>
          </div>
        ) : undefined;

      return (
        <CooldownButton
          key={actionId}
          ref={feedFireButtonRef}
          onClick={() => {
            executeAction(actionId);
            audioManager.playSound("feedFire");
            // Generate 10 * current heartfire level particles
            const particleCount = 10 * (currentLevel + 1);
            if (particleCount > 0) {
              spawnParticles(particleCount, feedFireButtonRef);
            }
          }}
          cooldownMs={30000}
          actionId="feedFire"
          button_id={actionId}
          disabled={!canExecute || (state.cooldowns[actionId] || 0) > 0}
          size="xs"
          variant="outline"
          className="hover:bg-transparent hover:text-foreground"
          tooltip={tooltipContent}
        >
          <span className="flex items-center gap-1">{label}</span>
        </CooldownButton>
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

    const tooltipContent = (
      <div className="text-xs whitespace-nowrap">
        {costBreakdown.map((cost, index) => (
          <div
            key={index}
            className={`${cost.satisfied ? "text-foreground" : "text-muted-foreground"
              }`}
          >
            {cost.text}
          </div>
        ))}
      </div>
    );

    return (
      <NonUpgradeableBuildButton
        key={actionId}
        actionId={actionId}
        label={displayLabel}
        onExecute={() => executeAction(actionId)}
        disabled={!canExecute}
        tooltipContent={costBreakdown}
        onAnimationTrigger={handleAnimationTrigger}
      />
    );
  };

  // Hold-to-repeat state management (moved outside to avoid conditional hooks)
  const [holdState, setHoldState] = useState<{
    interval: NodeJS.Timeout | null;
    timeout: NodeJS.Timeout | null;
  }>({ interval: null, timeout: null });

  // Track if a touch event occurred to prevent duplicate mouse events
  const touchActiveRef = useState({ current: false })[0];

  const startHold = (action: () => void, isTouch: boolean = false) => {
    // If this is a mouse event but touch is active, skip it
    if (!isTouch && touchActiveRef.current) {
      return;
    }

    // Set touch active flag if this is a touch event
    if (isTouch) {
      touchActiveRef.current = true;
    }

    // Execute immediately
    action();

    // Wait 500ms before starting repeat
    const timeout = setTimeout(() => {
      // Then repeat every 100ms
      const interval = setInterval(action, 100);
      setHoldState((prev) => ({ ...prev, interval }));
    }, 500);

    setHoldState((prev) => ({ ...prev, timeout }));
  };

  const stopHold = (isTouch: boolean = false) => {
    if (holdState.timeout) {
      clearTimeout(holdState.timeout);
    }
    if (holdState.interval) {
      clearInterval(holdState.interval);
    }
    setHoldState({ interval: null, timeout: null });

    // Reset touch flag after a delay to allow mouse event to be skipped
    if (isTouch) {
      setTimeout(() => {
        touchActiveRef.current = false;
      }, 100);
    }
  };

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
            onTouchStart={() =>
              currentCount > 0 && startHold(() => unassignVillager(jobId), true)
            }
            onTouchEnd={() => stopHold(true)}
            disabled={currentCount === 0}
            variant="ghost"
            size="xs"
            className="h-5 w-5 flex items-center justify-center no-hover text-lg text-center"
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
            onTouchStart={() =>
              villagers.free > 0 && startHold(() => assignVillager(jobId), true)
            }
            onTouchEnd={() => stopHold(true)}
            disabled={villagers.free === 0}
            variant="ghost"
            size="xs"
            className="h-5 w-5 flex items-center justify-center no-hover text-lg text-center"
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
      <ScrollArea className="h-full w-96">
        <div className="space-y-4 mt-2 mb-2 pl-[3px] ">
          {/* Special Top Level Button Group for Feed Fire */}
          {buildings.heartfire > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {renderButton("feedFire", "Feed Fire")}
              </div>
            </div>
          )}

          {actionGroups.map((group, groupIndex) => {
            const visibleActions = group.actions.filter((action) =>
              shouldShowAction(action.id, state),
            );

            if (visibleActions.length === 0) return null;

            return (
              <div key={groupIndex} className="space-y-2">
                {group.title && (
                  <h3 className="text-xs font-medium text-foreground ">
                    {group.title}
                  </h3>
                )}
                <div className="flex flex-wrap gap-2">
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
                <h3 className="text-xs font-medium text-foreground">Rule</h3>
                {/* Feast Timer */}
                {(() => {
                  const feastState = useGameStore.getState().feastState;
                  const greatFeastState =
                    useGameStore.getState().greatFeastState;
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

                  return (
                    <>
                      {/* Feast/Great Feast Indicator */}
                      {(isGreatFeast || isFeast) && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen("feast-progress")}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "feast-progress",
                                    e,
                                  )
                                }
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
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                {feastTooltip.getContent(state)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Curse Indicator */}
                      {isCursed && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen("curse-progress")}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "curse-progress",
                                    e,
                                  )
                                }
                              >
                                <div className="relative inline-flex items-center gap-1 mt-[0px]">
                                  <CircularProgress
                                    value={(() => {
                                      const timeRemaining = Math.max(
                                        0,
                                        curseState.endTime - Date.now(),
                                      );
                                      const totalDuration =
                                        (10 + 5 * state.CM) * 60 * 1000;
                                      const elapsed =
                                        totalDuration - timeRemaining;
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
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs whitespace-pre-line">
                                {curseTooltip.getContent(state)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Disgust Indicator */}
                      {isDisgusted && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen("disgust-progress")}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "disgust-progress",
                                    e,
                                  )
                                }
                              >
                                <div className="relative inline-flex items-center gap-1 mt-[0px]">
                                  <CircularProgress
                                    value={(() => {
                                      const timeRemaining = Math.max(
                                        0,
                                        disgustState.endTime - Date.now(),
                                      );
                                      const totalDuration = state.cruelMode ? 20 * 60 * 1000 : 10 * 60 * 1000;
                                      const elapsed =
                                        totalDuration - timeRemaining;
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
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs whitespace-pre-line">
                                {disgustTooltip.getContent(state)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Mining Boost Indicator */}
                      {isMiningBoosted && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen(
                              "mining-boost-progress",
                            )}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "mining-boost-progress",
                                    e,
                                  )
                                }
                              >
                                <div className="relative inline-flex items-center gap-1 mt-[0px]">
                                  <CircularProgress
                                    value={(() => {
                                      const boostDuration = 30 * 60 * 1000;
                                      const boostElapsed =
                                        boostDuration -
                                        (miningBoostState.endTime - Date.now());
                                      return (
                                        (boostElapsed / boostDuration) * 100
                                      );
                                    })()}
                                    size={18}
                                    strokeWidth={2}
                                    className="text-amber-600"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[7px] -mt-[0px] text-amber-600">
                                    ⛰
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs whitespace-pre-line">
                                {miningBoostTooltip.getContent(state)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Heartfire Indicator */}
                      {state.heartfireState?.level > 0 && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen(
                              "heartfire-progress",
                            )}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "heartfire-progress",
                                    e,
                                  )
                                }
                              >
                                <div className="relative inline-flex items-center gap-1 mt-[0px]">
                                  <CircularProgress
                                    value={(() => {
                                      const now = Date.now();
                                      const lastDecrease =
                                        state.heartfireState
                                          .lastLevelDecrease || 0;
                                      const elapsed = now - lastDecrease;
                                      return Math.min(
                                        100,
                                        (elapsed / 90000) * 100,
                                      );
                                    })()}
                                    size={18}
                                    strokeWidth={2}
                                    className="text-red-700"
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center font-extrabold text-red-700">
                                    {getHeartfireSymbol(
                                      state.heartfireState.level,
                                    )}
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                Heartfire: +{state.heartfireState.level * 5}%
                                Village Production
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Frostfall Indicator */}
                      {isFrostfall && (
                        <TooltipProvider>
                          <Tooltip
                            open={mobileTooltip.isTooltipOpen(
                              "frostfall-progress",
                            )}
                          >
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                onClick={(e) =>
                                  mobileTooltip.handleTooltipClick(
                                    "frostfall-progress",
                                    e,
                                  )
                                }
                              >
                                <div className="relative inline-flex items-center gap-1 mt-[0px]">
                                  <CircularProgress
                                    value={(() => {
                                      const frostfallDuration =
                                        (10 + 5 * state.CM) * 60 * 1000; // Same duration as curse, adjust if needed
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
                                    className="text-blue-600" // Blue color for frostfall
                                  />
                                  <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[12px] -mt-[0px] text-blue-600">
                                    ✼
                                  </span>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs">
                                {frostfallTooltip.getContent(state)}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {/* Fog Indicator */}
                      {(() => {
                        const fogState = useGameStore.getState().fogState;
                        const isFog =
                          fogState?.isActive && fogState.endTime > Date.now();

                        if (!isFog) return null;

                        return (
                          <TooltipProvider>
                            <Tooltip
                              open={mobileTooltip.isTooltipOpen("fog-progress")}
                            >
                              <TooltipTrigger asChild>
                                <div
                                  className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                                  onClick={(e) =>
                                    mobileTooltip.handleTooltipClick(
                                      "fog-progress",
                                      e,
                                    )
                                  }
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
                                        const elapsed =
                                          fogDuration - timeRemaining;
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
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  {fogTooltip.getContent(state)}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

              {/* Population Effects Summary */}
              {(() => {
                const visibleJobIds = visiblePopulationJobs.map(
                  (job) => job.id,
                );
                const totalEffects = getTotalPopulationEffects(
                  state,
                  visibleJobIds,
                );

                const effectsText = Object.entries(totalEffects)
                  .filter(([resource, amount]) => amount !== 0)
                  .sort(([, a], [, b]) => b - a) // Sort from positive to negative
                  .map(
                    ([resource, amount]) =>
                      `${amount > 0 ? "+" : ""}${amount} ${capitalizeWords(resource)}`,
                  )
                  .join(", ");

                return effectsText && buildings.clerksHut > 0 ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <CircularProgress
                      value={loopProgress} // Use loopProgress for production animation
                      size={16}
                      strokeWidth={2}
                      className="text-gray-400"
                    />
                    <span>{effectsText}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </>
  );
}
