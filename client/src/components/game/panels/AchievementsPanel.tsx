import { Component, type ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipWrapper } from "@/components/game/TooltipWrapper";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { Progress } from "@/components/ui/progress";
import GameButton from "@/components/game/GameButton";
import { useGameStore } from "@/game/state";
import {
  buildingChartConfig,
  itemChartConfig,
  actionChartConfig,
  basicChartConfig,
} from "@/achievements";
import { getAchievementRows, claimAchievement, formatRewardsTooltip } from "@/achievements/achievementHelpers";
import {
  INDICATOR_CLASS_INCOMPLETE,
  INDICATOR_CLASS_COMPLETE,
  CLAIM_BUTTON_CLASS,
  PROGRESS_BAR_BG_CLASS,
} from "@/achievements/achievementColors";
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

function AchievementRowComponent({
  row,
  indicatorClassIncomplete,
  indicatorClassComplete,
  claimButtonClass,
}: {
  row: AchievementRow;
  indicatorClassIncomplete: string;
  indicatorClassComplete: string;
  claimButtonClass: string;
}) {
  const canClaim = row.isFull && !row.isClaimed;
  const tooltipText = canClaim ? formatRewardsTooltip(row.rewards) : "";

  const handleClaim = () => {
    if (canClaim) {
      claimAchievement(row.achievementId, {
        name: row.label,
        reward: row.reward,
        rewards: row.rewards,
        maxCount: row.maxCount,
      });
    }
  };

  return (
    <div className="space-y-1 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground truncate">
          {row.currentCount >= 1 ? row.label : "❔"}
        </span>
        {canClaim && (
          <GameButton
            variant="outline"
            size="xs"
            className={`shrink-0 h-5 px-2 ${claimButtonClass}`}
            onClick={handleClaim}
            tooltip={tooltipText}
            tooltipId={`achievement-claim-${row.achievementId}`}
          >
            Claim
          </GameButton>
        )}
      </div>
      <Progress
        value={(row.currentCount / row.maxCount) * 100}
        className={`h-2 ${PROGRESS_BAR_BG_CLASS}`}
        segments={row.segments ?? row.maxCount}
        indicatorClassName={row.isFull ? indicatorClassComplete : indicatorClassIncomplete}
        hideBorder
      />
    </div>
  );
}

function AchievementTabContent({
  config,
  tabId,
}: {
  config: AchievementChartConfig;
  tabId: string;
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
  const claimButtonClass = CLAIM_BUTTON_CLASS[config.idPrefix] ?? CLAIM_BUTTON_CLASS.item;

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full md:max-w-96">
      <ScrollAreaWithIndicator className="h-full w-full" scrollAreaId={`achievements-${tabId}`}>
        <div className="pb-6 space-y-0">
          {rows.map((row) => (
            <AchievementRowComponent
              key={row.achievementId}
              row={row}
              indicatorClassIncomplete={indicatorClassIncomplete}
              indicatorClassComplete={indicatorClassComplete}
              claimButtonClass={claimButtonClass}
            />
          ))}
        </div>
      </ScrollAreaWithIndicator>
    </div>
  );
}

const TAB_TRIGGER_CLASS =
  "flex items-center justify-center gap-1.5 px-2 py-1 cursor-pointer overflow-visible min-h-[3rem] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground disabled:opacity-50 disabled:cursor-not-allowed";

function TabTriggerWithTooltipWhenLocked({
  value,
  config,
  isActive,
  disabled,
  lockedTooltip,
}: {
  value: string;
  config: AchievementChartConfig;
  isActive: boolean;
  disabled: boolean;
  lockedTooltip: string;
}) {
  const trigger = (
    <TabsTrigger
      value={value}
      disabled={disabled}
      className={TAB_TRIGGER_CLASS}
    >
      <ChartErrorBoundary>
        <AchievementMiniRingChart config={config} isActive={isActive} />
      </ChartErrorBoundary>
    </TabsTrigger>
  );
  if (disabled) {
    return (
      <TooltipWrapper
        tooltip={lockedTooltip}
        disabled={true}
        tooltipId={`achievement-tab-locked-${value}`}
        className="flex items-center justify-center min-h-[3rem] cursor-not-allowed"
      >
        {trigger}
      </TooltipWrapper>
    );
  }
  return trigger;
}

export default function AchievementsPanel() {
  const bookOfTrials = useGameStore((s) => s.books?.book_of_trials);
  const [activeTab, setActiveTab] = useState("basic");
  return (
    <div className="mt-0 flex h-full flex-col min-h-0 overflow-hidden w-full md:max-w-96">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full flex-col flex-1 min-h-0 overflow-hidden"
      >
        <TabsList className="sticky top-0 z-10 bg-background grid w-full grid-cols-4 mb-2 shrink-0 overflow-visible h-auto min-h-12 py-1">
          <TabsTrigger value="basic" className={TAB_TRIGGER_CLASS}>
            <ChartErrorBoundary>
              <AchievementMiniRingChart config={basicChartConfig} isActive={activeTab === "basic"} />
            </ChartErrorBoundary>
          </TabsTrigger>
          <TabTriggerWithTooltipWhenLocked
            value="building"
            config={buildingChartConfig}
            isActive={activeTab === "building"}
            disabled={!bookOfTrials}
            lockedTooltip="Not yet unlocked."
          />
          <TabTriggerWithTooltipWhenLocked
            value="item"
            config={itemChartConfig}
            isActive={activeTab === "item"}
            disabled={!bookOfTrials}
            lockedTooltip="Not yet unlocked."
          />
          <TabTriggerWithTooltipWhenLocked
            value="action"
            config={actionChartConfig}
            isActive={activeTab === "action"}
            disabled={!bookOfTrials}
            lockedTooltip="Not yet unlocked."
          />
        </TabsList>
        <TabsContent value="basic" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col overflow-hidden">
          {activeTab === "basic" && <AchievementTabContent config={basicChartConfig} tabId="basic" />}
        </TabsContent>
        <TabsContent value="building" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col overflow-hidden">
          {activeTab === "building" && <AchievementTabContent config={buildingChartConfig} tabId="building" />}
        </TabsContent>
        <TabsContent value="item" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col overflow-hidden">
          {activeTab === "item" && <AchievementTabContent config={itemChartConfig} tabId="item" />}
        </TabsContent>
        <TabsContent value="action" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden flex flex-col overflow-hidden">
          {activeTab === "action" && <AchievementTabContent config={actionChartConfig} tabId="action" />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
