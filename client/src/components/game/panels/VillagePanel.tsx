import React from 'react';
import { useGameStore } from "@/game/state";
import {
  gameActions,
  shouldShowAction,
  canExecuteAction,
  getActionCostBreakdown,
} from "@/game/rules";
import { feastTooltip, curseTooltip } from "@/game/rules/tooltips";
import CooldownButton from "@/components/CooldownButton";
import { Button } from "@/components/ui/button";
import { getPopulationProduction } from "@/game/population";
import { CircularProgress } from "@/components/ui/circular-progress";
import { capitalizeWords } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";

export default function VillagePanel() {
  const {
    villagers,
    buildings,
    story,
    executeAction,
    assignVillager,
    unassignVillager,
  } = useGameStore();
  const state = useGameStore.getState();
  const mobileTooltip = useMobileTooltip();

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
        const feastDuration = 10 * 60 * 1000; // 10 minutes
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
        { id: "buildWoodenHut", label: "Wooden Hut" },
        { id: "buildStoneHut", label: "Stone Hut" },
        { id: "buildLonghouse", label: "Longhouse" },
        { id: "buildCabin", label: "Cabin" },
        { id: "buildBlacksmith", label: "Blacksmith" },
        { id: "buildShallowPit", label: "Shallow Pit" },
        { id: "buildDeepeningPit", label: "Deepening Pit" },
        { id: "buildDeepPit", label: "Deep Pit" },
        { id: "buildBottomlessPit", label: "Bottomless Pit" },
        { id: "buildFoundry", label: "Foundry" },
        { id: "buildPrimeFoundry", label: "Prime Foundry" },
        { id: "buildAltar", label: "Altar" },
        { id: "buildShrine", label: "Shrine" },
        { id: "buildTemple", label: "Temple" },
        { id: "buildSanctum", label: "Sanctum" },
        { id: "buildBlackMonolith", label: "Black Monolith" },
        { id: "buildAlchemistHall", label: "Alchemist's Hall" },
        { id: "buildTradePost", label: "Trade Post" },
        { id: "buildGrandBazaar", label: "Grand Bazaar" },
        { id: "buildMerchantsGuild", label: "Merchants Guild" },
        { id: "buildWizardTower", label: "Wizard Tower" },
        { id: "buildGrandBlacksmith", label: "Grand Blacksmith" },
        { id: "buildTraps", label: "Traps" },
        { id: "buildBastion", label: "Bastion" },
        { id: "buildWatchtower", label: "Watchtower" },
        { id: "buildPalisades", label: "Palisades" },
        { id: "buildFortifiedMoat", label: "Fortified Moat" },
        { id: "buildGreatCabin", label: "Great Cabin" },
        { id: "buildTimberMill", label: "Timber Mill" },
        { id: "buildQuarry", label: "Quarry" },
        { id: "buildClerksHut", label: "Clerk's Hut" },
        { id: "buildScriptorium", label: "Scriptorium" },
        { id: "buildTannery", label: "Tannery" },
        { id: "buildMasterTannery", label: "Master Tannery" },
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
      id: "sulfur_miner",
      label: "Sulfur Miner",
      showWhen: () => buildings.deepeningPit >= 1,
    },
    // {
    //   id: "silver_miner",
    //   label: "Silver Miner",
    //   showWhen: () => buildings.deepeningPit >= 1,
    // },
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

  const renderButton = (actionId: string, label: string) => {
    const action = gameActions[actionId];
    if (!action) return null;

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
            className={`${
              cost.satisfied ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {cost.text}
          </div>
        ))}
      </div>
    );

    return (
      <CooldownButton
        key={actionId}
        onClick={() => executeAction(actionId)}
        cooldownMs={action.cooldown * 1000}
        data-testid={`button-${actionId.replace(/([A-Z])/g, "-$1").toLowerCase()}`}
        disabled={!canExecute}
        size="xs"
        variant="outline"
        className="hover:bg-transparent hover:text-foreground"
        tooltip={tooltipContent}
      >
        {displayLabel}
      </CooldownButton>
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
              currentCount > 0 && startHold(() => unassignVillager(jobId), false)
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
          >
            -
          </Button>
          <div className="w-5 flex items-center justify-center">
            <AnimatedCounter value={currentCount} />
          </div>
          <Button
            onMouseDown={() =>
              villagers.free > 0 && startHold(() => assignVillager(jobId), false)
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

  const gameState = useGameStore.getState(); // Get current game state

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 pb-4">
        {actionGroups.map((group, groupIndex) => {
          const visibleActions = group.actions.filter((action) =>
            shouldShowAction(action.id, state),
          );

          if (visibleActions.length === 0) return null;

          return (
            <div key={groupIndex} className="space-y-2">
              {group.title && (
                <h3 className="text-xs font-semibold text-foreground ">
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
              <h3 className="text-xs font-bold text-foreground">Rule</h3>
              {/* Feast Timer */}
              {(() => {
                const feastState = useGameStore.getState().feastState;
                const greatFeastState = useGameStore.getState().greatFeastState;
                const curseState = useGameStore.getState().curseState;
                const isGreatFeast =
                  greatFeastState?.isActive &&
                  greatFeastState.endTime > Date.now();
                const isFeast =
                  feastState?.isActive && feastState.endTime > Date.now();
                const isCursed =
                  curseState?.isActive && curseState.endTime > Date.now();

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
                                    const curseDuration = 10 * 60 * 1000;
                                    const curseElapsed =
                                      curseDuration -
                                      (curseState.endTime - Date.now());
                                    return (curseElapsed / curseDuration) * 100;
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
              const totalEffects: Record<string, number> = {};

              // Calculate total population for base consumption
              const totalPopulation = Object.values(villagers).reduce(
                (sum, count) => sum + (count || 0),
                0,
              );

              // Add base consumption for all villagers (1 wood and 1 food per villager)
              if (totalPopulation > 0) {
                totalEffects.wood = (totalEffects.wood || 0) - totalPopulation;
                totalEffects.food = (totalEffects.food || 0) - totalPopulation;
              }

              visiblePopulationJobs.forEach((job) => {
                const currentCount =
                  villagers[job.id as keyof typeof villagers] || 0;
                if (currentCount > 0) {
                  const production = getPopulationProduction(
                    job.id,
                    currentCount,
                    state,
                  );
                  production.forEach((prod) => {
                    totalEffects[prod.resource] =
                      (totalEffects[prod.resource] || 0) + prod.totalAmount;
                  });
                }
              });

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
  );
}