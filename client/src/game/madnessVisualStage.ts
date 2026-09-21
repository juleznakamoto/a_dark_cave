/**
 * Madness visual bands. Same cutoffs as the side-panel madness row
 * (light / medium / intense / extreme). Stage 4 is the current worst
 * destroyed-chrome look.
 */
export const MADNESS_VISUAL_STAGE_MIN = [0, 10, 20, 30, 40] as const;

export type MadnessVisualStage = 0 | 1 | 2 | 3 | 4;

export const MADNESS_VISUAL_STAGE_LABELS: Record<MadnessVisualStage, string> = {
  0: "None",
  1: "Light",
  2: "Medium",
  3: "Intense",
  4: "Extreme",
};

export const MADNESS_VISUAL_STAGE_RANGES: Record<MadnessVisualStage, string> = {
  0: "0-9",
  1: "10-19",
  2: "20-29",
  3: "30-39",
  4: "40+",
};

export const MADNESS_STAGE_TEXT_CLASS: Record<MadnessVisualStage, string> = {
  0: "",
  1: "madness-pulse-light text-violet-200",
  2: "madness-pulse-medium text-violet-300",
  3: "madness-pulse-intense text-violet-400",
  4: "madness-pulse-extreme text-violet-500",
};

export const ADC_CHROME_STAGE_ATTR = "data-adc-chrome-stage";
export const ADC_CHROME_PREV_STAGE_ATTR = "data-adc-chrome-prev-stage";
/** Nested `/dev/animations` columns. Beats document-level stage selectors. */
export const ADC_CHROME_STAGE_PREVIEW_CLASS = "adc-chrome-stage-preview";
/** Previous-stage crack mix (0–1). Keep in sync with `index.css`. */
export const ADC_CHROME_FROM_PROP = "--adc-chrome-from";
/** Current-stage crack mix (0–1). Keep in sync with `index.css`. */
export const ADC_CHROME_TO_PROP = "--adc-chrome-to";
/** Solid CSS border mix (0–1). Keep in sync with `index.css`. */
export const ADC_CHROME_SOLID_PROP = "--adc-chrome-solid";
/** Full overlapping fade. Keep in sync with `index.css`. */
export const ADC_CHROME_STAGE_FADE_MS = 1000;

/** DEV URL `?distortion=0`…`4` (or none/light/medium/intense/extreme). */
export const CHROME_DISTORTION_QUERY_PARAM = "distortion";

const CHROME_DISTORTION_QUERY_TOKENS: Record<string, MadnessVisualStage> = {
  "0": 0,
  none: 0,
  "1": 1,
  light: 1,
  "2": 2,
  medium: 2,
  "3": 3,
  intense: 3,
  "4": 4,
  extreme: 4,
};

/** Read `?distortion=` from a search string. Null when missing or invalid. */
export function parseChromeDistortionQuery(
  search: string,
): MadnessVisualStage | null {
  const raw = new URLSearchParams(search).get(CHROME_DISTORTION_QUERY_PARAM);
  if (raw == null || raw === "") return null;
  const stage = CHROME_DISTORTION_QUERY_TOKENS[raw.trim().toLowerCase()];
  return stage ?? null;
}

export function getMadnessVisualStage(madness: number): MadnessVisualStage {
  const value = Math.max(0, madness);
  if (value >= 40) return 4;
  if (value >= 30) return 3;
  if (value >= 20) return 2;
  if (value >= 10) return 1;
  return 0;
}

export function parseMadnessVisualStage(
  value: string | null,
): MadnessVisualStage | null {
  if (value === "0") return 0;
  if (value === "1") return 1;
  if (value === "2") return 2;
  if (value === "3") return 3;
  if (value === "4") return 4;
  return null;
}

/** True when the dummy slider / live madness band should fade chrome. */
export function chromeStageShouldDissolve(
  from: MadnessVisualStage | null,
  to: MadnessVisualStage,
): boolean {
  return from != null && from !== to;
}

/** Overlapping fade: old cracks out, new cracks in, solid border when either side is none. */
export function chromeStageFadeWeights(
  from: MadnessVisualStage,
  to: MadnessVisualStage,
  t: number,
): { fromCrack: number; toCrack: number; solid: number } {
  const p = Math.min(1, Math.max(0, t));
  return {
    fromCrack: from === 0 ? 0 : 1 - p,
    toCrack: to === 0 ? 0 : p,
    solid: (from === 0 ? 1 - p : 0) + (to === 0 ? p : 0),
  };
}

export function madnessForVisualStage(stage: MadnessVisualStage): number {
  return MADNESS_VISUAL_STAGE_MIN[stage];
}
