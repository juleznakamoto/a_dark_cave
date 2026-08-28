import type { GameState } from "@shared/schema";

/** Keep this file free of `headerIndicatorIcons` value imports so class tweaks HMR. */
export type VillageEffectThemeId =
  | "feast"
  | "solstice"
  | "curse"
  | "disgust"
  | "miningBoost"
  | "brimstoneFlux"
  | "frostfall"
  | "fog"
  | "staringDeer"
  | "forestFear";

type TimedEffectSlice = { isActive?: boolean; endTime?: number } | null | undefined;

function isTimedEffectActivated(change: TimedEffectSlice): boolean {
  return Boolean(change?.isActive && (change.endTime ?? 0) > 0);
}

function isDisgustStacked(
  prev: GameState["disgustState"],
  next: GameState["disgustState"] | undefined,
): boolean {
  if (!next?.isActive) return false;
  if (!prev?.isActive) return true;
  return (next.endTime ?? 0) > (prev.endTime ?? 0);
}

function stripEventRulesId(eventId: string): string {
  return eventId.split("-")[0] ?? eventId;
}

const EVENT_ID_THEMES: Record<string, VillageEffectThemeId> = {
  solsticeGathering: "solstice",
  witchsCurse: "curse",
  frostfall: "frostfall",
  unnamedWanderer: "miningBoost",
  brimstoneFlux1: "brimstoneFlux",
  brimstoneFlux2: "brimstoneFlux",
  brimstoneFlux3: "brimstoneFlux",
  staringDeer: "staringDeer",
  forestFear: "forestFear",
};

/** Maps event outcome state updates + catalog id to a village produce-header effect theme. */
export function resolveVillageEffectAnnouncementTheme(
  eventId: string,
  changes: Record<string, unknown>,
  prevState?: Pick<GameState, "disgustState">,
): VillageEffectThemeId | null {
  if (isTimedEffectActivated(changes.feastState as TimedEffectSlice)) {
    return "feast";
  }
  if (isTimedEffectActivated(changes.solsticeState as TimedEffectSlice)) {
    return "solstice";
  }
  if (isTimedEffectActivated(changes.curseState as TimedEffectSlice)) {
    return "curse";
  }
  if (isTimedEffectActivated(changes.frostfallState as TimedEffectSlice)) {
    return "frostfall";
  }
  if (isTimedEffectActivated(changes.miningBoostState as TimedEffectSlice)) {
    return "miningBoost";
  }
  if (isTimedEffectActivated(changes.brimstoneFluxState as TimedEffectSlice)) {
    return "brimstoneFlux";
  }
  if (
    isDisgustStacked(
      prevState?.disgustState ?? null,
      changes.disgustState as GameState["disgustState"],
    )
  ) {
    return "disgust";
  }
  if (isTimedEffectActivated(changes.fogState as TimedEffectSlice)) {
    return "fog";
  }
  if (isTimedEffectActivated(changes.staringDeerState as TimedEffectSlice)) {
    return "staringDeer";
  }
  if (isTimedEffectActivated(changes.forestFearState as TimedEffectSlice)) {
    return "forestFear";
  }

  const baseId = stripEventRulesId(eventId);
  if (baseId.startsWith("feast")) {
    return "feast";
  }

  return EVENT_ID_THEMES[baseId] ?? null;
}

export interface VillageEffectDialogData {
  themeId: VillageEffectThemeId;
  title: string;
  message: string;
}
