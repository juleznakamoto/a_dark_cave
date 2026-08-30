import React from "react";
import { useShallow } from "zustand/react/shallow";
import { useGameStore } from "@/game/state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cubeEvents } from "@/game/rules/eventsCube";
import { resolveEventTitle } from "@/i18n/eventText";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { Button } from "@/components/ui/button";
import { ImproveButton } from "@/components/ui/improve-button";
import { getTotalPopulationEffects } from "@/game/population";
import {
  EstateStyleProgress,
  SharedProgressShaderHost,
} from "@/components/ui/shared-progress-shader";
import { CircularProgress } from "@/components/ui/circular-progress";
import CooldownButton, {
  gameActionOutlineButtonClassName,
} from "@/components/CooldownButton";
import {
  CHAINMASTER_UPGRADES,
  chainmasterUpgradeDisgustMs,
  CRUSHING_STRIKE_UPGRADES,
  BLOODFLAME_SPHERE_UPGRADES,
  FERAL_HOWL_UPGRADES,
  HUNTING_SKILL_UPGRADES,
  SLEEP_LENGTH_UPGRADES,
  SLEEP_INTENSITY_UPGRADES,
  CROWS_EYE_UPGRADES,
  DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE,
  DISGRACED_PRIOR_UPGRADES,
} from "@/game/rules/skillUpgrades";
import { isTraderShopUnlocked, stackTimedDebuff } from "@/game/stateHelpers";
import { focusTooltip } from "@/game/rules/tooltips";
import {
  GAME_PANEL_HEADER_INDICATOR_CLASS,
  GAME_PANEL_HEADER_INDICATOR_INNER_CLASS,
  GAME_PANEL_HEADER_INDICATOR_SIZE_PX,
  GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS,
} from "@/components/game/gameChrome";
import { headerIndicatorIcon } from "@/game/headerIndicatorIcons";
import { formatNumber, formatSignedNumber } from "@/lib/utils";
import cn from "clsx";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { formatTooltipCostLine } from "@/i18n/tooltipLabels";
import { getResourceName } from "@/i18n/resolveGameText";
import { useDemoEndCatalogActive, useSteamEditionActive } from "@/hooks/useSteamEditionActive";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { RedactedLockedHint } from "@/components/game/RedactedHint";
import {
  DEMO_END_CUBE_EVENT_IDS,
  DEMO_END_ESTATE_SKILL_IDS,
  isDemoEndCubeEventCompleted,
  isDemoEndEstateSkillUnlocked,
  type DemoEndEstateSkillId,
} from "@/game/demoEndCatalog";


/** Open Trader gold filter when an Improve costs more gold than the player has. */
function useEstateGoldShopClick(canAfford: boolean) {
  const setShopDialogOpen = useGameStore((s) => s.setShopDialogOpen);
  const setShopFilter = useGameStore((s) => s.setShopFilter);
  const story = useGameStore((s) => s.story);
  const traderDialogOpens = useGameStore((s) => s.traderDialogOpens);
  const steamEditionActive = useSteamEditionActive();
  if (
    canAfford ||
    steamEditionActive ||
    !isTraderShopUnlocked({ story, traderDialogOpens })
  ) {
    return undefined;
  }
  return () => {
    setShopFilter("gold");
    setShopDialogOpen(true, "estate-buy-gold");
  };
}

