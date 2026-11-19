import { useEffect, useState } from "react";
import { CircularProgress } from "@/components/ui/circular-progress";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { ActionTooltipSeparator } from "@/game/rules/actionTooltipLayout";
import {
  TOOLTIP_MUTED_CLASS,
  TOOLTIP_STACK_CLASS,
  TOOLTIP_TITLE_CLASS,
} from "@/game/tooltipMetrics";
import {
  GAME_PANEL_HEADER_INDICATOR_CLASS,
  GAME_PANEL_HEADER_INDICATOR_INNER_CLASS,
  GAME_PANEL_HEADER_INDICATOR_SIZE_PX,
  GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS,
} from "@/components/game/gameChrome";
import { useGameStore } from "@/game/state";
import {
  getHeartfireElapsedMs,
  HEARTFIRE_LEVEL_DURATION_MS,
} from "@/game/heartfireClock";
import { BRIMSTONE_FLUX_DURATION_MS } from "@/game/rules/eventsBrimstoneFlux";
import { STARING_DEER_DURATION_MS } from "@/game/rules/eventsStaringDeer";
import { getForestFearDurationMs } from "@/game/rules/eventsForestFear";
import { getSolsticeDurationMs } from "@/game/rules/eventsSolsticeGathering";
import {
  getStrangerApproachProbability,
  getTotalMadness,
} from "@/game/rules/effectsCalculation";
import {
  badDreamsTooltip,
  brimstoneFluxTooltip,
  curseTooltip,
  disgustTooltip,
  feastTooltip,
  fogTooltip,
  focusTooltip,
  forestFearTooltip,
  frostfallTooltip,
  heartfireTooltip,
  madnessProductionTooltip,
  miningBoostTooltip,
  solsticeTooltip,
  staringDeerTooltip,
} from "@/game/rules/tooltips";
import {
  curseLikeDurationMs,
  cruelModeScale,
  disgustDurationMs,
  riddleFogDurationMs,
} from "@/game/cruelMode";
import {
  headerIndicatorIcon,
  heartfireIndicatorIcon,
} from "@/game/headerIndicatorIcons";
import { isDemoPlayFrozen } from "@/game/demoLimit";
import { GREAT_FEAST_DURATION_MS } from "@shared/shopItems";
import { useNewItemPulseTooltips } from "@/hooks/useNewItemPulseTooltip";
import { useUiTranslation } from "@/i18n/useUiTranslation";

const HEADER_STATUS_INDICATOR_TOOLTIP_IDS = [
  "production-cycle-progress",
  "feast-progress",
  "solstice-progress",
  "curse-progress",
  "disgust-progress",
  "mining-boost-progress",
  "brimstone-flux-progress",
  "heartfire-progress",
  "frostfall-progress",
  "fog-progress",
  "staring-deer-progress",
  "forest-fear-progress",
  "madness-production",
  "focus-progress",
  "bad-dreams-progress",
] as const;

function HeaderIndicatorGlyph({ id }: { id: string }) {
  const icon = headerIndicatorIcon(id);
  return <span className={icon.glyphClassName}>{icon.symbol}</span>;
}

function HeartfireIndicatorGlyph({ level }: { level: number }) {
  const icon = heartfireIndicatorIcon(level);
  if (!icon) return null;
  return <span className={icon.glyphClassName}>{icon.symbol}</span>;
}

