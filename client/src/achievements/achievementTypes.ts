import type { GameState } from "@shared/schema";

/** Legacy: single silver amount. Use rewards for multi-resource support. */
export interface AchievementSegment {
  segmentId: string;
  maxCount: number;
  label: string;
  /** @deprecated Use rewards instead for multi-resource support */
  reward?: number;
  /** Resource keys (e.g. silver, gold) to amounts. Overrides reward when present. */
  rewards?: Record<string, number>;
  getCount: (state: GameState) => number;
  /** Progress bar segment dividers (e.g. 10 for 500/50). Defaults to maxCount. */
  segments?: number;
}

export interface AchievementChartConfig {
  idPrefix: "building" | "item" | "action" | "basic";
  centerSymbol: string;
  rings: AchievementSegment[][];
}
