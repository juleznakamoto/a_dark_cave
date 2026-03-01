import { itemChartConfig } from "@/achievements/configs/item";
import AchievementRingChart from "@/achievements/AchievementRingChart";

// Re-export for backwards compatibility
export { getUnclaimedItemIds } from "@/achievements/configs/item";

export default function ItemProgressChart() {
  return <AchievementRingChart config={itemChartConfig} />;
}