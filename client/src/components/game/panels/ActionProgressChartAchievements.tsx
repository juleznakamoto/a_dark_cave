import { actionChartConfig } from "@/achievements/configs/action";
import AchievementRingChart from "@/achievements/AchievementRingChart";

// Re-export for backwards compatibility
export { getUnclaimedActionIds } from "@/achievements/configs/action";

export default function ActionProgressChartAchievements() {
  return <AchievementRingChart config={actionChartConfig} />;
}