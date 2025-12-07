
import BuildingProgressChart from "./BuildingProgressChartAchievements";
import ItemProgressChart from "./ItemProgressChartAchievements";

export default function AchievementsPanel() {
  return (
    <div className="mt-2 pr-4">
      <div className="flex items-start gap-8">
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold mb-2">Buildings</h3>
          <BuildingProgressChart />
        </div>
        <div className="flex flex-col items-center">
          <h3 className="text-sm font-semibold mb-2">Items</h3>
          <ItemProgressChart />
        </div>
      </div>
    </div>
  );
}
