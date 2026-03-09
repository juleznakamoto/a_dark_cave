import type { GameState } from "@shared/schema";

export interface AchievementSegment {
  segmentId: string;
  maxCount: number;
  label: string;
  reward?: number;
  getCount: (state: GameState) => number;
}

export interface AchievementChartConfig {
  idPrefix: "building" | "item" | "action";
  centerSymbol: string;
  rings: AchievementSegment[][];
}