/** Header row for estate upgrade bars — reserves Improve button width/height when maxed. */
function EstateUpgradeRowHeader({
  title,
  action,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-6 items-center justify-between">
      <span className="text-xs font-medium text-foreground">{title}</span>
      <div className="flex h-5 shrink-0 items-center justify-end pb-1">
        {action}
      </div>
    </div>
  );
}

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
  const catalogActive = useDemoEndCatalogActive();
  const canUpgrade = canAfford && !catalogActive;
  const openShop = useEstateGoldShopClick(canUpgrade);
  const costLine = formatTooltipCostLine(upgradeCost, "gold");
  return (
    <div className="w-full space-y-1 pt-2">
      <EstateUpgradeRowHeader
        title={title}
        action={
          level < maxLevel ? (
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
              disabled={!canUpgrade && !openShop}
              onClick={openShop}
              onMouseEnter={() => setHighlightedResources(["gold"])}
              onMouseLeave={() => setHighlightedResources([])}
            >
              <ImproveButton
                onClick={onUpgrade}
                disabled={!canUpgrade}
                onUnaffordableClick={openShop}
                button_id={buttonId}
              />
            </TooltipWrapper>
          ) : null
        }
      />
      <EstateStyleProgress
        value={(level / maxLevel) * 100}
        segments={maxLevel}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{description}</span>
      </div>
    </div>
  );
}

const MAX_SLEEP_LENGTH_LEVEL = SLEEP_LENGTH_UPGRADES.length - 1;
const MAX_SLEEP_INTENSITY_LEVEL = SLEEP_INTENSITY_UPGRADES.length - 1;

const ESTATE_SKILL_TITLE_KEYS: Record<DemoEndEstateSkillId, string> = {
  hunting: "estate.huntressTraining",
  crushingStrike: "estate.crushingStrike",
  bloodflameSphere: "estate.bloodflameSphere",
  feralHowl: "estate.feralHowl",
  crowsEye: "estate.crowsEye",
  disgracedPrior: "estate.tirelessWorker",
  chainmaster: "estate.chainmaster",
};

function getEstateSkillLevelZeroDescription(
  id: DemoEndEstateSkillId,
  t: (key: string, options?: Record<string, string | number | boolean | undefined>) => string,
): string {
  switch (id) {
    case "hunting": {
      const cur = HUNTING_SKILL_UPGRADES[0];
      return [
        t("estate.skillHuntBonus", { amount: cur.huntBonus }),
        cur.food > 0 && t("estate.skillHunterFood", { amount: cur.food }),
        cur.fur > 0 && t("estate.skillFurBonus", { amount: cur.fur }),
        cur.bones > 0 && t("estate.skillBonesBonus", { amount: cur.bones }),
      ]
        .filter(Boolean)
        .join(", ");
    }
    case "crushingStrike": {
      const cur = CRUSHING_STRIKE_UPGRADES[0];
      return t("estate.crushingStrikeSummary", {
        damage: cur.damage,
        rounds: cur.stunRounds,
        success: cur.successChance,
      });
    }
    case "bloodflameSphere": {
      const cur = BLOODFLAME_SPHERE_UPGRADES[0];
      return t(
        cur.burnRounds === 1
          ? "estate.bloodflameSummary_one"
          : "estate.bloodflameSummary",
        {
          damage: cur.burnDamage,
          rounds: cur.burnRounds,
          health: cur.healthCost,
        },
      );
    }
    case "feralHowl": {
      const cur = FERAL_HOWL_UPGRADES[0];
      return t(
        cur.debuffRounds === 1
          ? "estate.feralHowlSummary_one"
          : "estate.feralHowlSummary",
        {
          success: cur.successChance,
          reduction: cur.enemyDamageReduction,
          rounds: cur.debuffRounds,
          crit: cur.critDamageBonus,
        },
      );
    }
    case "crowsEye":
      return t("estate.crowsEyeSummary", {
        percent: CROWS_EYE_UPGRADES[0].doubleChance,
      });
    case "disgracedPrior": {
      const cur = DISGRACED_PRIOR_UPGRADES[0];
      const upkeepText = t("estate.priorUpkeepShort", {
        amount: DISGRACED_PRIOR_FOOD_PER_ASSIGNED_ACTION_PER_CYCLE,
      });
      const bonusPercent = (cur.rewardMultiplier - 1) * 100;
      return bonusPercent > 0
        ? t("estate.priorSummaryBonus", {
          actions: cur.maxActions,
          bonus: bonusPercent,
          upkeep: upkeepText,
        })
        : t("estate.priorSummaryNoBonus", {
          count: cur.maxActions,
          upkeep: upkeepText,
        });
    }
    case "chainmaster":
      return t("estate.chainmasterSummary", {
        percent: Math.round(CHAINMASTER_UPGRADES[0].productionBonus * 100),
      });
  }
}