function ProductionCycleIndicator({
  pulseClassName,
  onMouseEnter,
  onMouseLeave,
}: {
  pulseClassName: (tooltipId: string, className?: string) => string;
  onMouseEnter: (tooltipId: string) => void;
  onMouseLeave: (tooltipId: string) => void;
}) {
  const { t } = useUiTranslation();
  const loopProgress = useGameStore((state) => state.loopProgress);
  const productionSecondsRemaining = Math.max(
    0,
    Math.ceil(((100 - loopProgress) / 100) * 15),
  );
  return (
    <TooltipWrapper
      tooltip={(() => {
        const state =
          useGameStore.getState() as unknown as import("@shared/schema").GameState;
        const {
          rawChance,
          lowPopulationBonus,
          fromBuildings,
          fromBlessings,
          fromEvents,
          fromGreatFeast,
          fromHeartfire,
          fromAchievements,
        } = getStrangerApproachProbability(state);
        const chancePct = Math.round(rawChance * 100);
        return (
          <div className={TOOLTIP_STACK_CLASS}>
            <div className={TOOLTIP_TITLE_CLASS}>{t("village.cycle")}</div>
            <div>
              {t("village.nextCycleIn", {
                seconds: productionSecondsRemaining,
              })}
            </div>
            <ActionTooltipSeparator />
            <div>
              {t("village.newVillagerChance", {
                percent: chancePct,
              })}
            </div>
            {lowPopulationBonus > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.lowPopulationBonus", {
                  percent: Math.round(lowPopulationBonus * 100),
                })}
              </div>
            )}
            {fromBuildings > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromBuildings", {
                  percent: Math.round(fromBuildings * 100),
                })}
              </div>
            )}
            {fromBlessings > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromBlessings", {
                  percent: Math.round(fromBlessings * 100),
                })}
              </div>
            )}
            {fromEvents > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromEvents", {
                  percent: Math.round(fromEvents * 100),
                })}
              </div>
            )}
            {fromGreatFeast > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromGreatFeast", {
                  percent: Math.round(fromGreatFeast * 100),
                })}
              </div>
            )}
            {fromHeartfire > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromHeartfire", {
                  percent: Math.round(fromHeartfire * 100),
                })}
              </div>
            )}
            {fromAchievements > 0 && (
              <div className={TOOLTIP_MUTED_CLASS}>
                {t("village.fromAchievements", {
                  percent: Math.round(fromAchievements * 100),
                  defaultValue: "{{percent}}% from Achievements",
                })}
              </div>
            )}
            <ActionTooltipSeparator />
            <div className={TOOLTIP_MUTED_CLASS}>
              {t("village.cycleDescription")}
            </div>
          </div>
        );
      })()}
      tooltipId="production-cycle-progress"
      disabled
      tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
      className={pulseClassName(
        "production-cycle-progress",
        GAME_PANEL_HEADER_INDICATOR_CLASS,
      )}
      onMouseEnter={() => onMouseEnter("production-cycle-progress")}
      onMouseLeave={() => onMouseLeave("production-cycle-progress")}
    >
      <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
        <CircularProgress
          value={loopProgress}
          size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
          fill
          strokeWidth={2}
          className="text-gray-400"
        />
        <HeaderIndicatorGlyph id="cycle" />
      </div>
    </TooltipWrapper>
  );
}

