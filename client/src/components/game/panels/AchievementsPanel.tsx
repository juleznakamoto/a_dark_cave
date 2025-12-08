
import BuildingProgressChart from "./BuildingProgressChartAchievements";
import ItemProgressChart from "./ItemProgressChartAchievements";
import ActionProgressChart from "./ActionProgressChartAchievements";

export default function AchievementsPanel() {
  return (
    <div className="mt-0 pr-4">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center">
          <BuildingProgressChart />
        </div>
        <div className="flex flex-col items-center">
          <ItemProgressChart />
        </div>
        <div className="flex flex-col items-center">
          <ActionProgressChart />
        </div>
      </div>
    </div>
  );
}
