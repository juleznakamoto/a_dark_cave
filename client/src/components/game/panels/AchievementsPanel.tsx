import BuildingProgressChart from "./BuildingProgressChart";
import ItemProgressChart from "./ItemProgressChart";

export default function AchievementsPanel() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="flex items-center justify-center gap-8">
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