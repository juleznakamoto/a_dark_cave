import React, { useRef } from "react";
import { useGameStore } from "@/game/state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cubeEvents } from "@/game/rules/eventsCube";
import { LogEntry } from "@/game/rules/events";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { Button } from "@/components/ui/button";
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import { getTotalPopulationEffects } from "@/game/population";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  CRUSHING_STRIKE_UPGRADES,
  BLOODFLAME_SPHERE_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
} from "@/game/rules/skillUpgrades";
import { focusTooltip } from "@/game/rules/tooltips";

export default function EstatePanel() {
  const {
    events,
    setEventDialog,
    setIdleModeDialog,
    sleepUpgrades,
    huntingSkills,
    combatSkills,
    fellowship,
    setHighlightedResources,
    resources,
    updateFocusState,
    updateResource,
  } = useGameStore();
  const mobileTooltip = useMobileButtonTooltip();
  const cubeTooltip = useMobileTooltip();
  const state = useGameStore.getState();

  // Calculate focus progress based on game loop timing
  const [focusProgress, setFocusProgress] = React.useState(0);
  const focusState = useGameStore((state) => state.focusState);

  React.useEffect(() => {
    const updateFocusProgress = () => {
      const now = Date.now();
      if (focusState?.isActive && focusState.endTime > now) {
        const focusDuration = focusState.duration || 60000; // Default to 1 minute if not set
        const focusElapsed = focusDuration - (focusState.endTime - now);
        setFocusProgress((focusElapsed / focusDuration) * 100);
      } else {
        setFocusProgress(0);
        // Clear focus state when timer expires
        if (focusState?.isActive && focusState.endTime <= now) {
          console.log('[FOCUS] Timer expired, clearing focus state');
          useGameStore.setState({
            focusState: {
              isActive: false,
              endTime: 0,
              duration: 0,
              points: 0,
            },
          });
        }
      }
    };

    updateFocusProgress();
    const interval = setInterval(updateFocusProgress, 1000);

    return () => clearInterval(interval);
  }, [focusState]);

  // Focus button - only show when there's focus to activate and not already active
  const showFocusButton = focusState?.points > 0 && !focusState?.isActive;

  // Calculate Focus duration: 1 focus point = 1 minute of Focus time
  const calculateFocusDuration = (focusPoints: number) => {
    return focusPoints * 60 * 1000; // Convert focus points to milliseconds (1 point = 1 minute)
  };

  React.useEffect(() => {
    console.log('[FOCUS] Button visibility check:', {
      hasFocus: focusState?.points > 0,
      focusAmount: focusState?.points,
      isActive: focusState?.isActive,
      shouldShow: focusState?.points > 0 && !focusState?.isActive,
      allResources: resources, // Log all resources to see if focus is being set
    });
  }, [focusState?.points, focusState?.isActive]);

  // Get all cube events that have been triggered
  const completedCubeEvents = Object.entries(cubeEvents)
    .filter(([eventId]) => {
      // Check if this cube event has been triggered
      const baseEventId = eventId.replace(/[a-z]$/, ""); // Remove trailing letter (e.g., cube14a -> cube14)
      return events[eventId] === true || events[baseEventId] === true;
    })
    .map(([eventId, eventData]) => ({
      id: eventId,
      ...eventData,
    }));

  const handleCubeClick = (event: (typeof completedCubeEvents)[0]) => {
    // Create a log entry from the event data
    const logEntry: LogEntry = {
      id: event.id,
      title: event.title,
      message: event.message,
      timestamp: Date.now(),
      type: "event",
      choices: event.choices,
    };

    setEventDialog(true, logEntry);
  };

  // Check if idle mode can be activated
  const totalEffects = getTotalPopulationEffects(
    state,
    Object.keys(state.villagers),
  );
  const woodProduction = totalEffects.wood || 0;
  const foodProduction = totalEffects.food || 0;
  const canActivateIdle = woodProduction > 0 && foodProduction > 0;

  const handleActivateIdleMode = async () => {
    const now = Date.now();

    // Set idle mode state before opening dialog
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: now,
        needsDisplay: true,
      },
    });

    // Get the MOST RECENT game state right before saving
    const currentState = useGameStore.getState();

    // Immediately save to Supabase so user can close tab
    const { saveGame } = await import("@/game/save");
    await saveGame(currentState, currentState.playTime);

    setIdleModeDialog(true);
  };

  // Generic upgrade handler
  const handleUpgrade = (
    upgradeType: "length" | "intensity",
    upgrades: typeof SLEEP_LENGTH_UPGRADES | typeof SLEEP_INTENSITY_UPGRADES,
    levelKey: "lengthLevel" | "intensityLevel",
  ) => {
    useGameStore.setState((state) => {
      const currentLevel = state.sleepUpgrades[levelKey];
      if (currentLevel >= 5) return state;

      const nextUpgrade = upgrades[currentLevel + 1];
      const currency = nextUpgrade.currency as "gold" | "silver";

      if (state.resources[currency] < nextUpgrade.cost) return state;

      return {
        ...state,
        sleepUpgrades: {
          ...state.sleepUpgrades,
          [levelKey]: currentLevel + 1,
        },
        resources: {
          ...state.resources,
          [currency]: state.resources[currency] - nextUpgrade.cost,
        },
      };
    });
  };

  const handleSleepLengthUpgrade = () =>
    handleUpgrade("length", SLEEP_LENGTH_UPGRADES, "lengthLevel");

  const handleSleepIntensityUpgrade = () =>
    handleUpgrade("intensity", SLEEP_INTENSITY_UPGRADES, "intensityLevel");

  const handleHuntingSkillUpgrade = () => {
    useGameStore.setState((state) => {
      const currentLevel = state.huntingSkills.level;
      if (currentLevel >= 5) return state;

      const nextUpgrade = HUNTING_SKILL_UPGRADES[currentLevel + 1];

      if (state.resources.gold < nextUpgrade.cost) return state;

      return {
        ...state,
        huntingSkills: {
          ...state.huntingSkills,
          level: currentLevel + 1,
        },
        resources: {
          ...state.resources,
          gold: state.resources.gold - nextUpgrade.cost,
        },
      };
    });
  };

  const handleCrushingStrikeUpgrade = () => {
    useGameStore.setState((state) => {
      const currentLevel = state.combatSkills.crushingStrikeLevel;
      if (currentLevel >= 5) return state;

      const nextUpgrade = CRUSHING_STRIKE_UPGRADES[currentLevel + 1];
      const currency = "gold" as const;

      if (state.resources[currency] < nextUpgrade.cost) return state;

      return {
        ...state,
        combatSkills: {
          ...state.combatSkills,
          crushingStrikeLevel: currentLevel + 1,
        },
        resources: {
          ...state.resources,
          [currency]: state.resources[currency] - nextUpgrade.cost,
        },
      };
    });
  };

  const handleBloodflameSphereUpgrade = () => {
    useGameStore.setState((state) => {
      const currentLevel = state.combatSkills.bloodflameSphereLevel;
      if (currentLevel >= 5) return state;

      const nextUpgrade = BLOODFLAME_SPHERE_UPGRADES[currentLevel + 1];
      const currency = "gold" as const;

      if (state.resources[currency] < nextUpgrade.cost) return state;

      return {
        ...state,
        combatSkills: {
          ...state.combatSkills,
          bloodflameSphereLevel: currentLevel + 1,
        },
        resources: {
          ...state.resources,
          [currency]: state.resources[currency] - nextUpgrade.cost,
        },
      };
    });
  };

  const currentLengthUpgrade = SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel];
  const nextLengthUpgrade =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel + 1];
  const canUpgradeLength =
    sleepUpgrades.lengthLevel < 5 &&
    resources.gold >= (nextLengthUpgrade?.cost || 0);

  const currentIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel];
  const nextIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel + 1];
  const canUpgradeIntensity =
    sleepUpgrades.intensityLevel < 5 &&
    resources.gold >= (nextIntensityUpgrade?.cost || 0);

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-2 mt-2">
        {/* Sleep Mode Section */}
        <div className="space-y-">
          <div className="flex items-center gap-2 pb-2">
            <h3 className="text-xs font-bold text-foreground">Rest</h3>
            {/* Focus Timer */}
            {focusState?.isActive && focusState.endTime > Date.now() && (
              <TooltipProvider>
                <Tooltip open={mobileTooltip.isTooltipOpen("focus-progress")}>
                  <TooltipTrigger asChild>
                    <div
                      className="text-xs text-primary flex items-center gap-0.5 cursor-pointer"
                      onClick={(e) =>
                        mobileTooltip.handleTooltipClick("focus-progress", e)
                      }
                    >
                      <div className="relative inline-flex items-center gap-1 mt-[0px]">
                        <CircularProgress
                          value={focusProgress}
                          size={18}
                          strokeWidth={2}
                          className="text-teal-400"
                        />
                        <span className="absolute inset-0 flex items-center justify-center font-extrabold text-[10px] -mt-[0px] text-teal-400">
                          ☩
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      {focusTooltip.getContent(state)}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <TooltipProvider>
            <Tooltip open={mobileTooltip.isTooltipOpen("sleep-button")}>
              <TooltipTrigger asChild>
                <div
                  className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                  onClick={
                    mobileTooltip.isMobile
                      ? (e) => {
                          mobileTooltip.handleWrapperClick(
                            "sleep-button",
                            !canActivateIdle,
                            false,
                            e,
                          );
                        }
                      : undefined
                  }
                  onTouchStart={
                    mobileTooltip.isMobile
                      ? (e) => {
                          mobileTooltip.handleTouchStart(
                            "sleep-button",
                            !canActivateIdle,
                            false,
                            e,
                          );
                        }
                      : undefined
                  }
                  onTouchEnd={
                    mobileTooltip.isMobile
                      ? (e) => {
                          mobileTooltip.handleTouchEnd(
                            "sleep-button",
                            !canActivateIdle,
                            handleActivateIdleMode,
                            e,
                          );
                        }
                      : undefined
                  }
                  onMouseDown={
                    mobileTooltip.isMobile
                      ? (e) => {
                          mobileTooltip.handleMouseDown(
                            "sleep-button",
                            !canActivateIdle,
                            false,
                            e,
                          );
                        }
                      : undefined
                  }
                  onMouseUp={
                    mobileTooltip.isMobile
                      ? (e) => {
                          mobileTooltip.handleMouseUp(
                            "sleep-button",
                            !canActivateIdle,
                            handleActivateIdleMode,
                            e,
                          );
                        }
                      : undefined
                  }
                >
                  <Button
                    onClick={
                      mobileTooltip.isMobile &&
                      mobileTooltip.isTooltipOpen("sleep-button")
                        ? (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        : handleActivateIdleMode
                    }
                    disabled={!canActivateIdle}
                    size="xs"
                    variant="outline"
                    className="h-7 hover:bg-transparent hover:text-foreground"
                    button_id="activate-sleep-mode"
                  >
                    Sleep
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs whitespace-nowrap">
                  {canActivateIdle ? (
                    <div>Let the world move in your absence</div>
                  ) : (
                    <div>Requires positive wood and food production</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Focus Activation Button */}
          {showFocusButton && (
            <TooltipProvider>
              <Tooltip open={mobileTooltip.isTooltipOpen("focus-button")}>
                <TooltipTrigger asChild>
                  <div className="h-5 inline-block pb-1 text-xs font-medium text-foreground ml-2">
                    <Button
                      onClick={() => {
                        const now = Date.now();
                        const focusPoints = focusState?.points || 0;
                        const focusDuration = calculateFocusDuration(focusPoints);

                        console.log('[FOCUS] Activating Focus:', {
                          focusPoints,
                          durationMs: focusDuration,
                          durationMinutes: focusDuration / 60000,
                        });
                        updateFocusState({
                          isActive: true,
                          endTime: now + focusDuration,
                          startTime: now,
                          duration: focusDuration,
                          points: 0,
                        });
                      }}
                      size="xs"
                      variant="outline"
                      className="h-7 hover:bg-transparent hover:text-foreground"
                      button_id="activate-focus"
                    >
                      Focus
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs whitespace-nowrap">
                    {focusState?.points} Focus: Get 2x action bonus for{" "}
                    {focusState?.points} minute{focusState?.points > 1 ? "s" : ""}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Sleep Upgrades Section */}
        <div className="w-80 space-y-1 pt-2">
          {/* Sleep Length Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="pb-1 text-xs font-medium text-foreground">
                Sleep Length
              </span>
              {sleepUpgrades.lengthLevel < 5 ? (
                <TooltipProvider>
                  <Tooltip open={mobileTooltip.isTooltipOpen("upgrade-length-button")}>
                    <TooltipTrigger asChild>
                      <div
                        className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                        onClick={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleWrapperClick(
                                  "upgrade-length-button",
                                  !canUpgradeLength,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchStart={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleTouchStart(
                                  "upgrade-length-button",
                                  !canUpgradeLength,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchEnd={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleTouchEnd(
                                  "upgrade-length-button",
                                  !canUpgradeLength,
                                  handleSleepLengthUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseDown={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleMouseDown(
                                  "upgrade-length-button",
                                  !canUpgradeLength,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseUp={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleMouseUp(
                                  "upgrade-length-button",
                                  !canUpgradeLength,
                                  handleSleepLengthUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseEnter={() => {
                          setHighlightedResources(["gold"]);
                        }}
                        onMouseLeave={() => {
                          setHighlightedResources([]);
                        }}
                      >
                        <Button
                          onClick={
                            mobileTooltip.isMobile &&
                            mobileTooltip.isTooltipOpen("upgrade-length-button")
                              ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              : handleSleepLengthUpgrade
                          }
                          disabled={!canUpgradeLength}
                          size="xs"
                          variant="ghost"
                          className="h-5 pb-1  hover:bg-transparent hover:text-foreground"
                          button_id="upgrade-sleep-length"
                        >
                          Improve
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        <div>
                          +
                          {nextLengthUpgrade.hours - currentLengthUpgrade.hours}
                          h
                        </div>
                        <div className="border-t border-border my-1" />
                        <div
                          className={
                            resources.gold >= nextLengthUpgrade.cost
                              ? ""
                              : "text-muted-foreground"
                          }
                        >
                          -{nextLengthUpgrade.cost} Gold
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <Progress
              value={(sleepUpgrades.lengthLevel / 5) * 100}
              className="h-2"
              segments={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentLengthUpgrade.hours}h</span>
            </div>
          </div>

          {/* Sleep Intensity Upgrade */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <span className="pb-1 text-xs font-medium text-foreground">
                Sleep Intensity
              </span>
              {sleepUpgrades.intensityLevel < 5 ? (
                <TooltipProvider>
                  <Tooltip
                    open={mobileTooltip.isTooltipOpen(
                      "upgrade-intensity-button",
                    )}
                  >
                    <TooltipTrigger asChild>
                      <div
                        className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                        onClick={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleWrapperClick(
                                  "upgrade-intensity-button",
                                  !canUpgradeIntensity,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchStart={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleTouchStart(
                                  "upgrade-intensity-button",
                                  !canUpgradeIntensity,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onTouchEnd={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleTouchEnd(
                                  "upgrade-intensity-button",
                                  !canUpgradeIntensity,
                                  handleSleepIntensityUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseDown={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleMouseDown(
                                  "upgrade-intensity-button",
                                  !canUpgradeIntensity,
                                  false,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseUp={
                          mobileTooltip.isMobile
                            ? (e) => {
                                mobileTooltip.handleMouseUp(
                                  "upgrade-intensity-button",
                                  !canUpgradeIntensity,
                                  handleSleepIntensityUpgrade,
                                  e,
                                );
                              }
                            : undefined
                        }
                        onMouseEnter={() => {
                          setHighlightedResources(["gold"]);
                        }}
                        onMouseLeave={() => {
                          setHighlightedResources([]);
                        }}
                      >
                        <Button
                          onClick={
                            mobileTooltip.isMobile &&
                            mobileTooltip.isTooltipOpen(
                              "upgrade-intensity-button",
                            )
                              ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }
                              : handleSleepIntensityUpgrade
                          }
                          disabled={!canUpgradeIntensity}
                          size="xs"
                          variant="ghost"
                          className="h-5 pb-1  hover:bg-transparent hover:text-foreground"
                          button_id="upgrade-sleep-intensity"
                        >
                          Improve
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        <div>
                          +
                          {nextIntensityUpgrade.percentage -
                            currentIntensityUpgrade.percentage}
                          %
                        </div>
                        <div className="border-t border-border my-1" />
                        <div
                          className={
                            resources.gold >= nextIntensityUpgrade.cost
                              ? ""
                              : "text-muted-foreground"
                          }
                        >
                          -{nextIntensityUpgrade.cost} Gold
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
            <Progress
              value={(sleepUpgrades.intensityLevel / 5) * 100}
              className="h-2"
              segments={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentIntensityUpgrade.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        {(fellowship.ashwraith_huntress ||
          fellowship.restless_knight ||
          fellowship.elder_wizard) && (
          <div className="space-y-1 pt-2">
            <h3 className="text-xs font-bold text-foreground">Skills</h3>

            {/* Huntress Training */}
            {fellowship.ashwraith_huntress && (
              <div className="w-80 space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <span className="pb-1 text-xs font-medium text-foreground">
                    Huntress Training
                  </span>
                  {huntingSkills.level < 5 ? (
                    <TooltipProvider>
                      <Tooltip
                        open={mobileTooltip.isTooltipOpen(
                          "upgrade-hunting-button",
                        )}
                      >
                        <TooltipTrigger asChild>
                          <div
                            className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                            onClick={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleWrapperClick(
                                      "upgrade-hunting-button",
                                      resources.gold <
                                        HUNTING_SKILL_UPGRADES[
                                          huntingSkills.level + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchStart={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchStart(
                                      "upgrade-hunting-button",
                                      resources.gold <
                                        HUNTING_SKILL_UPGRADES[
                                          huntingSkills.level + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchEnd={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchEnd(
                                      "upgrade-hunting-button",
                                      resources.gold <
                                        HUNTING_SKILL_UPGRADES[
                                          huntingSkills.level + 1
                                        ].cost,
                                      handleHuntingSkillUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseDown={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseDown(
                                      "upgrade-hunting-button",
                                      resources.gold <
                                        HUNTING_SKILL_UPGRADES[
                                          huntingSkills.level + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseUp={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseUp(
                                      "upgrade-hunting-button",
                                      resources.gold <
                                        HUNTING_SKILL_UPGRADES[
                                          huntingSkills.level + 1
                                        ].cost,
                                      handleHuntingSkillUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseEnter={() => {
                              setHighlightedResources(["gold"]);
                            }}
                            onMouseLeave={() => {
                              setHighlightedResources([]);
                            }}
                          >
                            <Button
                              onClick={
                                mobileTooltip.isMobile &&
                                mobileTooltip.isTooltipOpen(
                                  "upgrade-hunting-button",
                                )
                                  ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                  : handleHuntingSkillUpgrade
                              }
                              disabled={
                                resources.gold <
                                HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .cost
                              }
                              size="xs"
                              variant="ghost"
                              className="h-5 pb-1  hover:bg-transparent hover:text-foreground"
                              button_id="upgrade-hunting-skills"
                            >
                              Improve
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs whitespace-nowrap">
                            {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                              .food >
                              HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                .food && (
                              <div>
                                +
                                {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .food -
                                  HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                    .food}{" "}
                                Food per Hunter
                              </div>
                            )}
                            {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                              .fur >
                              HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                .fur && (
                              <div>
                                +
                                {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .fur -
                                  HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                    .fur}{" "}
                                Fur per Hunter
                              </div>
                            )}
                            {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                              .bones >
                              HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                .bones && (
                              <div>
                                +
                                {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .bones -
                                  HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                    .bones}{" "}
                                Bones per Hunter
                              </div>
                            )}
                            {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                              .huntBonus >
                              HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                .huntBonus && (
                              <div>
                                +
                                {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .huntBonus -
                                  HUNTING_SKILL_UPGRADES[huntingSkills.level]
                                    .huntBonus}
                                % Hunt bonus
                              </div>
                            )}
                            <div className="border-t border-border my-1" />
                            <div
                              className={
                                resources.gold >=
                                HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .cost
                                  ? ""
                                  : "text-muted-foreground"
                              }
                            >
                              -
                              {
                                HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]
                                  .cost
                              }{" "}
                              Gold
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
                <Progress
                  value={(huntingSkills.level / 5) * 100}
                  className="h-2"
                  segments={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {[
                      `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].huntBonus}% hunt bonus`,
                      HUNTING_SKILL_UPGRADES[huntingSkills.level].food > 0 &&
                        `hunter: +${HUNTING_SKILL_UPGRADES[huntingSkills.level].food} food`,
                      HUNTING_SKILL_UPGRADES[huntingSkills.level].fur > 0 &&
                        `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].fur} fur`,
                      HUNTING_SKILL_UPGRADES[huntingSkills.level].bones > 0 &&
                        `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].bones} bones`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </div>
            )}

            {/* Crushing Strike */}
            {fellowship.restless_knight && (
              <div className="w-80 space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <span className="pb-1 text-xs font-medium text-foreground">
                    Crushing Strike
                  </span>
                  {combatSkills.crushingStrikeLevel < 5 ? (
                    <TooltipProvider>
                      <Tooltip
                        open={mobileTooltip.isTooltipOpen(
                          "upgrade-crushing-strike-button",
                        )}
                      >
                        <TooltipTrigger asChild>
                          <div
                            className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                            onClick={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleWrapperClick(
                                      "upgrade-crushing-strike-button",
                                      resources.gold <
                                        CRUSHING_STRIKE_UPGRADES[
                                          combatSkills.crushingStrikeLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchStart={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchStart(
                                      "upgrade-crushing-strike-button",
                                      resources.gold <
                                        CRUSHING_STRIKE_UPGRADES[
                                          combatSkills.crushingStrikeLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchEnd={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchEnd(
                                      "upgrade-crushing-strike-button",
                                      resources.gold <
                                        CRUSHING_STRIKE_UPGRADES[
                                          combatSkills.crushingStrikeLevel + 1
                                        ].cost,
                                      handleCrushingStrikeUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseDown={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseDown(
                                      "upgrade-crushing-strike-button",
                                      resources.gold <
                                        CRUSHING_STRIKE_UPGRADES[
                                          combatSkills.crushingStrikeLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseUp={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseUp(
                                      "upgrade-crushing-strike-button",
                                      resources.gold <
                                        CRUSHING_STRIKE_UPGRADES[
                                          combatSkills.crushingStrikeLevel + 1
                                        ].cost,
                                      handleCrushingStrikeUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseEnter={() => {
                              setHighlightedResources(["gold"]);
                            }}
                            onMouseLeave={() => {
                              setHighlightedResources([]);
                            }}
                          >
                            <Button
                              onClick={
                                mobileTooltip.isMobile &&
                                mobileTooltip.isTooltipOpen(
                                  "upgrade-crushing-strike-button",
                                )
                                  ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                  : handleCrushingStrikeUpgrade
                              }
                              disabled={
                                resources.gold <
                                CRUSHING_STRIKE_UPGRADES[
                                  combatSkills.crushingStrikeLevel + 1
                                ].cost
                              }
                              size="xs"
                              variant="ghost"
                              className="h-5 pb-1  hover:bg-transparent hover:text-foreground"
                              button_id="upgrade-crushing-strike"
                            >
                              Improve
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs whitespace-nowrap">
                            {CRUSHING_STRIKE_UPGRADES[
                              combatSkills.crushingStrikeLevel + 1
                            ].damage >
                              CRUSHING_STRIKE_UPGRADES[
                                combatSkills.crushingStrikeLevel
                              ].damage && (
                              <div>
                                +
                                {CRUSHING_STRIKE_UPGRADES[
                                  combatSkills.crushingStrikeLevel + 1
                                ].damage -
                                  CRUSHING_STRIKE_UPGRADES[
                                    combatSkills.crushingStrikeLevel
                                  ].damage}{" "}
                                damage
                              </div>
                            )}
                            {CRUSHING_STRIKE_UPGRADES[
                              combatSkills.crushingStrikeLevel + 1
                            ].stunRounds >
                              CRUSHING_STRIKE_UPGRADES[
                                combatSkills.crushingStrikeLevel
                              ].stunRounds && (
                              <div>
                                +
                                {CRUSHING_STRIKE_UPGRADES[
                                  combatSkills.crushingStrikeLevel + 1
                                ].stunRounds -
                                  CRUSHING_STRIKE_UPGRADES[
                                    combatSkills.crushingStrikeLevel
                                  ].stunRounds}{" "}
                                stun round
                              </div>
                            )}
                            <div className="border-t border-border my-1" />
                            <div
                              className={
                                resources.gold >=
                                CRUSHING_STRIKE_UPGRADES[
                                  combatSkills.crushingStrikeLevel + 1
                                ].cost
                                  ? ""
                                  : "text-muted-foreground"
                              }
                            >
                              -
                              {
                                CRUSHING_STRIKE_UPGRADES[
                                  combatSkills.crushingStrikeLevel + 1
                                ].cost
                              }{" "}
                              Gold
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
                <Progress
                  value={(combatSkills.crushingStrikeLevel / 5) * 100}
                  className="h-2"
                  segments={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {
                      CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]
                        .damage
                    }{" "}
                    damage,{" "}
                    {
                      CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]
                        .stunRounds
                    }{" "}
                    round
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]
                      .stunRounds > 1
                      ? "s"
                      : ""}{" "}
                    stun
                  </span>
                </div>
              </div>
            )}

            {/* Bloodflame Sphere */}
            {fellowship.elder_wizard && (
              <div className="w-80 space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <span className="pb-1 text-xs font-medium text-foreground">
                    Bloodflame Sphere
                  </span>
                  {combatSkills.bloodflameSphereLevel < 5 ? (
                    <TooltipProvider>
                      <Tooltip
                        open={mobileTooltip.isTooltipOpen(
                          "upgrade-bloodflame-sphere-button",
                        )}
                      >
                        <TooltipTrigger asChild>
                          <div
                            className="h-5 inline-block pb-1 text-xs font-medium text-foreground"
                            onClick={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleWrapperClick(
                                      "upgrade-bloodflame-sphere-button",
                                      resources.gold <
                                        BLOODFLAME_SPHERE_UPGRADES[
                                          combatSkills.bloodflameSphereLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchStart={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchStart(
                                      "upgrade-bloodflame-sphere-button",
                                      resources.gold <
                                        BLOODFLAME_SPHERE_UPGRADES[
                                          combatSkills.bloodflameSphereLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onTouchEnd={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleTouchEnd(
                                      "upgrade-bloodflame-sphere-button",
                                      resources.gold <
                                        BLOODFLAME_SPHERE_UPGRADES[
                                          combatSkills.bloodflameSphereLevel + 1
                                        ].cost,
                                      handleBloodflameSphereUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseDown={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseDown(
                                      "upgrade-bloodflame-sphere-button",
                                      resources.gold <
                                        BLOODFLAME_SPHERE_UPGRADES[
                                          combatSkills.bloodflameSphereLevel + 1
                                        ].cost,
                                      false,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseUp={
                              mobileTooltip.isMobile
                                ? (e) => {
                                    mobileTooltip.handleMouseUp(
                                      "upgrade-bloodflame-sphere-button",
                                      resources.gold <
                                        BLOODFLAME_SPHERE_UPGRADES[
                                          combatSkills.bloodflameSphereLevel + 1
                                        ].cost,
                                      handleBloodflameSphereUpgrade,
                                      e,
                                    );
                                  }
                                : undefined
                            }
                            onMouseEnter={() => {
                              setHighlightedResources(["gold"]);
                            }}
                            onMouseLeave={() => {
                              setHighlightedResources([]);
                            }}
                          >
                            <Button
                              onClick={
                                mobileTooltip.isMobile &&
                                mobileTooltip.isTooltipOpen(
                                  "upgrade-bloodflame-sphere-button",
                                )
                                  ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }
                                  : handleBloodflameSphereUpgrade
                              }
                              disabled={
                                resources.gold <
                                BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].cost
                              }
                              size="xs"
                              variant="ghost"
                              className="h-5 pb-1  hover:bg-transparent hover:text-foreground"
                              button_id="upgrade-bloodflame-sphere"
                            >
                              Improve
                            </Button>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs whitespace-nowrap">
                            {BLOODFLAME_SPHERE_UPGRADES[
                              combatSkills.bloodflameSphereLevel + 1
                            ].damage >
                              BLOODFLAME_SPHERE_UPGRADES[
                                combatSkills.bloodflameSphereLevel
                              ].damage && (
                              <div>
                                +
                                {BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].damage -
                                  BLOODFLAME_SPHERE_UPGRADES[
                                    combatSkills.bloodflameSphereLevel
                                  ].damage}{" "}
                                damage
                              </div>
                            )}
                            {BLOODFLAME_SPHERE_UPGRADES[
                              combatSkills.bloodflameSphereLevel + 1
                            ].burnDamage >
                              BLOODFLAME_SPHERE_UPGRADES[
                                combatSkills.bloodflameSphereLevel
                              ].burnDamage && (
                              <div>
                                +
                                {BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].burnDamage -
                                  BLOODFLAME_SPHERE_UPGRADES[
                                    combatSkills.bloodflameSphereLevel
                                  ].burnDamage}{" "}
                                burn damage
                              </div>
                            )}
                            {BLOODFLAME_SPHERE_UPGRADES[
                              combatSkills.bloodflameSphereLevel + 1
                            ].burnRounds >
                              BLOODFLAME_SPHERE_UPGRADES[
                                combatSkills.bloodflameSphereLevel
                              ].burnRounds && (
                              <div>
                                +
                                {BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].burnRounds -
                                  BLOODFLAME_SPHERE_UPGRADES[
                                    combatSkills.bloodflameSphereLevel
                                  ].burnRounds}{" "}
                                burn round
                              </div>
                            )}
                            {BLOODFLAME_SPHERE_UPGRADES[
                              combatSkills.bloodflameSphereLevel + 1
                            ].healthCost >
                              BLOODFLAME_SPHERE_UPGRADES[
                                combatSkills.bloodflameSphereLevel
                              ].healthCost && (
                              <div>
                                +
                                {BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].healthCost -
                                  BLOODFLAME_SPHERE_UPGRADES[
                                    combatSkills.bloodflameSphereLevel
                                  ].healthCost}{" "}
                                health cost
                              </div>
                            )}
                            <div className="border-t border-border my-1" />
                            <div
                              className={
                                resources.gold >=
                                BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].cost
                                  ? ""
                                  : "text-muted-foreground"
                              }
                            >
                              -
                              {
                                BLOODFLAME_SPHERE_UPGRADES[
                                  combatSkills.bloodflameSphereLevel + 1
                                ].cost
                              }{" "}
                              Gold
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>
                <Progress
                  value={(combatSkills.bloodflameSphereLevel / 5) * 100}
                  className="h-2"
                  segments={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {
                      BLOODFLAME_SPHERE_UPGRADES[
                        combatSkills.bloodflameSphereLevel
                      ].damage
                    }{" "}
                    damage,{" "}
                    {
                      BLOODFLAME_SPHERE_UPGRADES[
                        combatSkills.bloodflameSphereLevel
                      ].burnDamage
                    }{" "}
                    burn damage x{" "}
                    {
                      BLOODFLAME_SPHERE_UPGRADES[
                        combatSkills.bloodflameSphereLevel
                      ].burnRounds
                    }{" "}
                    round
                    {BLOODFLAME_SPHERE_UPGRADES[
                      combatSkills.bloodflameSphereLevel
                    ].burnRounds > 1
                      ? "s"
                      : ""}
                    ,{" "}
                    {
                      BLOODFLAME_SPHERE_UPGRADES[
                        combatSkills.bloodflameSphereLevel
                      ].healthCost
                    }{" "}
                    health cost
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cube Section */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-bold text-foreground">Cube</h3>

          <div className="grid grid-cols-6 gap-5 w-40 h-12 gap-y-3">
            {completedCubeEvents.map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip open={cubeTooltip.isTooltipOpen(`cube-${event.id}`)}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        cubeTooltip.handleTooltipClick(`cube-${event.id}`, e);
                        useGameStore
                          .getState()
                          .trackButtonClick(`cube-${event.id}`);
                        handleCubeClick(event);
                      }}
                      className="w-6 h-6 bg-neutral-900 border border-neutral-800 rounded-md flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-500 transition-all cursor-pointer group relative"
                    >
                      <div className="text-md">▣</div>
                      <div className="absolute inset-0 cube-dialog-glow opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none rounded"></div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{event.title}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}