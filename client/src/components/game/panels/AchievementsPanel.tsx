
import { Component, type ReactNode } from "react";
import BuildingProgressChart from "./BuildingProgressChartAchievements";
import ItemProgressChart from "./ItemProgressChartAchievements";
import ActionProgressChart from "./ActionProgressChartAchievements";

class ChartErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-52 h-60 flex items-center justify-center text-xs text-neutral-500 text-center px-2">
          Chart unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AchievementsPanel() {
  return (
    <div className="mt-0 pr-4 overflow-x-auto overflow-y-visible">
      <div className="flex items-start flex-wrap gap-x-4 gap-y-4 overflow-visible">
        <ChartErrorBoundary>
          <div className="flex flex-col items-center">
            <BuildingProgressChart />
          </div>
        </ChartErrorBoundary>
        <ChartErrorBoundary>
          <div className="flex flex-col items-center">
            <ItemProgressChart />
          </div>
        </ChartErrorBoundary>
        <ChartErrorBoundary>
          <div className="flex flex-col items-center">
            <ActionProgressChart />
          </div>
        </ChartErrorBoundary>
      </div>
    </div>
  );
}
