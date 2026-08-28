import {
  GAME_PANEL_HEADER_INDICATOR_GLYPH_CLASS as G,
  GAME_PANEL_HEADER_INDICATOR_GLYPH_LAYOUT_CLASS as GLYPH,
} from "@/components/game/gameChrome";
import { cn } from "@/lib/utils";

export type HeaderIndicatorIcon = {
  id: string;
  label: string;
  ringClassName: string;
  glyphClassName: string;
  symbol: string;
};

/** Village Produce + Estate Focus header rings. Optical nudges live on glyphClassName. */
export const HEADER_INDICATOR_ICONS: HeaderIndicatorIcon[] = [
  {
    id: "cycle",
    label: "Cycle",
    ringClassName: "text-gray-400",
    glyphClassName: `${G} game-panel-header-indicator-glyph--sm leading-none translate-x-[0.05em] translate-y-[0.1em] text-gray-400`,
    symbol: "\u21A6",
  },
  {
    id: "feast",
    label: "Feast",
    ringClassName: "text-yellow-600",
    glyphClassName: `${G} text-yellow-600 translate-y-[0.06em]`,
    symbol: "\u27E1",
  },
  {
    id: "greatFeast",
    label: "Great Feast",
    ringClassName: "text-orange-600",
    glyphClassName: `${G} text-orange-600 translate-y-[0.13em]`,
    symbol: "\u2726",
  },
  {
    id: "solstice",
    label: "Solstice",
    ringClassName: "text-orange-500",
    glyphClassName: `${G} game-panel-header-indicator-glyph--sm text-orange-500 translate-y-[0.17em]`,
    symbol: "\u263C",
  },
  {
    id: "curse",
    label: "Curse",
    ringClassName: "text-purple-600",
    glyphClassName: `${G} text-purple-600 translate-y-[0.145em]`,
    symbol: "\u2736",
  },
  {
    id: "disgust",
    label: "Disgust",
    ringClassName: "text-green-800",
    glyphClassName: `${G} font-normal text-green-800 translate-y-[0.15em]`,
    symbol: "\u2762",
  },
  {
    id: "mining",
    label: "Mining",
    ringClassName: "text-amber-600",
    glyphClassName: `${G} game-panel-header-indicator-glyph--xs text-amber-600 translate-y-[0.07em]`,
    symbol: "\u26F0",
  },
  {
    id: "brimstone",
    label: "Brimstone",
    ringClassName: "text-yellow-500",
    glyphClassName: `${G} game-panel-header-indicator-glyph--xs text-yellow-500 translate-y-[0.135em]`,
    symbol: "\u{1F79C}",
  },
  {
    id: "frostfall",
    label: "Frostfall",
    ringClassName: "text-blue-600",
    glyphClassName: `${G} text-blue-600 translate-y-[0.1em]`,
    symbol: "\u273C",
  },
  {
    id: "fog",
    label: "Fog",
    ringClassName: "text-gray-500",
    glyphClassName: `${G} leading-none text-gray-500 translate-y-[0.07em]`,
    symbol: "\u224B",
  },
  {
    id: "deer",
    label: "Deer",
    ringClassName: "text-green-800",
    glyphClassName: `${G} text-green-800 translate-y-[0.08em]`,
    symbol: "\u2BCF",
  },
  {
    id: "fear",
    label: "Fear",
    ringClassName: "text-red-800",
    glyphClassName: `${G} text-red-800 translate-y-[0.1em]`,
    symbol: "\u2BF8",
  },
  {
    id: "madness",
    label: "Madness",
    ringClassName: "text-violet-600",
    glyphClassName: `${G} leading-none text-violet-600 translate-y-[0.1em]`,
    symbol: "\u273A",
  },
  {
    id: "focus",
    label: "Focus",
    ringClassName: "text-teal-400",
    glyphClassName: `${G} game-panel-header-indicator-glyph--sm text-teal-400 translate-y-[0.16em]`,
    symbol: "\u2629",
  },
];