function RedactedEstateUpgradeRow({
  id,
  title,
}: {
  id: DemoEndEstateSkillId;
  title: string;
}) {
  const { t } = useUiTranslation();
  const description = getEstateSkillLevelZeroDescription(id, t);
  return (
    <div
      className="w-full space-y-1 pt-2"
      data-testid={`estate-upgrade-${id}-redacted`}
    >
      <EstateUpgradeRowHeader
        title={
          <RedactedLockedHint
            label={title}
            tooltipId={`estate-upgrade-${id}-title`}
          />
        }
      />
      <EstateStyleProgress value={0} segments={5} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <RedactedLockedHint
          label={description}
          tooltipId={`estate-upgrade-${id}-description`}
        />
      </div>
    </div>
  );
}

function CubeWhisperIcon({ hoverable = false }: { hoverable?: boolean }) {
  return (
    <span
      className={cn(
        "w-6 h-6 shrink-0 bg-neutral-900 border border-neutral-800 rounded-md flex items-center justify-center relative",
        hoverable &&
        "group-hover:bg-neutral-800 group-hover:border-neutral-500 transition-all",
      )}
    >
      <span className="text-md">▣</span>
      {hoverable ? (
        <span className="absolute inset-0 cube-dialog-glow opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none rounded" />
      ) : null}
    </span>
  );
}

function RedactedCubeEventRow({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <div
      className="flex items-center gap-2 w-full"
      data-testid={`estate-cube-${id}-redacted`}
    >
      <CubeWhisperIcon />
      <RedactedLockedHint
        label={title}
        tooltipId={`estate-cube-${id}-title`}
      />
    </div>
  );
}

