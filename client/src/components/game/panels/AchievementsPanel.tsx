
import { lazy, Suspense } from "react";

const BuildingProgressChart = lazy(() => import("./BuildingProgressChartAchievements"));
const ItemProgressChart     = lazy(() => import("./ItemProgressChartAchievements"));
const ActionProgressChart   = lazy(() => import("./ActionProgressChartAchievements"));

export default function AchievementsPanel() {
  return (
    <div className="mt-0 pr-4 overflow-hidden">
      <div className="flex items-start flex-wrap gap-x-4 gap-y-0 overflow-hidden">
        <Suspense fallback={null}>
          <div className="flex flex-col items-center">
            <BuildingProgressChart />
          </div>
          <div className="flex flex-col items-center">
            <ItemProgressChart />
          </div>
          <div className="flex flex-col items-center">
            <ActionProgressChart />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
