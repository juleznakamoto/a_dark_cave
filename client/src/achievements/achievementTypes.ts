import type { GameState } from "@shared/schema";

/** Permanent bonuses granted while the achievement is claimed. */
export interface AchievementBonuses {
  /** Additive stranger-approach (new villager) chance, e.g. 0.01 = +1%. */
  strangerApproachBonus?: number;
  /** Additive crafting cost reduction, e.g. 0.025 = 2.5%. */
  craftingCostReduction?: number;
  /** Additive building cost reduction, e.g. 0.025 = 2.5%. */
  buildingCostReduction?: number;
}

/** Legacy: single silver amount. Use rewards for multi-resource support. */
export interface AchievementSegment {
  segmentId: string;
  maxCount: number;
  label: string;
  /**
   * Optional muted center label over the progress bar (e.g. speedrun time gate).
   * Used when maxCount is 1 instead of `current/max`.
   */
  detailLabel?: string;
  /** @deprecated Use rewards instead for multi-resource support */
  reward?: number;
  /** Resource keys (e.g. silver, gold) to amounts. Overrides reward when present. */
  rewards?: Record<string, number>;
  /** Permanent bonuses while claimed (not granted as resources on claim). */
  bonuses?: AchievementBonuses;
  getCount: (state: GameState) => number;
  /**
   * Visual weight for ring slices and progress-bar tick count
   * (e.g. 10 while maxCount is 500 → equal ring share, ticks every 50).
   * Defaults to maxCount.
   */
  segments?: number;
  /**
   * Web-only (social / account promo, etc.). Hidden in Steam edition UI,
   * progress tallies, and Steam achievement sync.
   */
  webOnly?: boolean;
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
