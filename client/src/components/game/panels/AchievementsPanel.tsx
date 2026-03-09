import { Component, type ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import {
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
} from "@/achievements";
import { getAchievementRows, claimAchievement } from "@/achievements/achievementHelpers";
import type { AchievementRow } from "@/achievements/achievementHelpers";
import type { AchievementChartConfig } from "@/achievements";
import AchievementMiniRingChart from "@/achievements/AchievementMiniRingChart";

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

const INDICATOR_CLASS_INCOMPLETE: Record<string, string> = {
  building: "bg-blue-700/60",
  item: "bg-red-700/60",
  action: "bg-green-700/60",
};
const INDICATOR_CLASS_COMPLETE: Record<string, string> = {
  building: "bg-blue-700",
  item: "bg-red-700",
  action: "bg-green-700",
};

function AchievementRowComponent({
  row,
  indicatorClassIncomplete,
  indicatorClassComplete,
}: {
  row: AchievementRow;
  indicatorClassIncomplete: string;
  indicatorClassComplete: string;
}) {
  const canClaim = row.isFull && !row.isClaimed;

  const handleClaim = () => {
    if (canClaim) {
      claimAchievement(row.achievementId, {
        name: row.label,
        reward: row.reward,
        maxCount: row.maxCount,
      });
    }
  };

  return (
    <div className="space-y-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground truncate">
          {row.label}
        </span>
        {canClaim && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-6 px-2"
            onClick={handleClaim}
          >
            Claim
          </Button>
        )}
      </div>
      <Progress
        value={(row.currentCount / row.maxCount) * 100}
        className="h-2 bg-neutral-700"
        segments={row.maxCount}
        indicatorClassName={row.isFull ? indicatorClassComplete : indicatorClassIncomplete}
        hideBorder
      />
    </div>
  );
}

function AchievementTabContent({
  config,
}: {
  config: AchievementChartConfig;
}) {
  const claimedAchievements = useGameStore(
    (s) => s.claimedAchievements || []
  );
  const rows = getAchievementRows(
    config,
    useGameStore.getState(),
    claimedAchievements
  );
  const indicatorClassIncomplete = INDICATOR_CLASS_INCOMPLETE[config.idPrefix] ?? "bg-red-500/60";
  const indicatorClassComplete = INDICATOR_CLASS_COMPLETE[config.idPrefix] ?? "bg-red-800";

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-96">
      <ScrollAreaWithIndicator className="h-full w-full" persistIndicator>
        <div className="pr-2 space-y-0">
          {rows.map((row) => (
            <AchievementRowComponent
              key={row.achievementId}
              row={row}
              indicatorClassIncomplete={indicatorClassIncomplete}
              indicatorClassComplete={indicatorClassComplete}
            />
          ))}
        </div>
      </ScrollAreaWithIndicator>
    </div>
  );
}

export default function AchievementsPanel() {
  const [activeTab, setActiveTab] = useState("building");
  return (
    <div className="mt-0 pr-4 flex flex-col min-h-0 w-96">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="sticky top-0 z-10 bg-muted grid w-full grid-cols-3 mb-2 shrink-0 overflow-visible h-auto min-h-12 py-1">
          <TabsTrigger value="building" className="flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer overflow-visible min-h-[3rem]">
            <ChartErrorBoundary>
              <AchievementMiniRingChart config={buildingChartConfig} />
            </ChartErrorBoundary>
          </TabsTrigger>
          <TabsTrigger value="item" className="flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer overflow-visible min-h-[3rem]">
            <ChartErrorBoundary>
              <AchievementMiniRingChart config={itemChartConfig} />
            </ChartErrorBoundary>
          </TabsTrigger>
          <TabsTrigger value="action" className="flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer overflow-visible min-h-[3rem]">
            <ChartErrorBoundary>
              <AchievementMiniRingChart config={actionChartConfig} />
            </ChartErrorBoundary>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="building" className="flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col">
          {activeTab === "building" && <AchievementTabContent config={buildingChartConfig} />}
        </TabsContent>
        <TabsContent value="item" className="flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col">
          {activeTab === "item" && <AchievementTabContent config={itemChartConfig} />}
        </TabsContent>
        <TabsContent value="action" className="flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col">
          {activeTab === "action" && <AchievementTabContent config={actionChartConfig} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