/** Heartfire levels 1–5. Same shape as HEADER_INDICATOR_ICONS. */
export const HEARTFIRE_INDICATOR_ICONS: HeaderIndicatorIcon[] = [
  {
    id: "heartfire1",
    label: "Heartfire 1",
    ringClassName: "text-red-700",
    glyphClassName: cn(
      GLYPH,
      "text-red-700 text-[16px] font-normal translate-y-[0.13em]",
    ),
    symbol: "\u00B7",
  },
  {
    id: "heartfire2",
    label: "Heartfire 2",
    ringClassName: "text-red-700",
    glyphClassName: cn(
      GLYPH,
      "text-red-700 text-[12px] font-extrabold translate-y-[0.06em]",
    ),
    symbol: ":",
  },
  {
    id: "heartfire3",
    label: "Heartfire 3",
    ringClassName: "text-red-700",
    glyphClassName: cn(
      GLYPH,
      "text-red-700 text-[14px] font-black translate-y-[0.03em]",
    ),
    symbol: "\u2234",
  },
  {
    id: "heartfire4",
    label: "Heartfire 4",
    ringClassName: "text-red-700",
    glyphClassName: cn(
      GLYPH,
      "text-red-700 text-[12px] font-black translate-y-[0.14em]",
    ),
    symbol: "\u2058",
  },
  {
    id: "heartfire5",
    label: "Heartfire 5",
    ringClassName: "text-red-700",
    glyphClassName: cn(GLYPH, "text-red-700 text-[10px] font-black translate-y-[0.16em]"),
    symbol: "\u2059",
  },
];

const HEADER_BY_ID = new Map(
  HEADER_INDICATOR_ICONS.map((icon) => [icon.id, icon]),
);

export function headerIndicatorIcon(id: string): HeaderIndicatorIcon {
  const icon = HEADER_BY_ID.get(id);
  if (!icon) {
    throw new Error(`Unknown header indicator icon: ${id}`);
  }
  return icon;
}

export function heartfireIndicatorIcon(
  level: number,
): HeaderIndicatorIcon | undefined {
  return HEARTFIRE_INDICATOR_ICONS[level - 1];
}

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

export type DialogIndicatorIcon = {
  id: VillageEffectThemeId;
  label: string;
  border: string;
  iconRing: string;
  glowRgb: string;
  glyphClassName: string;
  symbol: string;
};

/** OutcomeDialog village-effect rings. Symbol comes from the matching header icon. */
const DG =
  "font-noto-symbols-2 inline-flex items-center justify-center leading-none";

export const DIALOG_INDICATOR_ICONS: DialogIndicatorIcon[] = [
  {
    id: "feast",
    label: "Feast",
    border: "border-yellow-600",
    iconRing: "border-yellow-500/45 bg-yellow-950/35",
    glowRgb: "202, 138, 4",
    glyphClassName: `${DG} text-4xl text-yellow-500 translate-y-[0.06em]`,
    symbol: headerIndicatorIcon("feast").symbol,
  },
  {
    id: "solstice",
    label: "Solstice",
    border: "border-orange-500",
    iconRing: "border-orange-500/45 bg-orange-950/35",
    glowRgb: "249, 115, 22",
    glyphClassName: `${DG} text-3xl text-orange-500 translate-y-[0.155em]`,
    symbol: headerIndicatorIcon("solstice").symbol,
  },
  {
    id: "curse",
    label: "Curse",
    border: "border-purple-500",
    iconRing: "border-purple-500/45 bg-purple-950/35",
    glowRgb: "147, 51, 234",
    glyphClassName: `${DG} text-4xl text-purple-500 translate-y-[0.11em]`,
    symbol: headerIndicatorIcon("curse").symbol,
  },
  {
    id: "disgust",
    label: "Disgust",
    border: "border-green-600",
    iconRing: "border-green-600/60 bg-green-950/35",
    glowRgb: "22, 101, 52",
    glyphClassName: `${DG} text-4xl text-green-600 translate-y-[0.15em] font-normal`,
    symbol: headerIndicatorIcon("disgust").symbol,
  },
  {
    id: "miningBoost",
    label: "Mining",
    border: "border-amber-500",
    iconRing: "border-amber-500/60 bg-amber-950/35",
    glowRgb: "217, 119, 6",
    glyphClassName: `${DG} text-3xl text-amber-500 translate-y-[0.1em]`,
    symbol: headerIndicatorIcon("mining").symbol,
  },
  {
    id: "brimstoneFlux",
    label: "Brimstone",
    border: "border-yellow-500",
    iconRing: "border-yellow-500/45 bg-yellow-950/35",
    glowRgb: "234, 179, 8",
    glyphClassName: `${DG} text-3xl text-yellow-500 translate-y-[0.15em]`,
    symbol: headerIndicatorIcon("brimstone").symbol,
  },
  {
    id: "frostfall",
    label: "Frostfall",
    border: "border-blue-500",
    iconRing: "border-blue-500/60 bg-blue-950/35",
    glowRgb: "37, 99, 235",
    glyphClassName: `${DG} text-4xl text-blue-500 translate-y-[0.1em]`,
    symbol: headerIndicatorIcon("frostfall").symbol,
  },
  {
    id: "fog",
    label: "Fog",
    border: "border-gray-500",
    iconRing: "border-gray-500/60 bg-gray-950/35",
    glowRgb: "107, 114, 128",
    glyphClassName: `${DG} text-4xl text-gray-500 translate-y-[0.06em]`,
    symbol: headerIndicatorIcon("fog").symbol,
  },
  {
    id: "staringDeer",
    label: "Deer",
    border: "border-green-700",
    iconRing: "border-green-700/60 bg-green-950/35",
    glowRgb: "22, 101, 52",
    glyphClassName: `${DG} text-4xl text-green-700 translate-y-[0.08em]`,
    symbol: headerIndicatorIcon("deer").symbol,
  },
  {
    id: "forestFear",
    label: "Fear",
    border: "border-red-700",
    iconRing: "border-red-700/60 bg-red-950/35",
    glowRgb: "153, 27, 27",
    glyphClassName: `${DG} text-4xl text-red-700 translate-y-[0.1em]`,
    symbol: headerIndicatorIcon("fear").symbol,
  },
];