export default function EstatePanel({
  active = true,
}: {
  active?: boolean;
}) {
  const { t } = useUiTranslation();
  const catalogActive = useDemoEndCatalogActive();
  const {
    events,
    relics,
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
  } = useGameStore(
    useShallow((s) => ({
      events: s.events,
      relics: s.relics,
      setEventDialog: s.setEventDialog,
      setIdleModeDialog: s.setIdleModeDialog,
      sleepUpgrades: s.sleepUpgrades,
      huntingSkills: s.huntingSkills,
      crowsEyeSkills: s.crowsEyeSkills,
      combatSkills: s.combatSkills,
      fellowship: s.fellowship,
      disgracedPriorSkills: s.disgracedPriorSkills,
      chainmasterSkills: s.chainmasterSkills,
      books: s.books,
      setHighlightedResources: s.setHighlightedResources,
      resources: s.resources,
      updateFocusState: s.updateFocusState,
      updateResource: s.updateResource,
    })),
  );
  const state = useGameStore.getState();
  // Calculate focus progress based on game loop timing
  const [focusProgress, setFocusProgress] = React.useState(0);
  const focusState = useGameStore((state) => state.focusState);
  const focusIcon = headerIndicatorIcon("focus");

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
        if (
          focusState?.isActive &&
          focusState.endTime <= now &&
          !isDemoPlayFrozen(useGameStore.getState())
        ) {
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

  // Keep Focus button mounted while active so Sleep upgrades don't jump up when points hit 0
  const showFocusButton =
    (focusState?.points ?? 0) > 0 ||
    Boolean(focusState?.isActive && focusState.endTime > Date.now());

  // Calculate Focus duration: 1 focus point = 1 minute of Focus time
  const calculateFocusDuration = (focusPoints: number) => {
    return focusPoints * 60 * 1000; // Convert focus points to milliseconds (1 point = 1 minute)
  };


  const cubeProgressState = { events, relics };
  const completedCubeEvents = DEMO_END_CUBE_EVENT_IDS.filter((eventId) =>
    isDemoEndCubeEventCompleted(cubeProgressState, eventId),
  ).map((eventId) => ({
    id: eventId,
    ...cubeEvents[eventId],
  }));
  const cubeRowsToShow = DEMO_END_CUBE_EVENT_IDS.filter(
    (eventId) =>
      catalogActive ||
      isDemoEndCubeEventCompleted(cubeProgressState, eventId),
  );

  const handleCubeClick = (event: (typeof completedCubeEvents)[0]) => {
    const logEntry = {
      ...buildLocalizedEventLogEntry(
        event.id,
        event,
        useGameStore.getState(),
      ),
      viewOnly: true,
    };
    setEventDialog(true, logEntry);
  };

  const totalCubeEventCount = DEMO_END_CUBE_EVENT_IDS.length;
  const halfCubeEventCount = Math.ceil(totalCubeEventCount / 2);
  const useTwoCubeColumns = cubeRowsToShow.length >= halfCubeEventCount;
  const cubeColumnSplitIndex = Math.ceil(cubeRowsToShow.length / 2);
  const firstColumnCubeEventIds = useTwoCubeColumns
    ? cubeRowsToShow.slice(0, cubeColumnSplitIndex)
    : cubeRowsToShow;
  const secondColumnCubeEventIds = useTwoCubeColumns
    ? cubeRowsToShow.slice(cubeColumnSplitIndex)
    : [];

  const renderCubeEventRow = (event: (typeof completedCubeEvents)[0]) => {
    const openCubeEvent = () => {
      useGameStore.getState().trackButtonClick(`cube-${event.id}`);
      handleCubeClick(event);
    };
    const cubeTitle =
      resolveEventTitle(event.id, event.title, state) ??
      (typeof event.title === "string" ? event.title : event.id);

    return (
      <button
        key={event.id}
        type="button"
        onClick={openCubeEvent}
        className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity cursor-pointer group"
      >
        <CubeWhisperIcon hoverable />
        <span className="text-xs text-foreground">{cubeTitle}</span>
      </button>
    );
  };

  const renderCubeCatalogRow = (eventId: string) => {
    const event = cubeEvents[eventId];
    if (isDemoEndCubeEventCompleted(cubeProgressState, eventId) && event) {
      return renderCubeEventRow({ id: eventId, ...event });
    }
    const title =
      resolveEventTitle(eventId, event?.title, state) ??
      (typeof event?.title === "string" ? event.title : eventId);
    return <RedactedCubeEventRow key={eventId} id={eventId} title={title} />;
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
  const canActivateIdle =
    !catalogActive && woodProduction > 0 && foodProduction > 0;

  const handleActivateIdleMode = async () => {
    if (isDemoPlayFrozen(useGameStore.getState())) return;
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
    await saveGame(currentState, false);

    setIdleModeDialog(true);
  };

  // Generic upgrade handler
  const handleUpgrade = (
    upgradeType: "length" | "intensity",
    upgrades: typeof SLEEP_LENGTH_UPGRADES | typeof SLEEP_INTENSITY_UPGRADES,
    levelKey: "lengthLevel" | "intensityLevel",
  ) => {
    if (isDemoPlayFrozen(useGameStore.getState())) return;
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
    if (isDemoPlayFrozen(useGameStore.getState())) return;
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
    if (isDemoPlayFrozen(useGameStore.getState())) return;
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
      (s) => s.combatSkills.crushingStrikeLevel ?? 0,
      (s, level) => ({ combatSkills: { ...s.combatSkills, crushingStrikeLevel: level } }),
    );

  const handleBloodflameSphereUpgrade = () =>
    handleSkillUpgrade(
      BLOODFLAME_SPHERE_UPGRADES,
      (s) => s.combatSkills.bloodflameSphereLevel ?? 0,
      (s, level) => ({ combatSkills: { ...s.combatSkills, bloodflameSphereLevel: level } }),
    );

  const handleFeralHowlUpgrade = () =>
    handleSkillUpgrade(
      FERAL_HOWL_UPGRADES,
      (s) => s.combatSkills.feralHowlLevel ?? 0,
      (s, level) => ({ combatSkills: { ...s.combatSkills, feralHowlLevel: level } }),
    );

  const blackEstateBonusHours = (state.buildings.blackEstate || 0) * 3;
  const blackEstateBonusIntensity = (state.buildings.blackEstate || 0) * 5;

  const currentLengthUpgrade = SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel];
  const nextLengthUpgrade =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel + 1];
  const canUpgradeLength =
    !catalogActive &&
    sleepUpgrades.lengthLevel < MAX_SLEEP_LENGTH_LEVEL &&
    resources.gold >= (nextLengthUpgrade?.cost || 0);
  const openShopForLength = useEstateGoldShopClick(canUpgradeLength);

  const currentIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel];
  const nextIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel + 1];
  const canUpgradeIntensity =
    !catalogActive &&
    sleepUpgrades.intensityLevel < MAX_SLEEP_INTENSITY_LEVEL &&
    resources.gold >= (nextIntensityUpgrade?.cost || 0);
  const openShopForIntensity = useEstateGoldShopClick(canUpgradeIntensity);

  return (
    <ScrollArea className="h-full w-full">
      <div className="w-full space-y-2 pt-2 md:pt-0 mt-0 md:mt-2 mb-2 pr-2 pb-2">
        {/* Sleep Mode Section */}
        <div className="space-y-">
          {/* Indicator-height band matches Produce rings so Sleep/Focus below don't jump */}
          <div className="pb-2">
            <div className="game-panel-header-indicator-row flex w-full items-center gap-2">
              <h3 className="inline-flex shrink-0 items-center text-xs font-medium text-foreground leading-none">
                {t("estate.rest")}
              </h3>
              {focusState?.isActive && focusState.endTime > Date.now() && (
                <TooltipWrapper
                  tooltip={
                    <div className="text-xs">
                      {focusTooltip.getContent(state)}
                    </div>
                  }
                  tooltipId="focus-progress"
                  disabled
                  tooltipTriggerClassName={
                    GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS
                  }
                  className={GAME_PANEL_HEADER_INDICATOR_CLASS}
                >
                  <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
                    <CircularProgress
                      value={focusProgress}
                      size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
                      fill
                      strokeWidth={2}
                      className="text-teal-400"
                    />
                    <span className={focusIcon.glyphClassName}>
                      {focusIcon.symbol}
                    </span>
                  </div>
                </TooltipWrapper>
              )}
            </div>
          </div>
          <TooltipWrapper
            tooltip={
              <div className="text-xs">
                {canActivateIdle ? (
                  <div>{t("estate.sleepTooltipReady")}</div>
                ) : (
                  <div>{t("estate.sleepTooltipBlocked")}</div>
                )}
                <div className="border-t border-border my-1" />
                <div className="whitespace-nowrap">
                  <div>{t("estate.sleepTooltipCurrentProduction")}</div>
                  <div>
                    {getResourceName("wood", "Wood")}:{" "}
                    {formatSignedNumber(Math.round(woodProduction))}
                  </div>
                  <div>
                    {getResourceName("food", "Food")}:{" "}
                    {formatSignedNumber(Math.round(foodProduction))}
                  </div>
                </div>
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
                className={gameActionOutlineButtonClassName(!canActivateIdle)}
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
                  if (isDemoPlayFrozen(useGameStore.getState())) return;
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
                className="focus-glow-hover"
                button_id="activate-focus"
                disabled={
                  catalogActive ||
                  !focusState?.points ||
                  focusState.points === 0 ||
                  focusState?.isActive
                }
                tooltip={
                  <div className="text-xs whitespace-nowrap">
                    <div>{t("estate.focusPointTooltip")}</div>
                    <div>
                      {t("estate.focusRewardTooltip", {
                        count: focusState?.points || 0,
                      })}
                    </div>
                  </div>
                }
              >
                {t("estate.focus")}
              </CooldownButton>
              {focusState && focusState.points > 0 && (
                <div
                  className="absolute -top-[9px] right-[-9px] flex items-center justify-center w-5 h-5 bg-teal-950 rounded-full text-[10px] font-medium z-[20] pointer-events-none"
                >
                  {focusState.points}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Smoke canvas must wrap only the upgrade bars. Wrapping the whole
              panel (Sleep + cube whispers) sized a WebGL framebuffer to the
              full scroll height and stalled the tab on first open. */}
        <SharedProgressShaderHost className="w-full" visible={active}>
          <div className="space-y-2">
            {/* Sleep Upgrades Section */}
            <div className="w-full space-y-1 pt-2">
              {/* Sleep Length Upgrade */}
              <div className="space-y-1">
                <EstateUpgradeRowHeader
                  title={t("estate.sleepLength")}
                  action={
                    sleepUpgrades.lengthLevel < MAX_SLEEP_LENGTH_LEVEL ? (
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
                        disabled={!canUpgradeLength && !openShopForLength}
                        onClick={openShopForLength}
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
                          onUnaffordableClick={openShopForLength}
                          button_id="upgrade-sleep-length"
                        />
                      </TooltipWrapper>
                    ) : null
                  }
                />
                <EstateStyleProgress
                  value={(sleepUpgrades.lengthLevel / MAX_SLEEP_LENGTH_LEVEL) * 100}
                  segments={MAX_SLEEP_LENGTH_LEVEL}
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
                <EstateUpgradeRowHeader
                  title={t("estate.sleepIntensity")}
                  action={
                    sleepUpgrades.intensityLevel < MAX_SLEEP_INTENSITY_LEVEL ? (
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
                        disabled={!canUpgradeIntensity && !openShopForIntensity}
                        onClick={openShopForIntensity}
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
                          onUnaffordableClick={openShopForIntensity}
                          button_id="upgrade-sleep-intensity"
                        />
                      </TooltipWrapper>
                    ) : null
                  }
                />
                <EstateStyleProgress
                  value={
                    (sleepUpgrades.intensityLevel / MAX_SLEEP_INTENSITY_LEVEL) * 100
                  }
                  segments={MAX_SLEEP_INTENSITY_LEVEL}
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
            {(catalogActive ||
              fellowship.ashwraith_huntress ||
              fellowship.restless_knight ||
              fellowship.elder_wizard ||
              fellowship.the_hound ||
              fellowship.one_eyed_crow ||
              fellowship.disgraced_prior ||
              books.book_of_chainmaster) && (
                <div className="space-y-1 pt-2">
                  <h3 className="text-xs font-medium text-foreground">
                    {catalogActive &&
                      !DEMO_END_ESTATE_SKILL_IDS.some((id) =>
                        isDemoEndEstateSkillUnlocked(state, id),
                      ) ? (
                      <RedactedLockedHint
                        label={t("estate.skills")}
                        tooltipId="estate-skills-header-redacted"
                      />
                    ) : (
                      t("estate.skills")
                    )}
                  </h3>

                  {/* Huntress Training */}
                  {fellowship.ashwraith_huntress ? (
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
                  ) : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="hunting"
                        title={t(ESTATE_SKILL_TITLE_KEYS.hunting)}
                      />
                    )
                  )}

                  {/* Crushing Strike */}
                  {fellowship.restless_knight ? (
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
                  ) : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="crushingStrike"
                        title={t(ESTATE_SKILL_TITLE_KEYS.crushingStrike)}
                      />
                    )
                  )}

                  {/* Bloodflame Sphere */}
                  {fellowship.elder_wizard ? (() => {
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
                  })() : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="bloodflameSphere"
                        title={t(ESTATE_SKILL_TITLE_KEYS.bloodflameSphere)}
                      />
                    )
                  )}

                  {/* Feral Howl */}
                  {fellowship.the_hound ? (() => {
                    const lvl = combatSkills.feralHowlLevel ?? 0;
                    const cur = FERAL_HOWL_UPGRADES[lvl];
                    const nxt = FERAL_HOWL_UPGRADES[lvl + 1];
                    return (
                      <SkillUpgradeRow
                        title={t("estate.feralHowl")}
                        level={lvl}
                        upgradeCost={nxt?.cost ?? 0}
                        canAfford={resources.gold >= (nxt?.cost ?? Infinity)}
                        tooltipId="upgrade-feral-howl-button"
                        buttonId="upgrade-feral-howl"
                        onUpgrade={handleFeralHowlUpgrade}
                        tooltipContent={<>
                          {nxt && nxt.successChance > cur.successChance && (
                            <div>{t("estate.skillSuccessChanceBonus", { amount: nxt.successChance - cur.successChance })}</div>
                          )}
                          {nxt && nxt.enemyDamageReduction > cur.enemyDamageReduction && (
                            <div>{t("estate.skillEnemyDamageReduction", { amount: nxt.enemyDamageReduction - cur.enemyDamageReduction })}</div>
                          )}
                          {nxt && nxt.debuffRounds > cur.debuffRounds && (() => {
                            const d = nxt.debuffRounds - cur.debuffRounds;
                            return (
                              <div>{t("estate.skillDebuffRound", { count: d, amount: d })}</div>
                            );
                          })()}
                          {nxt && nxt.critDamageBonus > cur.critDamageBonus && (
                            <div>{t("estate.skillCritDamageBonus", { amount: nxt.critDamageBonus - cur.critDamageBonus })}</div>
                          )}
                        </>}
                        description={t(
                          cur.debuffRounds === 1
                            ? "estate.feralHowlSummary_one"
                            : "estate.feralHowlSummary",
                          {
                            success: cur.successChance,
                            reduction: cur.enemyDamageReduction,
                            rounds: cur.debuffRounds,
                            crit: cur.critDamageBonus,
                          },
                        )}
                      />
                    );
                  })() : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="feralHowl"
                        title={t(ESTATE_SKILL_TITLE_KEYS.feralHowl)}
                      />
                    )
                  )}

                  {/* Crow's Eye */}
                  {fellowship.one_eyed_crow ? (() => {
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
                  })() : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="crowsEye"
                        title={t(ESTATE_SKILL_TITLE_KEYS.crowsEye)}
                      />
                    )
                  )}

                  {/* Tireless Worker (Disgraced Prior) */}
                  {fellowship.disgraced_prior ? (() => {
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
                        title={t("estate.tirelessWorker")}
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
                  })() : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="disgracedPrior"
                        title={t(ESTATE_SKILL_TITLE_KEYS.disgracedPrior)}
                      />
                    )
                  )}

                  {/* Chainmaster */}
                  {books.book_of_chainmaster ? (() => {
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
                  })() : (
                    catalogActive && (
                      <RedactedEstateUpgradeRow
                        id="chainmaster"
                        title={t(ESTATE_SKILL_TITLE_KEYS.chainmaster)}
                      />
                    )
                  )}
                </div>
              )}
          </div>
        </SharedProgressShaderHost>

        {/* Cube Section — unlocked whispers, plus redacted catalog at demo end */}
        {(catalogActive || completedCubeEvents.length > 0) && (
          <div className="w-full space-y-2 pt-1 pb-4">
            <h3 className="text-xs font-medium text-foreground">
              {catalogActive && completedCubeEvents.length === 0 ? (
                <RedactedLockedHint
                  label={t("estate.cubeWhispers")}
                  tooltipId="estate-cube-header-redacted"
                />
              ) : (
                t("estate.cubeWhispers")
              )}
            </h3>

            <div
              className={cn(
                "w-full",
                useTwoCubeColumns ? "flex gap-3" : "flex flex-col gap-2",
              )}
            >
              <div className="flex flex-col gap-2 min-w-0 flex-1">
                {firstColumnCubeEventIds.map(renderCubeCatalogRow)}
              </div>
              {useTwoCubeColumns && (
                <>
                  <div className="w-px shrink-0 bg-border self-stretch" />
                  <div className="flex flex-col gap-2 min-w-0 flex-1">
                    {secondColumnCubeEventIds.map(renderCubeCatalogRow)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}