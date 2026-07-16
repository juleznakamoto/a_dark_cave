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
  /**
   * Visual weight for ring slices and progress-bar tick count
   * (e.g. 10 while maxCount is 500 → equal ring share, ticks every 50).
   * Defaults to maxCount.
   */
  segments?: number;
}

/** Ring slice width and progress-bar ticks; completion still uses maxCount. */
export function getAchievementSegmentWeight(
  segment: Pick<AchievementSegment, "segments" | "maxCount">,
): number {
  return segment.segments ?? segment.maxCount;
}

export interface AchievementChartConfig {
  idPrefix: "building" | "item" | "action" | "basic" | "overall";
  centerSymbol: string;
  rings: AchievementSegment[][];
  /**
   * When false, achievements never show Claim and are excluded from unclaimed pulse.
   * Defaults to true.
   */
  claimable?: boolean;
}
