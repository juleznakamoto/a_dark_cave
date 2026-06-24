import type { GameState } from "@shared/schema";

export type VillageEffectThemeId =
  | "feast"
  | "solstice"
  | "curse"
  | "disgust"
  | "miningBoost"
  | "frostfall"
  | "fog";

export interface VillageEffectTheme {
  id: VillageEffectThemeId;
  symbol: string;
  border: string;
  iconRing: string;
  glowRgb: string;
  /** Centered Noto symbol styling — optical nudge per glyph (matches header indicators). */
  iconClassName: string;
}

export const VILLAGE_EFFECT_THEMES: Record<
  VillageEffectThemeId,
  VillageEffectTheme
> = {
  feast: {
    id: "feast",
    symbol: "⟡",
    border: "border-yellow-600",
    iconRing: "border-yellow-500/45 bg-yellow-950/35",
    glowRgb: "202, 138, 4",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-yellow-600 leading-none translate-y-0.5",
  },
  solstice: {
    id: "solstice",
    symbol: "☼",
    border: "border-orange-500",
    iconRing: "border-orange-500/45 bg-orange-950/35",
    glowRgb: "249, 115, 22",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-3xl text-orange-500 leading-none translate-y-1",
  },
  curse: {
    id: "curse",
    symbol: "✶",
    border: "border-purple-600",
    iconRing: "border-purple-500/45 bg-purple-950/35",
    glowRgb: "147, 51, 234",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-purple-600 leading-none",
  },
  disgust: {
    id: "disgust",
    symbol: "❢",
    border: "border-green-800",
    iconRing: "border-green-700/45 bg-green-950/35",
    glowRgb: "22, 101, 52",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-green-800 leading-none translate-y-1 font-normal",
  },
  miningBoost: {
    id: "miningBoost",
    symbol: "⛰",
    border: "border-amber-600",
    iconRing: "border-amber-500/45 bg-amber-950/35",
    glowRgb: "217, 119, 6",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-3xl text-amber-600 leading-none",
  },
  frostfall: {
    id: "frostfall",
    symbol: "✼",
    border: "border-blue-600",
    iconRing: "border-blue-500/45 bg-blue-950/35",
    glowRgb: "37, 99, 235",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-blue-600 leading-none translate-y-0.5",
  },
  fog: {
    id: "fog",
    symbol: "≋",
    border: "border-gray-500",
    iconRing: "border-gray-500/45 bg-gray-950/35",
    glowRgb: "107, 114, 128",
    iconClassName:
      "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-gray-500 leading-none translate-y-0.5",
  },
};

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

  const baseId = stripEventRulesId(eventId);
  if (baseId.startsWith("feast")) {
    return "feast";
  }

  return EVENT_ID_THEMES[baseId] ?? null;
}

export function getVillageEffectTheme(
  themeId: VillageEffectThemeId,
): VillageEffectTheme {
  return VILLAGE_EFFECT_THEMES[themeId];
}

export interface VillageEffectDialogData {
  themeId: VillageEffectThemeId;
  title: string;
  message: string;
}
