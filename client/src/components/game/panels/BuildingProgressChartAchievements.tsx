import { buildingChartConfig } from "@/achievements/configs/building";
import AchievementRingChart from "@/achievements/AchievementRingChart";

// Re-export for backwards compatibility
export { getUnclaimedBuildingIds } from "@/achievements/configs/building";

export default function BuildingProgressChart() {
  return <AchievementRingChart config={buildingChartConfig} />;
}