export function GameHeaderStatusIndicators() {
  const { pulseClassName, onMouseEnter, onMouseLeave } =
    useNewItemPulseTooltips(HEADER_STATUS_INDICATOR_TOOLTIP_IDS);

  // Keep timed rings (heartfire, curse, …) moving with the game loop.
  useGameStore((s) => s.loopProgress);
  const hasVillagers = useGameStore((s) => Boolean(s.story?.seen?.hasVillagers));
  const feastState = useGameStore((s) => s.feastState);
  const greatFeastState = useGameStore((s) => s.greatFeastState);
  const solsticeState = useGameStore((s) => s.solsticeState);
  const curseState = useGameStore((s) => s.curseState);
  const disgustState = useGameStore((s) => s.disgustState);
  const miningBoostState = useGameStore((s) => s.miningBoostState);
  const brimstoneFluxState = useGameStore((s) => s.brimstoneFluxState);
  const frostfallState = useGameStore((s) => s.frostfallState);
  const staringDeerState = useGameStore((s) => s.staringDeerState);
  const forestFearState = useGameStore((s) => s.forestFearState);
  const fogState = useGameStore((s) => s.fogState);
  const heartfireState = useGameStore((s) => s.heartfireState);
  const focusState = useGameStore((s) => s.focusState);
  const badDreamsState = useGameStore((s) => s.badDreamsState);
  const focusIcon = headerIndicatorIcon("focus");
  const badDreamsIcon = headerIndicatorIcon("badDreams");

  const [feastProgress, setFeastProgress] = useState(0);
  const [solsticeProgress, setSolsticeProgress] = useState(0);
  const [focusProgress, setFocusProgress] = useState(0);
  const [badDreamsProgress, setBadDreamsProgress] = useState(0);

  useEffect(() => {
    const updateFeastProgress = () => {
      const now = Date.now();
      if (greatFeastState?.isActive && greatFeastState.endTime > now) {
        const greatFeastDuration =
          greatFeastState.durationMs || GREAT_FEAST_DURATION_MS;
        const greatFeastElapsed =
          greatFeastDuration - (greatFeastState.endTime - now);
        setFeastProgress((greatFeastElapsed / greatFeastDuration) * 100);
      } else if (feastState?.isActive && feastState.endTime > now) {
        const state = useGameStore.getState();
        const baseDuration = 10 * 60 * 1000;
        const btpBonus = state.BTP === 1 ? 5 * 60 * 1000 : 0;
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

  useEffect(() => {
    const updateSolsticeProgress = () => {
      const now = Date.now();
      if (solsticeState?.isActive && solsticeState.endTime > now) {
        const solsticeDuration = getSolsticeDurationMs(
          useGameStore.getState().BTP,
        );
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

  useEffect(() => {
    const updateFocusProgress = () => {
      const now = Date.now();
      if (focusState?.isActive && focusState.endTime > now) {
        const fromStored =
          typeof focusState.duration === "number" && focusState.duration > 0
            ? focusState.duration
            : null;
        const fromRange =
          focusState.startTime && focusState.endTime > focusState.startTime
            ? focusState.endTime - focusState.startTime
            : null;
        const focusDuration = fromStored ?? fromRange ?? 60_000;
        const focusElapsed = focusDuration - (focusState.endTime - now);
        setFocusProgress(
          Math.min(100, Math.max(0, (focusElapsed / focusDuration) * 100)),
        );
      } else {
        setFocusProgress(0);
        if (
          focusState?.isActive &&
          focusState.endTime <= now &&
          !isDemoPlayFrozen(useGameStore.getState())
        ) {
          useGameStore.setState({
            focusState: {
              isActive: false,
              endTime: 0,
              startTime: 0,
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

  useEffect(() => {
    const updateBadDreamsProgress = () => {
      const now = Date.now();
      if (badDreamsState?.isActive && badDreamsState.endTime > now) {
        const fromStored =
          typeof badDreamsState.duration === "number" &&
          badDreamsState.duration > 0
            ? badDreamsState.duration
            : null;
        const fromRange =
          badDreamsState.startTime &&
          badDreamsState.endTime > badDreamsState.startTime
            ? badDreamsState.endTime - badDreamsState.startTime
            : null;
        const duration = fromStored ?? fromRange ?? 10 * 60 * 1000;
        const elapsed = duration - (badDreamsState.endTime - now);
        setBadDreamsProgress(
          Math.min(100, Math.max(0, (elapsed / duration) * 100)),
        );
      } else {
        setBadDreamsProgress(0);
        if (
          badDreamsState?.isActive &&
          badDreamsState.endTime <= now &&
          !isDemoPlayFrozen(useGameStore.getState())
        ) {
          useGameStore.setState({
            badDreamsState: {
              isActive: false,
              endTime: 0,
              startTime: 0,
              duration: 0,
            },
          });
        }
      }
    };

    updateBadDreamsProgress();
    const interval = setInterval(updateBadDreamsProgress, 1000);
    return () => clearInterval(interval);
  }, [badDreamsState]);

  const now = Date.now();
  const state =
    useGameStore.getState() as unknown as import("@shared/schema").GameState;
  const isGreatFeast =
    Boolean(greatFeastState?.isActive) && (greatFeastState?.endTime ?? 0) > now;
  const isFeast =
    Boolean(feastState?.isActive) && (feastState?.endTime ?? 0) > now;
  const isCursed =
    Boolean(curseState?.isActive) && (curseState?.endTime ?? 0) > now;
  const isDisgusted =
    Boolean(disgustState?.isActive) && (disgustState?.endTime ?? 0) > now;
  const isMiningBoosted =
    Boolean(miningBoostState?.isActive) &&
    (miningBoostState?.endTime ?? 0) > now;
  const isBrimstoneFlux =
    Boolean(brimstoneFluxState?.isActive) &&
    (brimstoneFluxState?.endTime ?? 0) > now;
  const isFrostfall =
    Boolean(frostfallState?.isActive) && (frostfallState?.endTime ?? 0) > now;
  const isSolstice =
    Boolean(solsticeState?.isActive) && (solsticeState?.endTime ?? 0) > now;
  const isStaringDeer =
    Boolean(staringDeerState?.isActive) &&
    (staringDeerState?.endTime ?? 0) > now;
  const isForestFear =
    Boolean(forestFearState?.isActive) &&
    (forestFearState?.endTime ?? 0) > now;
  const isFog = Boolean(fogState?.isActive) && (fogState?.endTime ?? 0) > now;
  const isFocus =
    Boolean(focusState?.isActive) && (focusState?.endTime ?? 0) > now;
  const isBadDreams =
    Boolean(badDreamsState?.isActive) && (badDreamsState?.endTime ?? 0) > now;
  const heartfireLevel = heartfireState?.level ?? 0;
  const totalMadness = getTotalMadness(state);

  const hasAny =
    hasVillagers ||
    isGreatFeast ||
    isFeast ||
    isSolstice ||
    isCursed ||
    isDisgusted ||
    isMiningBoosted ||
    isBrimstoneFlux ||
    heartfireLevel > 0 ||
    isFrostfall ||
    isFog ||
    isStaringDeer ||
    isForestFear ||
    totalMadness >= 10 ||
    isFocus ||
    isBadDreams;

  if (!hasAny) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-start gap-x-2.5 gap-y-1.5 md:gap-x-3"
      data-testid="header-status-indicators"
    >
      {hasVillagers && (
        <ProductionCycleIndicator
          pulseClassName={pulseClassName}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      )}

      {heartfireLevel > 0 && heartfireState && (
        <TooltipWrapper
          tooltip={
            <div>{heartfireTooltip.getContent(state)}</div>
          }
          tooltipId="heartfire-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "heartfire-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("heartfire-progress")}
          onMouseLeave={() => onMouseLeave("heartfire-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={Math.min(
                100,
                (getHeartfireElapsedMs(heartfireState) /
                  HEARTFIRE_LEVEL_DURATION_MS) *
                  100,
              )}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-red-700"
            />
            <HeartfireIndicatorGlyph level={heartfireLevel} />
          </div>
        </TooltipWrapper>
      )}

      {(isGreatFeast || isFeast) && (
        <TooltipWrapper
          tooltip={
            <div>{feastTooltip.getContent(state)}</div>
          }
          tooltipId="feast-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "feast-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("feast-progress")}
          onMouseLeave={() => onMouseLeave("feast-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={feastProgress}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className={isGreatFeast ? "text-orange-600" : "text-yellow-600"}
            />
            <HeaderIndicatorGlyph id={isGreatFeast ? "greatFeast" : "feast"} />
          </div>
        </TooltipWrapper>
      )}

      {isSolstice && (
        <TooltipWrapper
          tooltip={
            <div>{solsticeTooltip.getContent(state)}</div>
          }
          tooltipId="solstice-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "solstice-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("solstice-progress")}
          onMouseLeave={() => onMouseLeave("solstice-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={solsticeProgress}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-orange-500"
            />
            <HeaderIndicatorGlyph id="solstice" />
          </div>
        </TooltipWrapper>
      )}

      {isCursed && curseState && (
        <TooltipWrapper
          tooltip={
            <div className="whitespace-pre-line">
              {curseTooltip.getContent(state)}
            </div>
          }
          tooltipId="curse-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "curse-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("curse-progress")}
          onMouseLeave={() => onMouseLeave("curse-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
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
                return Math.min(100, (elapsed / totalDuration) * 100);
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-purple-600"
            />
            <HeaderIndicatorGlyph id="curse" />
          </div>
        </TooltipWrapper>
      )}

      {isDisgusted && disgustState && (
        <TooltipWrapper
          tooltip={
            <div className="whitespace-pre-line">
              {disgustTooltip.getContent(state)}
            </div>
          }
          tooltipId="disgust-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "disgust-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("disgust-progress")}
          onMouseLeave={() => onMouseLeave("disgust-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const timeRemaining = Math.max(
                  0,
                  disgustState.endTime - Date.now(),
                );
                const totalDuration = disgustDurationMs(state.cruelMode);
                const elapsed = totalDuration - timeRemaining;
                return Math.min(100, (elapsed / totalDuration) * 100);
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-green-800"
            />
            <HeaderIndicatorGlyph id="disgust" />
          </div>
        </TooltipWrapper>
      )}

      {isMiningBoosted && miningBoostState && (
        <TooltipWrapper
          tooltip={
            <div className="whitespace-pre-line">
              {miningBoostTooltip.getContent(state)}
            </div>
          }
          tooltipId="mining-boost-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "mining-boost-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("mining-boost-progress")}
          onMouseLeave={() => onMouseLeave("mining-boost-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const boostDuration = 30 * 60 * 1000;
                const boostElapsed =
                  boostDuration - (miningBoostState.endTime - Date.now());
                return (boostElapsed / boostDuration) * 100;
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-amber-600"
            />
            <HeaderIndicatorGlyph id="mining" />
          </div>
        </TooltipWrapper>
      )}

      {isBrimstoneFlux && brimstoneFluxState && (
        <TooltipWrapper
          tooltip={
            <div className="whitespace-pre-line">
              {brimstoneFluxTooltip.getContent(state)}
            </div>
          }
          tooltipId="brimstone-flux-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "brimstone-flux-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("brimstone-flux-progress")}
          onMouseLeave={() => onMouseLeave("brimstone-flux-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const fluxElapsed =
                  BRIMSTONE_FLUX_DURATION_MS -
                  (brimstoneFluxState.endTime - Date.now());
                return (fluxElapsed / BRIMSTONE_FLUX_DURATION_MS) * 100;
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-yellow-500"
            />
            <HeaderIndicatorGlyph id="brimstone" />
          </div>
        </TooltipWrapper>
      )}

      {isFrostfall && frostfallState && (
        <TooltipWrapper
          tooltip={
            <div>{frostfallTooltip.getContent(state)}</div>
          }
          tooltipId="frostfall-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "frostfall-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("frostfall-progress")}
          onMouseLeave={() => onMouseLeave("frostfall-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const frostfallDuration = curseLikeDurationMs(
                  cruelModeScale(state),
                );
                const timeRemaining = Math.max(
                  0,
                  frostfallState.endTime - Date.now(),
                );
                const elapsed = frostfallDuration - timeRemaining;
                return Math.min(100, (elapsed / frostfallDuration) * 100);
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-blue-600"
            />
            <HeaderIndicatorGlyph id="frostfall" />
          </div>
        </TooltipWrapper>
      )}

      {isFog && fogState && (
        <TooltipWrapper
          tooltip={
            <div>{fogTooltip.getContent(state)}</div>
          }
          tooltipId="fog-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "fog-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("fog-progress")}
          onMouseLeave={() => onMouseLeave("fog-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const fogDuration = riddleFogDurationMs(cruelModeScale(state));
                const timeRemaining = Math.max(
                  0,
                  fogState.endTime - Date.now(),
                );
                const elapsed = fogDuration - timeRemaining;
                return Math.min(100, (elapsed / fogDuration) * 100);
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-gray-500"
            />
            <HeaderIndicatorGlyph id="fog" />
          </div>
        </TooltipWrapper>
      )}

      {isStaringDeer && staringDeerState && (
        <TooltipWrapper
          tooltip={
            <div>
              {staringDeerTooltip.getContent(state)}
            </div>
          }
          tooltipId="staring-deer-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "staring-deer-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("staring-deer-progress")}
          onMouseLeave={() => onMouseLeave("staring-deer-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const timeRemaining = Math.max(
                  0,
                  staringDeerState.endTime - Date.now(),
                );
                const elapsed = STARING_DEER_DURATION_MS - timeRemaining;
                return Math.min(
                  100,
                  (elapsed / STARING_DEER_DURATION_MS) * 100,
                );
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-green-800"
            />
            <HeaderIndicatorGlyph id="deer" />
          </div>
        </TooltipWrapper>
      )}

      {isForestFear && forestFearState && (
        <TooltipWrapper
          tooltip={
            <div>
              {forestFearTooltip.getContent(state)}
            </div>
          }
          tooltipId="forest-fear-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "forest-fear-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("forest-fear-progress")}
          onMouseLeave={() => onMouseLeave("forest-fear-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={(() => {
                const timeRemaining = Math.max(
                  0,
                  forestFearState.endTime - Date.now(),
                );
                const forestFearDuration = getForestFearDurationMs(state.BTP);
                const elapsed = forestFearDuration - timeRemaining;
                return Math.min(100, (elapsed / forestFearDuration) * 100);
              })()}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-red-800"
            />
            <HeaderIndicatorGlyph id="fear" />
          </div>
        </TooltipWrapper>
      )}

      {totalMadness >= 10 && (
        <TooltipWrapper
          tooltip={
            <div>
              {madnessProductionTooltip.getContent(state)}
            </div>
          }
          tooltipId="madness-production"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "madness-production",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("madness-production")}
          onMouseLeave={() => onMouseLeave("madness-production")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={100}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-violet-600"
            />
            <HeaderIndicatorGlyph id="madness" />
          </div>
        </TooltipWrapper>
      )}

      {isBadDreams && (
        <TooltipWrapper
          tooltip={
            <div>{badDreamsTooltip.getContent(state)}</div>
          }
          tooltipId="bad-dreams-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "bad-dreams-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("bad-dreams-progress")}
          onMouseLeave={() => onMouseLeave("bad-dreams-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={badDreamsProgress}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-red-500"
            />
            <span className={badDreamsIcon.glyphClassName}>
              {badDreamsIcon.symbol}
            </span>
          </div>
        </TooltipWrapper>
      )}

      {/* Focus always last among header status rings. */}
      {isFocus && (
        <TooltipWrapper
          tooltip={
            <div>{focusTooltip.getContent(state)}</div>
          }
          tooltipId="focus-progress"
          disabled
          tooltipTriggerClassName={GAME_PANEL_HEADER_INDICATOR_TRIGGER_CLASS}
          className={pulseClassName(
            "focus-progress",
            GAME_PANEL_HEADER_INDICATOR_CLASS,
          )}
          onMouseEnter={() => onMouseEnter("focus-progress")}
          onMouseLeave={() => onMouseLeave("focus-progress")}
        >
          <div className={GAME_PANEL_HEADER_INDICATOR_INNER_CLASS}>
            <CircularProgress
              value={focusProgress}
              size={GAME_PANEL_HEADER_INDICATOR_SIZE_PX}
              fill
              strokeWidth={2}
              className="text-teal-400"
            />
            <span className={focusIcon.glyphClassName}>{focusIcon.symbol}</span>
          </div>
        </TooltipWrapper>
      )}
    </div>
  );
}
