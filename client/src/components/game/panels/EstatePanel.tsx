import React, { useEffect, useRef } from "react";
import { useGameStore } from "@/game/state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cubeEvents } from "@/game/rules/eventsCube";
import { LogEntry } from "@/game/rules/events";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import { getTotalPopulationEffects } from "@/game/population";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import CooldownButton from "@/components/CooldownButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CRUSHING_STRIKE_UPGRADES,
  BLOODFLAME_SPHERE_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  CROWS_EYE_UPGRADES,
  DISGRACED_PRIOR_UPGRADES,
} from "@/game/rules/skillUpgrades";
import { focusTooltip } from "@/game/rules/tooltips";
import { useGlobalTooltip } from "@/hooks/useGlobalTooltip";
import { formatNumber } from "@/lib/utils";
import cn from "clsx";

const ESTATE_BAR_GROW_ANIMATION_MS = 500;

interface SkillUpgradeRowProps {
  title: string;
  level: number;
  maxLevel?: number;
  upgradeCost: number;
  canAfford: boolean;
  tooltipId: string;
  buttonId: string;
  onUpgrade: () => void;
  tooltipContent: React.ReactNode;
  description: React.ReactNode;
}

function SkillUpgradeRow({
  title,
  level,
  maxLevel = 5,
  upgradeCost,
  canAfford,
  tooltipId,
  buttonId,
  onUpgrade,
  tooltipContent,
  description,
}: SkillUpgradeRowProps) {
  const setHighlightedResources = useGameStore((s) => s.setHighlightedResources);
  return (
    <div className="w-80 space-y-1 pt-2">
      <div className="flex items-center justify-between">
        <span className="pb-1 text-xs font-medium text-foreground">{title}</span>
        {level < maxLevel ? (
          <TooltipWrapper
            tooltip={
              <div className="text-xs whitespace-nowrap">
                {tooltipContent}
                <div className="border-t border-border my-1" />
                <div className={canAfford ? "" : "text-muted-foreground"}>
                  -{formatNumber(upgradeCost)} Gold
                </div>
              </div>
            }
            tooltipId={tooltipId}
            disabled={!canAfford}
            onMouseEnter={() => setHighlightedResources(["gold"])}
            onMouseLeave={() => setHighlightedResources([])}
          >
            <ImproveButton
              onClick={onUpgrade}
              disabled={!canAfford}
              button_id={buttonId}
              variant="flash"
            />
          </TooltipWrapper>
        ) : null}
      </div>
      <Progress
        value={(level / maxLevel) * 100}
        className="h-2"
        segments={maxLevel}
        growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{description}</span>
      </div>
    </div>
  );
}

const SLEEP_LENGTH_TOOLTIP_ID = "estate-sleep-length";
const SLEEP_INTENSITY_TOOLTIP_ID = "estate-sleep-intensity";