export type VillageEffectTheme = {
  id: VillageEffectThemeId;
  symbol: string;
  border: string;
  iconRing: string;
  glowRgb: string;
  iconClassName: string;
};

export const VILLAGE_EFFECT_THEMES: Record<
  VillageEffectThemeId,
  VillageEffectTheme
> = Object.fromEntries(
  DIALOG_INDICATOR_ICONS.map((icon) => [
    icon.id,
    {
      id: icon.id,
      symbol: icon.symbol,
      border: icon.border,
      iconRing: icon.iconRing,
      glowRgb: icon.glowRgb,
      iconClassName: icon.glyphClassName,
    },
  ]),
) as Record<VillageEffectThemeId, VillageEffectTheme>;

const DIALOG_BY_ID = new Map(
  DIALOG_INDICATOR_ICONS.map((icon) => [icon.id, icon]),
);

export function dialogIndicatorIcon(id: VillageEffectThemeId): DialogIndicatorIcon {
  const icon = DIALOG_BY_ID.get(id);
  if (!icon) {
    throw new Error(`Unknown dialog indicator icon: ${id}`);
  }
  return icon;
}

export function getVillageEffectTheme(
  themeId: VillageEffectThemeId,
): VillageEffectTheme {
  return VILLAGE_EFFECT_THEMES[themeId];
}

export type OutcomeDialogIconId =
  | "rewardSuccess"
  | "rewardSocialPromo"
  | "madness"
  | "insight"
  | "investLucky"
  | "investWipeout"
  | "investPartialLoss"
  | "investSuccess";

export type OutcomeDialogIcon = {
  id: OutcomeDialogIconId;
  label: string;
  iconRing: string;
  glyphClassName: string;
  symbol: string;
  /** When set, the ring shows a GameUiIcon mask instead of `symbol`. */
  uiIcon?: "reward" | "exclusiveReward";
  uiIconSizeClassName: string;
  uiIconClassName?: string;
  /** Extra classes on the 56px ring (alignment, inherited icon color). */
  ringClassName?: string;
};

/** Reward, madness, insight, and investment OutcomeDialog rings. */
export const OUTCOME_DIALOG_ICONS: OutcomeDialogIcon[] = [
  {
    id: "rewardSuccess",
    label: "Reward",
    iconRing: "border-amber-500/65 bg-amber-500/20",
    glyphClassName: "",
    symbol: "",
    uiIcon: "reward",
    uiIconSizeClassName: "w-7 h-7 translate-y-[-0.1em]",
    ringClassName: "text-amber-500",
  },
  {
    id: "rewardSocialPromo",
    label: "Reward promo",
    iconRing: "border-green-500/45 bg-green-950/35",
    glyphClassName: "",
    symbol: "",
    uiIcon: "exclusiveReward",
    uiIconSizeClassName: "w-8 h-8 translate-x-[0.08em] translate-y-[-0.1em]",
    uiIconClassName: "text-green-500",
  },
  {
    id: "madness",
    label: "Madness",
    iconRing: "border-violet-500/45 bg-violet-950/35",
    glyphClassName: `${DG} text-4xl text-violet-300/90`,
    symbol: "\u273A",
    uiIconSizeClassName: "w-9 h-9 translate-y-[-0.12em]",
    ringClassName: "items-end",
  },
  {
    id: "insight",
    label: "Insight",
    iconRing: "border-blue-500/45 bg-blue-950/35",
    glyphClassName: `${DG} text-4xl text-blue-400 translate-y-[0.16em]`,
    symbol: "\u{1F7D6}",
    uiIconSizeClassName: "w-9 h-9",
  },
  {
    id: "investSuccess",
    label: "Invest gain",
    iconRing: "border-amber-500/65 bg-amber-500/20",
    glyphClassName: `${DG} text-4xl text-amber-500 translate-y-[0.07em]`,
    symbol: "\u21E7",
    uiIconSizeClassName: "w-9 h-9",
    ringClassName: "text-white",
  },
  {
    id: "investLucky",
    label: "Invest lucky",
    iconRing: "border-amber-500/85 bg-amber-500/30",
    glyphClassName: `${DG} text-4xl text-amber-500 translate-y-[0.1em]`,
    symbol: "\u21EE",
    uiIconSizeClassName: "w-9 h-9",
    ringClassName: "text-white",
  },
  {
    id: "investPartialLoss",
    label: "Invest loss",
    iconRing: "border-red-500/65 bg-red-500/20",
    glyphClassName: `${DG} text-4xl text-red-500 translate-y-[0.15em]`,
    symbol: "\u21E9",
    uiIconSizeClassName: "w-9 h-9",
    ringClassName: "text-white",
  },
  {
    id: "investWipeout",
    label: "Invest wipeout",
    iconRing: "border-red-500/85 bg-red-500/30",
    glyphClassName: `${DG} text-4xl text-red-500 translate-y-[-0.1em] rotate-180`,
    symbol: "\u21EE",
    uiIconSizeClassName: "w-9 h-9",
    ringClassName: "text-white",
  }
];

