import { Component, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
        <div className="w-64 h-72 flex items-center justify-center text-xs text-neutral-500 text-center px-2">
          Chart unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AchievementsPanel() {
  return (
    <div className="mt-0 pr-4 flex flex-col min-h-0">
      <Tabs defaultValue="building" className="flex flex-col flex-1 min-h-0">
        <TabsList className="grid w-full grid-cols-3 mb-2 shrink-0">
          <TabsTrigger value="building" className="text-lg px-2 py-1.5">
            ▨
          </TabsTrigger>
          <TabsTrigger value="item" className="text-lg px-2 py-1.5">
            ❖
          </TabsTrigger>
          <TabsTrigger value="action" className="text-lg px-2 py-1.5">
            ⧗
          </TabsTrigger>
        </TabsList>
        <TabsContent
          value="building"
          className="flex-1 flex items-center justify-center min-h-0 data-[state=inactive]:hidden"
        >
          <ChartErrorBoundary>
            <div className="flex flex-col items-center">
              <BuildingProgressChart />
            </div>
          </ChartErrorBoundary>
        </TabsContent>
        <TabsContent
          value="item"
          className="flex-1 flex items-center justify-center min-h-0 data-[state=inactive]:hidden"
        >
          <ChartErrorBoundary>
            <div className="flex flex-col items-center">
              <ItemProgressChart />
            </div>
          </ChartErrorBoundary>
        </TabsContent>
        <TabsContent
          value="action"
          className="flex-1 flex items-center justify-center min-h-0 data-[state=inactive]:hidden"
        >
          <ChartErrorBoundary>
            <div className="flex flex-col items-center">
              <ActionProgressChart />
            </div>
          </ChartErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}