export default function EstatePanel() {
  const {
    events,
    setEventDialog,
    setIdleModeDialog,
    sleepUpgrades,
    huntingSkills,
    crowsEyeSkills,
    combatSkills,
    fellowship,
    disgracedPriorSkills,
    setHighlightedResources,
    resources,
    updateFocusState,
    updateResource,
  } = useGameStore();
  const state = useGameStore.getState();
  const hoveredTooltips = useGameStore((s) => s.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((s) => s.setHoveredTooltip);
  const hoverTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const globalTooltip = useGlobalTooltip();

  const handleTooltipHover = (id: string) => {
    const existing = hoverTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setHoveredTooltip(id, true);
      hoverTimersRef.current.delete(id);
    }, 500);
    hoverTimersRef.current.set(id, timer);
  };

  const handleTooltipLeave = (id: string) => {
    const timer = hoverTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      hoverTimersRef.current.delete(id);
    }
  };

  useEffect(() => () => {
    hoverTimersRef.current.forEach((t) => clearTimeout(t));
    hoverTimersRef.current.clear();
  }, []);

  // Mark as seen when tooltip opens (hover or long-press)
  useEffect(() => {
    if (globalTooltip.isTooltipOpen(SLEEP_LENGTH_TOOLTIP_ID)) {
      setHoveredTooltip(SLEEP_LENGTH_TOOLTIP_ID, true);
    }
    if (globalTooltip.isTooltipOpen(SLEEP_INTENSITY_TOOLTIP_ID)) {
      setHoveredTooltip(SLEEP_INTENSITY_TOOLTIP_ID, true);
    }
  }, [globalTooltip.openTooltipId, setHoveredTooltip]);

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

  // Focus button - only show if there are focus points available
  const showFocusButton = focusState?.points > 0;

  // Calculate Focus duration: 1 focus point = 1 minute of Focus time
  const calculateFocusDuration = (focusPoints: number) => {
    return focusPoints * 60 * 1000; // Convert focus points to milliseconds (1 point = 1 minute)
  };


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

  const handleSkillUpgrade = (
    upgrades: { cost: number }[],
    getCurrentLevel: (s: ReturnType<typeof useGameStore.getState>) => number,
    applyLevel: (s: ReturnType<typeof useGameStore.getState>, newLevel: number) => Partial<ReturnType<typeof useGameStore.getState>>,
  ) => {
    useGameStore.setState((state) => {
      const currentLevel = getCurrentLevel(state);
      if (currentLevel >= 5) return state;
      const next = upgrades[currentLevel + 1];
      if (!next || state.resources.gold < next.cost) return state;
      return {
        ...state,
        ...applyLevel(state, currentLevel + 1),
        resources: { ...state.resources, gold: state.resources.gold - next.cost },
      };
    });
  };

  const handleHuntingSkillUpgrade = () =>
    handleSkillUpgrade(
      HUNTING_SKILL_UPGRADES,
      (s) => s.huntingSkills.level,
      (s, level) => ({ huntingSkills: { ...s.huntingSkills, level } }),
    );

  const handleCrowsEyeUpgrade = () =>
    handleSkillUpgrade(
      CROWS_EYE_UPGRADES,
      (s) => s.crowsEyeSkills.level,
      (s, level) => ({ crowsEyeSkills: { ...s.crowsEyeSkills, level } }),
    );

  const handleDgracedPriorUpgrade = () =>
    handleSkillUpgrade(
      DISGRACED_PRIOR_UPGRADES,
      (s) => s.disgracedPriorSkills?.level ?? 0,
      (_s, level) => ({ disgracedPriorSkills: { level } }),
    );

  const handleCrushingStrikeUpgrade = () =>
    handleSkillUpgrade(
      CRUSHING_STRIKE_UPGRADES,
      (s) => s.combatSkills.crushingStrikeLevel,
      (s, level) => ({ combatSkills: { ...s.combatSkills, crushingStrikeLevel: level } }),
    );

  const handleBloodflameSphereUpgrade = () =>
    handleSkillUpgrade(
      BLOODFLAME_SPHERE_UPGRADES,
      (s) => s.combatSkills.bloodflameSphereLevel,
      (s, level) => ({ combatSkills: { ...s.combatSkills, bloodflameSphereLevel: level } }),
    );

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
      <div className="space-y-2 mt-2 mb-2 pl-[3px] ">
        {/* Sleep Mode Section */}
        <div className="space-y-">
          <div className="flex items-center gap-2 pb-2">
            <h3 className="text-xs font-medium text-foreground">Rest</h3>
            {/* Focus Timer */}
            {focusState?.isActive && focusState.endTime > Date.now() && (
              <TooltipWrapper
                tooltip={
                  <div className="text-xs">
                    {focusTooltip.getContent(state)}
                  </div>
                }
                tooltipId="focus-progress"
              >
                <div className="text-xs text-primary flex items-center gap-0.5 cursor-pointer">
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
              </TooltipWrapper>
            )}
          </div>
          <TooltipWrapper
            tooltip={
              <div className="text-xs whitespace-nowrap">
                {canActivateIdle ? (
                  <div>Let the world move on in your absence</div>
                ) : (
                  <div>Requires positive wood and food production</div>
                )}
              </div>
            }
            tooltipId="sleep-button"
            disabled={!canActivateIdle}
          >
            <div className="h-5 inline-block pb-1 text-xs font-medium text-foreground">
              <Button
                onClick={handleActivateIdleMode}
                disabled={!canActivateIdle}
                size="xs"
                variant="outline"
                className="h-7 hover:bg-background hover:text-foreground"
                button_id="activate-sleep-mode"
              >
                Sleep
              </Button>
            </div>
          </TooltipWrapper>

          {/* Focus Activation Button */}
          {showFocusButton && (
            <div className="relative inline-block pb-1 text-xs font-medium text-foreground ml-2">
              <CooldownButton
                  onClick={() => {
                    const now = Date.now();
                    const focusPoints = focusState?.points || 0;
                    const focusDuration = calculateFocusDuration(focusPoints);
                    updateFocusState({
                      isActive: true,
                      endTime: now + focusDuration,
                      startTime: now,
                      duration: focusDuration,
                      points: 0,
                    });
                  }}
                  cooldownMs={0}
                  size="xs"
                  variant="outline"
                  className="h-7 hover:bg-background hover:text-foreground"
                  button_id="activate-focus"
                  disabled={!focusState?.points || focusState.points === 0 || focusState?.isActive}
                  tooltip={
                    <div className="text-xs whitespace-nowrap">
                      Get 100 % bonus on actions for {focusState?.points || 0} minute{(focusState?.points || 0) !== 1 ? "s" : ""}
                    </div>
                  }
                >
                  Focus
                </CooldownButton>
              {focusState && focusState.points > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute -top-[7px] right-[-7px] flex items-center justify-center w-4 h-4 bg-teal-950 rounded-full text-[10px] font-medium z-[20] cursor-pointer hover:bg-teal-900 transition-colors duration-300"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        {focusState.points}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="max-w-xs bg-popover text-white border text-xs whitespace-nowrap"
                    >
                      Earn 1 Focus Point per hour of sleep
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Sleep Upgrades Section */}
        <div className="w-80 space-y-1 pt-2">
          {/* Sleep Length Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <TooltipWrapper
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    Max hours per sleep
                  </div>
                }
                tooltipId={SLEEP_LENGTH_TOOLTIP_ID}
                className={cn(
                  "relative inline-block pb-1 text-xs font-medium text-foreground",
                  !hoveredTooltips[SLEEP_LENGTH_TOOLTIP_ID] && "new-item-pulse",
                )}
                onMouseEnter={() => handleTooltipHover(SLEEP_LENGTH_TOOLTIP_ID)}
                onMouseLeave={() => handleTooltipLeave(SLEEP_LENGTH_TOOLTIP_ID)}
              >
                <span>Sleep Length</span>
              </TooltipWrapper>
              {sleepUpgrades.lengthLevel < 5 ? (
                <TooltipWrapper
                  tooltip={
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
                        -{formatNumber(nextLengthUpgrade.cost)} Gold
                      </div>
                    </div>
                  }
                  tooltipId="upgrade-length-button"
                  disabled={!canUpgradeLength}
                  onClick={handleSleepLengthUpgrade}
                  onMouseEnter={() => {
                    setHighlightedResources(["gold"]);
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  <ImproveButton
                    onClick={handleSleepLengthUpgrade}
                    disabled={!canUpgradeLength}
                    button_id="upgrade-sleep-length"
                    variant="flash"
                  />
                </TooltipWrapper>
              ) : null}
            </div>
            <Progress
              value={(sleepUpgrades.lengthLevel / 5) * 100}
              className="h-2"
              segments={5}
              growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentLengthUpgrade.hours}h</span>
            </div>
          </div>

          {/* Sleep Intensity Upgrade */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <TooltipWrapper
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    Village production % while sleeping
                  </div>
                }
                tooltipId={SLEEP_INTENSITY_TOOLTIP_ID}
                className={cn(
                  "relative inline-block pb-1 text-xs font-medium text-foreground",
                  !hoveredTooltips[SLEEP_INTENSITY_TOOLTIP_ID] && "new-item-pulse",
                )}
                onMouseEnter={() => handleTooltipHover(SLEEP_INTENSITY_TOOLTIP_ID)}
                onMouseLeave={() => handleTooltipLeave(SLEEP_INTENSITY_TOOLTIP_ID)}
              >
                <span>Sleep Intensity</span>
              </TooltipWrapper>
              {sleepUpgrades.intensityLevel < 5 ? (
                <TooltipWrapper
                  tooltip={
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
                        -{formatNumber(nextIntensityUpgrade.cost)} Gold
                      </div>
                    </div>
                  }
                  tooltipId="upgrade-intensity-button"
                  disabled={!canUpgradeIntensity}
                  onMouseEnter={() => {
                    setHighlightedResources(["gold"]);
                  }}
                  onMouseLeave={() => {
                    setHighlightedResources([]);
                  }}
                >
                  <ImproveButton
                    onClick={handleSleepIntensityUpgrade}
                    disabled={!canUpgradeIntensity}
                    button_id="upgrade-sleep-intensity"
                    variant="flash"
                  />
                </TooltipWrapper>
              ) : null}
            </div>
            <Progress
              value={(sleepUpgrades.intensityLevel / 5) * 100}
              className="h-2"
              segments={5}
              growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentIntensityUpgrade.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        {(fellowship.ashwraith_huntress ||
          fellowship.restless_knight ||
          fellowship.elder_wizard ||
          fellowship.one_eyed_crow ||
          fellowship.disgraced_prior) && (
            <div className="space-y-1 pt-2">
              <h3 className="text-xs font-medium text-foreground">Skills</h3>

              {/* Huntress Training */}
              {fellowship.ashwraith_huntress && (
                <SkillUpgradeRow
                  title="Huntress Training"
                  level={huntingSkills.level}
                  upgradeCost={HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.cost ?? 0}
                  canAfford={resources.gold >= (HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.cost ?? Infinity)}
                  tooltipId="upgrade-hunting-button"
                  buttonId="upgrade-hunting-skills"
                  onUpgrade={handleHuntingSkillUpgrade}
                  tooltipContent={<>
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.food > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.food && (
                      <div>+{HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].food - HUNTING_SKILL_UPGRADES[huntingSkills.level].food} Food per Hunter</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.fur > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.fur && (
                      <div>+{HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].fur - HUNTING_SKILL_UPGRADES[huntingSkills.level].fur} Fur per Hunter</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.bones > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.bones && (
                      <div>+{HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].bones - HUNTING_SKILL_UPGRADES[huntingSkills.level].bones} Bones per Hunter</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.huntBonus > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.huntBonus && (
                      <div>+{HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].huntBonus - HUNTING_SKILL_UPGRADES[huntingSkills.level].huntBonus}% Hunt bonus</div>
                    )}
                  </>}
                  description={[
                    `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].huntBonus}% hunt bonus`,
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].food > 0 && `hunter: +${HUNTING_SKILL_UPGRADES[huntingSkills.level].food} food`,
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].fur > 0 && `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].fur} fur`,
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].bones > 0 && `+${HUNTING_SKILL_UPGRADES[huntingSkills.level].bones} bones`,
                  ].filter(Boolean).join(", ")}
                />
              )}

              {/* Crushing Strike */}
              {fellowship.restless_knight && (
                <SkillUpgradeRow
                  title="Crushing Strike"
                  level={combatSkills.crushingStrikeLevel}
                  upgradeCost={CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.cost ?? 0}
                  canAfford={resources.gold >= (CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.cost ?? Infinity)}
                  tooltipId="upgrade-crushing-strike-button"
                  buttonId="upgrade-crushing-strike"
                  onUpgrade={handleCrushingStrikeUpgrade}
                  tooltipContent={<>
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.damage > CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]?.damage && (
                      <div>+{CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].damage - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].damage} damage</div>
                    )}
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.stunRounds > CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]?.stunRounds && (
                      <div>+{CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].stunRounds - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds} stun round</div>
                    )}
                  </>}
                  description={`${CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].damage} damage, ${CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds} round${CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds > 1 ? "s" : ""} stun`}
                />
              )}

              {/* Bloodflame Sphere */}
              {fellowship.elder_wizard && (() => {
                const lvl = combatSkills.bloodflameSphereLevel;
                const cur = BLOODFLAME_SPHERE_UPGRADES[lvl];
                const nxt = BLOODFLAME_SPHERE_UPGRADES[lvl + 1];
                return (
                  <SkillUpgradeRow
                    title="Bloodflame Sphere"
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-bloodflame-sphere-button"
                    buttonId="upgrade-bloodflame-sphere"
                    onUpgrade={handleBloodflameSphereUpgrade}
                    tooltipContent={<>
                      {nxt?.damage > cur?.damage && <div>+{nxt.damage - cur.damage} damage</div>}
                      {nxt?.burnDamage > cur?.burnDamage && <div>+{nxt.burnDamage - cur.burnDamage} burn damage</div>}
                      {nxt?.burnRounds > cur?.burnRounds && <div>+{nxt.burnRounds - cur.burnRounds} burn round</div>}
                      {nxt?.healthCost > cur?.healthCost && <div>+{nxt.healthCost - cur.healthCost} health cost</div>}
                    </>}
                    description={`${cur.damage} damage, ${cur.burnDamage} burn damage x ${cur.burnRounds} round${cur.burnRounds > 1 ? "s" : ""}, ${cur.healthCost} health cost`}
                  />
                );
              })()}

              {/* Crow's Eye */}
              {fellowship.one_eyed_crow && (() => {
                const lvl = crowsEyeSkills.level;
                const cur = CROWS_EYE_UPGRADES[lvl];
                const nxt = CROWS_EYE_UPGRADES[lvl + 1];
                return (
                  <SkillUpgradeRow
                    title="Crow's Eye"
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-crows-eye-button"
                    buttonId="upgrade-crows-eye"
                    onUpgrade={handleCrowsEyeUpgrade}
                    tooltipContent={<div>+{nxt?.doubleChance - cur?.doubleChance}% double gain chance</div>}
                    description={`${cur.doubleChance}% chance to double gains from actions`}
                  />
                );
              })()}

              {/* Disgraced Prior */}
              {fellowship.disgraced_prior && (() => {
                const lvl = disgracedPriorSkills?.level ?? 0;
                const cur = DISGRACED_PRIOR_UPGRADES[lvl];
                const nxt = DISGRACED_PRIOR_UPGRADES[lvl + 1];
                const actionDelta = nxt ? nxt.maxActions - cur.maxActions : 0;
                const bonusPercent = nxt ? (nxt.rewardMultiplier - 1) * 100 : 0;
                const tooltipContent = nxt ? (
                  actionDelta > 0
                    ? <div>+{actionDelta} concurrent action{actionDelta > 1 ? "s" : ""}</div>
                    : <div>+{bonusPercent}% bonus on assigned actions</div>
                ) : <div>Max level</div>;
                const curBonusPercent = (cur.rewardMultiplier - 1) * 100;
                const description = curBonusPercent > 0
                  ? `${cur.maxActions} action${cur.maxActions > 1 ? "s" : ""}, +${curBonusPercent}% bonus`
                  : `${cur.maxActions} concurrent action${cur.maxActions > 1 ? "s" : ""}`;
                return (
                  <SkillUpgradeRow
                    title="Disgraced Prior"
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-disgraced-prior-button"
                    buttonId="upgrade-disgraced-prior"
                    onUpgrade={handleDgracedPriorUpgrade}
                    tooltipContent={tooltipContent}
                    description={description}
                  />
                );
              })()}
            </div>
          )}

        {/* Cube Section */}
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-medium text-foreground">Cube</h3>

          <div className="grid grid-cols-6 gap-5 w-40 h-12 gap-y-3">
            {completedCubeEvents.map((event) => (
              <TooltipWrapper
                key={event.id}
                tooltip={
                  <div className="text-xs">{event.title}</div>
                }
                tooltipId={`cube-${event.id}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
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
              </TooltipWrapper>
            ))}
          </div>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}