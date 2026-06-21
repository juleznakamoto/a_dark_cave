import React from "react";
import { useGameStore } from "@/game/state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cubeEvents } from "@/game/rules/eventsCube";
import { resolveEventTitle } from "@/i18n/eventText";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import { getTotalPopulationEffects } from "@/game/population";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/components/ui/circular-progress";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CHAINMASTER_UPGRADES,
  chainmasterUpgradeDisgustMs,
  CRUSHING_STRIKE_UPGRADES,
  BLOODFLAME_SPHERE_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  CROWS_EYE_UPGRADES,
  DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE,
  DISGRACED_PRIOR_UPGRADES,
} from "@/game/rules/skillUpgrades";
import { stackTimedDebuff } from "@/game/stateHelpers";
import { focusTooltip } from "@/game/rules/tooltips";
import { formatNumber } from "@/lib/utils";
import cn from "clsx";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatTooltipCostLine } from "@/i18n/tooltipLabels";

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
  const costLine = formatTooltipCostLine(upgradeCost, "gold");
  return (
    <div className="w-full space-y-1 pt-2">
      <div className="flex items-center justify-between">
        <span className="pb-1 text-xs font-medium text-foreground">{title}</span>
        {level < maxLevel ? (
          <TooltipWrapper
            tooltip={
              <div className="text-xs whitespace-nowrap">
                {tooltipContent}
                <div className="border-t border-border my-1" />
                <div className={canAfford ? "" : "text-muted-foreground"}>
                  {costLine}
                </div>
              </div>
            }
            tooltipId={tooltipId}
            disabled={!canAfford}
            onClick={canAfford ? onUpgrade : undefined}
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

const MAX_SLEEP_LENGTH_LEVEL = SLEEP_LENGTH_UPGRADES.length - 1;
const MAX_SLEEP_INTENSITY_LEVEL = SLEEP_INTENSITY_UPGRADES.length - 1;

export default function EstatePanel() {
  const { t } = useUiTranslation();
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
    chainmasterSkills,
    books,
    setHighlightedResources,
    resources,
    updateFocusState,
    updateResource,
  } = useGameStore();
  const state = useGameStore.getState();
  // Calculate focus progress based on game loop timing
  const [focusProgress, setFocusProgress] = React.useState(0);
  const focusState = useGameStore((state) => state.focusState);

  React.useEffect(() => {
    const updateFocusProgress = () => {
      const now = Date.now();
      if (focusState?.isActive && focusState.endTime > now) {
        const fromStored =
          typeof focusState.duration === "number" && focusState.duration > 0
            ? focusState.duration
            : null;
        const fromRange =
          focusState.startTime &&
            focusState.endTime > focusState.startTime
            ? focusState.endTime - focusState.startTime
            : null;
        const focusDuration = fromStored ?? fromRange ?? 60_000;
        const focusElapsed = focusDuration - (focusState.endTime - now);
        setFocusProgress(
          Math.min(100, Math.max(0, (focusElapsed / focusDuration) * 100)),
        );
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
    const logEntry = buildLocalizedEventLogEntry(
      event.id,
      event,
      useGameStore.getState(),
    );
    setEventDialog(true, logEntry);
  };

  // Check if idle mode can be activated (use production without temporary bonuses,
  // since feast/curse/frostfall/etc. are inactive during sleep)
  const totalEffects = getTotalPopulationEffects(
    state,
    Object.keys(state.villagers),
    { excludeTemporaryBonuses: true },
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
      const maxLevel =
        levelKey === "lengthLevel"
          ? MAX_SLEEP_LENGTH_LEVEL
          : MAX_SLEEP_INTENSITY_LEVEL;
      if (currentLevel >= maxLevel) return state;

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

  const handleChainmasterUpgrade = () => {
    useGameStore.setState((state) => {
      const currentLevel = state.chainmasterSkills?.level ?? 0;
      if (currentLevel >= 5) return state;
      const next = CHAINMASTER_UPGRADES[currentLevel + 1];
      if (!next || state.resources.gold < next.cost) return state;
      return {
        ...state,
        chainmasterSkills: { level: currentLevel + 1 },
        resources: {
          ...state.resources,
          gold: state.resources.gold - next.cost,
        },
        disgustState: stackTimedDebuff(
          state.disgustState,
          chainmasterUpgradeDisgustMs(next.disgustMinutes, state.cruelMode),
        ),
      };
    });
  };

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

  const blackEstateBonusHours = (state.buildings.blackEstate || 0) * 3;
  const blackEstateBonusIntensity = (state.buildings.blackEstate || 0) * 5;

  const currentLengthUpgrade = SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel];
  const nextLengthUpgrade =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel + 1];
  const canUpgradeLength =
    sleepUpgrades.lengthLevel < MAX_SLEEP_LENGTH_LEVEL &&
    resources.gold >= (nextLengthUpgrade?.cost || 0);

  const currentIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel];
  const nextIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel + 1];
  const canUpgradeIntensity =
    sleepUpgrades.intensityLevel < MAX_SLEEP_INTENSITY_LEVEL &&
    resources.gold >= (nextIntensityUpgrade?.cost || 0);

  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full space-y-2 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pr-2 pb-2">
        {/* Sleep Mode Section */}
        <div className="space-y-">
          <div className="flex items-center gap-2 pb-2">
            <h3 className="text-xs font-medium text-foreground">{t("estate.rest")}</h3>
            {/* Focus Timer */}
            {focusState?.isActive && focusState.endTime > Date.now() && (
              <TooltipWrapper
                tooltip={
                  <div className="text-xs">
                    {focusTooltip.getContent(state)}
                  </div>
                }
                tooltipId="focus-progress"
                disabled
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
                  <div>{t("estate.sleepTooltipReady")}</div>
                ) : (
                  <div>{t("estate.sleepTooltipBlocked")}</div>
                )}
              </div>
            }
            tooltipId="sleep-button"
            disabled={!canActivateIdle}
            onClick={canActivateIdle ? handleActivateIdleMode : undefined}
          >
            <div className="h-5 inline-block pb-1 text-xs font-medium text-foreground">
              <Button
                onClick={handleActivateIdleMode}
                disabled={!canActivateIdle}
                size="xs"
                variant="outline"
                className={cn(
                  "h-7",
                  gameActionOutlineButtonClassName(!canActivateIdle),
                )}
                button_id="activate-sleep-mode"
              >
                {t("estate.sleep")}
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
                className="h-7"
                button_id="activate-focus"
                disabled={!focusState?.points || focusState.points === 0 || focusState?.isActive}
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    {t("estate.focusRewardTooltip", {
                      count: focusState?.points || 0,
                    })}
                  </div>
                }
              >
                {t("estate.focus")}
              </CooldownButton>
              {focusState && focusState.points > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute -top-[9px] right-[-9px] flex items-center justify-center w-5 h-5 bg-teal-950 rounded-full text-[10px] font-medium z-[20] cursor-pointer hover:bg-teal-900 transition-colors duration-300"
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
                      {t("estate.focusPointTooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>

        {/* Sleep Upgrades Section */}
        <div className="w-full space-y-1 pt-2">
          {/* Sleep Length Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="pb-1 text-xs font-medium text-foreground">
                {t("estate.sleepLength")}
              </span>
              {sleepUpgrades.lengthLevel < MAX_SLEEP_LENGTH_LEVEL ? (
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
              value={(sleepUpgrades.lengthLevel / MAX_SLEEP_LENGTH_LEVEL) * 100}
              className="h-2"
              segments={MAX_SLEEP_LENGTH_LEVEL}
              growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {t("estate.sleepLengthDescription", {
                  hours: currentLengthUpgrade.hours + blackEstateBonusHours,
                })}
              </span>
            </div>
          </div>

          {/* Sleep Intensity Upgrade */}
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <span className="pb-1 text-xs font-medium text-foreground">
                {t("estate.sleepIntensity")}
              </span>
              {sleepUpgrades.intensityLevel < MAX_SLEEP_INTENSITY_LEVEL ? (
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
                        {formatTooltipCostLine(nextIntensityUpgrade.cost, "gold")}
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
              value={(sleepUpgrades.intensityLevel / MAX_SLEEP_INTENSITY_LEVEL) * 100}
              className="h-2"
              segments={MAX_SLEEP_INTENSITY_LEVEL}
              growAnimationMs={ESTATE_BAR_GROW_ANIMATION_MS}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {t("estate.sleepIntensityDescription", {
                  percent:
                    currentIntensityUpgrade.percentage +
                    blackEstateBonusIntensity,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Skills Section */}
        {(fellowship.ashwraith_huntress ||
          fellowship.restless_knight ||
          fellowship.elder_wizard ||
          fellowship.one_eyed_crow ||
          fellowship.disgraced_prior ||
          books.book_of_chainmaster) && (
            <div className="space-y-1 pt-2">
              <h3 className="text-xs font-medium text-foreground">{t("estate.skills")}</h3>

              {/* Huntress Training */}
              {fellowship.ashwraith_huntress && (
                <SkillUpgradeRow
                  title={t("estate.huntressTraining")}
                  level={huntingSkills.level}
                  upgradeCost={HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.cost ?? 0}
                  canAfford={resources.gold >= (HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.cost ?? Infinity)}
                  tooltipId="upgrade-hunting-button"
                  buttonId="upgrade-hunting-skills"
                  onUpgrade={handleHuntingSkillUpgrade}
                  tooltipContent={<>
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.food > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.food && (
                      <div>{t("estate.skillFoodPerHunter", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].food - HUNTING_SKILL_UPGRADES[huntingSkills.level].food })}</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.fur > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.fur && (
                      <div>{t("estate.skillFurPerHunter", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].fur - HUNTING_SKILL_UPGRADES[huntingSkills.level].fur })}</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.bones > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.bones && (
                      <div>{t("estate.skillBonesPerHunter", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].bones - HUNTING_SKILL_UPGRADES[huntingSkills.level].bones })}</div>
                    )}
                    {HUNTING_SKILL_UPGRADES[huntingSkills.level + 1]?.huntBonus > HUNTING_SKILL_UPGRADES[huntingSkills.level]?.huntBonus && (
                      <div>{t("estate.skillHuntBonus", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level + 1].huntBonus - HUNTING_SKILL_UPGRADES[huntingSkills.level].huntBonus })}</div>
                    )}
                  </>}
                  description={[
                    t("estate.skillHuntBonus", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level].huntBonus }),
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].food > 0 && t("estate.skillHunterFood", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level].food }),
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].fur > 0 && t("estate.skillFurBonus", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level].fur }),
                    HUNTING_SKILL_UPGRADES[huntingSkills.level].bones > 0 && t("estate.skillBonesBonus", { amount: HUNTING_SKILL_UPGRADES[huntingSkills.level].bones }),
                  ].filter(Boolean).join(", ")}
                />
              )}

              {/* Crushing Strike */}
              {fellowship.restless_knight && (
                <SkillUpgradeRow
                  title={t("estate.crushingStrike")}
                  level={combatSkills.crushingStrikeLevel}
                  upgradeCost={CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.cost ?? 0}
                  canAfford={resources.gold >= (CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.cost ?? Infinity)}
                  tooltipId="upgrade-crushing-strike-button"
                  buttonId="upgrade-crushing-strike"
                  onUpgrade={handleCrushingStrikeUpgrade}
                  tooltipContent={<>
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.damage > CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]?.damage && (
                      <div>{t("estate.skillDamageBonus", { amount: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].damage - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].damage })}</div>
                    )}
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.stunRounds > CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]?.stunRounds && (
                      <div>{t("estate.skillStunRound", { count: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].stunRounds - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds, amount: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].stunRounds - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds })}</div>
                    )}
                    {CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1]?.successChance > CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel]?.successChance && (
                      <div>{t("estate.skillSuccessChanceBonus", { amount: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel + 1].successChance - CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].successChance })}</div>
                    )}
                  </>}
                  description={t("estate.crushingStrikeSummary", {
                    damage: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].damage,
                    rounds: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].stunRounds,
                    success: CRUSHING_STRIKE_UPGRADES[combatSkills.crushingStrikeLevel].successChance,
                  })}
                />
              )}

              {/* Bloodflame Sphere */}
              {fellowship.elder_wizard && (() => {
                const lvl = combatSkills.bloodflameSphereLevel;
                const cur = BLOODFLAME_SPHERE_UPGRADES[lvl];
                const nxt = BLOODFLAME_SPHERE_UPGRADES[lvl + 1];
                return (
                  <SkillUpgradeRow
                    title={t("estate.bloodflameSphere")}
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-bloodflame-sphere-button"
                    buttonId="upgrade-bloodflame-sphere"
                    onUpgrade={handleBloodflameSphereUpgrade}
                    tooltipContent={<>
                      {nxt?.burnDamage > cur?.burnDamage && <div>{t("estate.skillBurnDamage", { amount: nxt.burnDamage - cur.burnDamage })}</div>}
                      {nxt?.burnRounds > cur?.burnRounds && (() => {
                        const d = nxt.burnRounds - cur.burnRounds;
                        return (
                          <div>
                            {t("estate.skillBurnRound", { count: d, amount: d })}
                          </div>
                        );
                      })()}
                      {nxt?.healthCost > cur?.healthCost && <div>{t("estate.skillHealthCost", { amount: nxt.healthCost - cur.healthCost })}</div>}
                    </>}
                    description={t(cur.burnRounds === 1 ? "estate.bloodflameSummary_one" : "estate.bloodflameSummary", {
                      damage: cur.burnDamage,
                      rounds: cur.burnRounds,
                      health: cur.healthCost,
                    })}
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
                    title={t("estate.crowsEye")}
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-crows-eye-button"
                    buttonId="upgrade-crows-eye"
                    onUpgrade={handleCrowsEyeUpgrade}
                    tooltipContent={<div>{t("estate.skillDoubleGain", { amount: (nxt?.doubleChance ?? 0) - (cur?.doubleChance ?? 0) })}</div>}
                    description={t("estate.crowsEyeSummary", { percent: cur.doubleChance })}
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
                    ? <div>{t("estate.priorConcurrentAction", { count: actionDelta })}</div>
                    : <div>{t("estate.priorActionBonus", { percent: bonusPercent })}</div>
                ) : <div>{t("estate.maxLevel")}</div>;
                const curBonusPercent = (cur.rewardMultiplier - 1) * 100;
                const upkeepText = t("estate.priorUpkeepShort", {
                  amount: DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE,
                });
                const description =
                  curBonusPercent > 0
                    ? t("estate.priorSummaryBonus", {
                      actions: cur.maxActions,
                      bonus: curBonusPercent,
                      upkeep: upkeepText,
                    })
                    : t("estate.priorSummaryNoBonus", {
                      count: cur.maxActions,
                      upkeep: upkeepText,
                    });
                return (
                  <SkillUpgradeRow
                    title={t("estate.disgracedPrior")}
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

              {/* Chainmaster */}
              {books.book_of_chainmaster && (() => {
                const lvl = chainmasterSkills?.level ?? 0;
                const cur = CHAINMASTER_UPGRADES[lvl];
                const nxt = CHAINMASTER_UPGRADES[lvl + 1];
                const curPercent = Math.round(cur.productionBonus * 100);
                const nextPercent = nxt
                  ? Math.round(nxt.productionBonus * 100)
                  : 0;
                const tooltipContent = nxt ? (
                  <>
                    <div>
                      {t("estate.chainmasterProductionBonus", {
                        percent: nextPercent - curPercent,
                      })}
                    </div>
                    <div>
                      {t("estate.chainmasterDisgustDuration", {
                        minutes: nxt.disgustMinutes,
                      })}
                    </div>
                  </>
                ) : (
                  <div>{t("estate.maxLevel")}</div>
                );
                return (
                  <SkillUpgradeRow
                    title={t("estate.chainmaster")}
                    level={lvl}
                    upgradeCost={nxt?.cost ?? 0}
                    canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                    tooltipId="upgrade-chainmaster-button"
                    buttonId="upgrade-chainmaster"
                    onUpgrade={handleChainmasterUpgrade}
                    tooltipContent={tooltipContent}
                    description={t("estate.chainmasterSummary", {
                      percent: curPercent,
                    })}
                  />
                );
              })()}
            </div>
          )}

        {/* Cube Section */}
        <div className="w-full space-y-2 pt-1 pb-4">
          <h3 className="text-xs font-medium text-foreground">{t("estate.cubeWhispers")}</h3>

          <div className="grid grid-cols-6 place-items-center gap-x-2 gap-y-4 w-full">
            {completedCubeEvents.map((event) => {
              const openCubeEvent = () => {
                useGameStore.getState().trackButtonClick(`cube-${event.id}`);
                handleCubeClick(event);
              };
              const cubeTitle =
                resolveEventTitle(event.id, event.title, state) ??
                (typeof event.title === "string" ? event.title : event.id);

              return (
                <TooltipWrapper
                  key={event.id}
                  tooltip={
                    <div className="text-xs">{cubeTitle}</div>
                  }
                  tooltipId={`cube-${event.id}`}
                  onClick={openCubeEvent}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCubeEvent();
                    }}
                    className="w-6 h-6 bg-neutral-900 border border-neutral-800 rounded-md flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-500 transition-all cursor-pointer group relative"
                  >
                    <div className="text-md">▣</div>
                    <div className="absolute inset-0 cube-dialog-glow opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none rounded"></div>
                  </button>
                </TooltipWrapper>
              );
            })}
          </div>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}