const OUTCOME_BY_ID = new Map(
  OUTCOME_DIALOG_ICONS.map((icon) => [icon.id, icon]),
);

export function outcomeDialogIcon(id: OutcomeDialogIconId): OutcomeDialogIcon {
  const icon = OUTCOME_BY_ID.get(id);
  if (!icon) {
    throw new Error(`Unknown outcome dialog icon: ${id}`);
  }
  return icon;
}

type IconHotData = {
  header: HeaderIndicatorIcon[];
  heartfire: HeaderIndicatorIcon[];
  dialog: DialogIndicatorIcon[];
  outcome: OutcomeDialogIcon[];
  themes: Record<VillageEffectThemeId, VillageEffectTheme>;
  headerById: Map<string, HeaderIndicatorIcon>;
  dialogById: Map<VillageEffectThemeId, DialogIndicatorIcon>;
  outcomeById: Map<OutcomeDialogIconId, OutcomeDialogIcon>;
  version: number;
  listeners: Set<() => void>;
};

function getIconHotData(): IconHotData | undefined {
  return import.meta.hot?.data.icons as IconHotData | undefined;
}

function replaceArray<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next);
}

function rebuildLookups(data: IconHotData) {
  data.headerById.clear();
  for (const icon of data.header) {
    data.headerById.set(icon.id, icon);
  }
  data.dialogById.clear();
  for (const icon of data.dialog) {
    data.dialogById.set(icon.id, icon);
  }
  data.outcomeById.clear();
  for (const icon of data.outcome) {
    data.outcomeById.set(icon.id, icon);
  }
  for (const key of Object.keys(data.themes) as VillageEffectThemeId[]) {
    delete data.themes[key];
  }
  for (const icon of data.dialog) {
    data.themes[icon.id] = {
      id: icon.id,
      symbol: icon.symbol,
      border: icon.border,
      iconRing: icon.iconRing,
      glowRgb: icon.glowRgb,
      iconClassName: icon.glyphClassName,
    };
  }
}

const headerIndicatorIconsListeners = new Set<() => void>();

export function subscribeHeaderIndicatorIcons(onStoreChange: () => void) {
  const listeners =
    getIconHotData()?.listeners ?? headerIndicatorIconsListeners;
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getHeaderIndicatorIconsVersion() {
  return getIconHotData()?.version ?? 0;
}

if (import.meta.hot) {
  const prev = getIconHotData();
  if (prev) {
    replaceArray(prev.header, HEADER_INDICATOR_ICONS);
    replaceArray(prev.heartfire, HEARTFIRE_INDICATOR_ICONS);
    replaceArray(prev.dialog, DIALOG_INDICATOR_ICONS);
    replaceArray(prev.outcome, OUTCOME_DIALOG_ICONS);
    rebuildLookups(prev);
    prev.version += 1;
    prev.listeners.forEach((listener) => listener());
  } else {
    import.meta.hot.data.icons = {
      header: HEADER_INDICATOR_ICONS,
      heartfire: HEARTFIRE_INDICATOR_ICONS,
      dialog: DIALOG_INDICATOR_ICONS,
      outcome: OUTCOME_DIALOG_ICONS,
      themes: VILLAGE_EFFECT_THEMES,
      headerById: HEADER_BY_ID,
      dialogById: DIALOG_BY_ID,
      outcomeById: OUTCOME_BY_ID,
      version: 0,
      listeners: headerIndicatorIconsListeners,
    } satisfies IconHotData;
  }
  import.meta.hot.accept();
}
