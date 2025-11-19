import React, { useRef } from "react";
import { useGameStore } from "@/game/state";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cubeEvents } from "@/game/rules/eventsCube";
import { LogEntry } from "@/game/rules/events";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMobileTooltip } from "@/hooks/useMobileTooltip";
import { Button } from "@/components/ui/button";
import { getTotalPopulationEffects } from "@/game/population";
import { Progress } from "@/components/ui/progress";

// Sleep upgrade configurations
const SLEEP_LENGTH_UPGRADES = [
  { level: 0, hours: 2, cost: 0, currency: null },
  { level: 1, hours: 4, cost: 250, currency: "silver" },
  { level: 2, hours: 6, cost: 500, currency: "silver" },
  { level: 3, hours: 10, cost: 1000, currency: "silver" },
  { level: 4, hours: 16, cost: 2500, currency: "silver" },
  { level: 5, hours: 24, cost: 5000, currency: "silver" },
];

const SLEEP_INTENSITY_UPGRADES = [
  { level: 0, percentage: 10, cost: 0, currency: null },
  { level: 1, percentage: 12.5, cost: 50, currency: "gold" },
  { level: 2, percentage: 15, cost: 250, currency: "gold" },
  { level: 3, percentage: 17.5, cost: 500, currency: "gold" },
  { level: 4, percentage: 20, cost: 1000, currency: "gold" },
  { level: 5, percentage: 25, cost: 2500, currency: "gold" },
];

export default function EstatePanel() {
  const {
    events,
    setEventDialog,
    setIdleModeDialog,
    sleepUpgrades,
    resources,
  } = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const state = useGameStore.getState();
  const hoveredTooltips = useGameStore((state) => state.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((state) => state.setHoveredTooltip);
  const hoverTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleTooltipHover = (itemId: string) => {
    if (mobileTooltip.isMobile) return;

    const existingTimer = hoverTimersRef.current.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set a timer to mark as hovered after 500ms
    const timer = setTimeout(() => {
      if (!hoveredTooltips[itemId]) {
        setHoveredTooltip(itemId, true);
      }
      hoverTimersRef.current.delete(itemId);
    }, 500);

    hoverTimersRef.current.set(itemId, timer);
  };

  // Get all cube events that have been triggered
  const completedCubeEvents = Object.entries(cubeEvents)
    .filter(([eventId]) => {
      // Check if this cube event has been triggered
      const baseEventId = eventId.replace(/[a-z]$/, ""); // Remove trailing letter (e.g., cube14a -> cube14)
      return events[eventId] === true || events[baseEventId] === true;
    })
    .map(([eventId, eventData]) => ({
      id: eventId,
      ...eventData,
    }));

  const handleCubeClick = (event: (typeof completedCubeEvents)[0]) => {
    // Create a log entry from the event data
    const logEntry: LogEntry = {
      id: event.id,
      title: event.title,
      message: event.message,
      timestamp: Date.now(),
      type: "event",
      choices: event.choices,
    };

    setEventDialog(true, logEntry);
  };

  // Check if idle mode can be activated
  const totalEffects = getTotalPopulationEffects(
    state,
    Object.keys(state.villagers),
  );
  const woodProduction = totalEffects.wood || 0;
  const foodProduction = totalEffects.food || 0;
  const canActivateIdle = woodProduction > 0 && foodProduction > 0;

  const handleActivateIdleMode = async () => {
    const now = Date.now();

    // Set idle mode state before opening dialog
    useGameStore.setState({
      idleModeState: {
        isActive: true,
        startTime: now,
        needsDisplay: true,
      },
    });

    // Get the MOST RECENT game state right before saving
    const currentState = useGameStore.getState();

    // Immediately save to Supabase so user can close tab
    const { saveGame } = await import("@/game/save");
    await saveGame(currentState, currentState.playTime);

    setIdleModeDialog(true);
  };

  // Handle sleep length upgrade
  const handleSleepLengthUpgrade = () => {
    const currentLevel = sleepUpgrades.lengthLevel;
    if (currentLevel >= 5) return;

    const nextUpgrade = SLEEP_LENGTH_UPGRADES[currentLevel + 1];
    if (resources.silver >= nextUpgrade.cost) {
      useGameStore.setState({
        sleepUpgrades: {
          ...sleepUpgrades,
          lengthLevel: currentLevel + 1,
        },
        resources: {
          ...resources,
          silver: resources.silver - nextUpgrade.cost,
        },
      });
    }
  };

  // Handle sleep intensity upgrade
  const handleSleepIntensityUpgrade = () => {
    const currentLevel = sleepUpgrades.intensityLevel;
    if (currentLevel >= 5) return;

    const nextUpgrade = SLEEP_INTENSITY_UPGRADES[currentLevel + 1];
    if (resources.gold >= nextUpgrade.cost) {
      useGameStore.setState({
        sleepUpgrades: {
          ...sleepUpgrades,
          intensityLevel: currentLevel + 1,
        },
        resources: {
          ...resources,
          gold: resources.gold - nextUpgrade.cost,
        },
      });
    }
  };

  const currentLengthUpgrade = SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel];
  const nextLengthUpgrade =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel + 1];
  const canUpgradeLength =
    sleepUpgrades.lengthLevel < 5 &&
    resources.silver >= (nextLengthUpgrade?.cost || 0);

  const currentIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel];
  const nextIntensityUpgrade =
    SLEEP_INTENSITY_UPGRADES[sleepUpgrades.intensityLevel + 1];
  const canUpgradeIntensity =
    sleepUpgrades.intensityLevel < 5 &&
    resources.gold >= (nextIntensityUpgrade?.cost || 0);

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-2 pb-2">
        {/* Sleep Mode Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Sleep</h3>
          {!canActivateIdle ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-block">
                    <Button
                      onClick={handleActivateIdleMode}
                      disabled={!canActivateIdle}
                      size="xs"
                      variant="outline"
                      className="hover:bg-transparent hover:text-foreground"
                    >
                      Sleep
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs whitespace-nowrap">
                    <div>Requires positive wood and food production</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              onClick={handleActivateIdleMode}
              disabled={!canActivateIdle}
              size="xs"
              variant="outline"
              className="hover:bg-transparent hover:text-foreground"
            >
              Sleep
            </Button>
          )}
        </div>

        {/* Sleep Upgrades Section */}
        <div className="w-80 space-y-3 pt-2">
          {/* Sleep Length Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Sleep Length
              </span>
              {sleepUpgrades.lengthLevel < 5 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSleepLengthUpgrade}
                        disabled={!canUpgradeLength}
                        size="xs"
                        variant="outline"
                        className="hover:bg-transparent hover:text-foreground"
                      >
                        Improve
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        <div>+{nextLengthUpgrade.hours - currentLengthUpgrade.hours}h</div>
                        <div className="border-t border-border my-1" />
                        <div className={resources.silver >= nextLengthUpgrade.cost ? "" : "text-muted-foreground"}>
                          -{nextLengthUpgrade.cost} Silver
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Progress
              value={(sleepUpgrades.lengthLevel / 5) * 100}
              className="h-2"
              segments={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentLengthUpgrade.hours}h</span>
            </div>
          </div>

          {/* Sleep Intensity Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Sleep Intensity
              </span>
              {sleepUpgrades.intensityLevel < 5 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleSleepIntensityUpgrade}
                        disabled={!canUpgradeIntensity}
                        size="xs"
                        variant="outline"
                        className="hover:bg-transparent hover:text-foreground"
                      >
                        Improve
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        <div>+{nextIntensityUpgrade.percentage - currentIntensityUpgrade.percentage}%</div>
                        <div className="border-t border-border my-1" />
                        <div className={resources.gold >= nextIntensityUpgrade.cost ? "" : "text-muted-foreground"}>
                          -{nextIntensityUpgrade.cost} Gold
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Progress
              value={(sleepUpgrades.intensityLevel / 5) * 100}
              className="h-2"
              segments={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{currentIntensityUpgrade.percentage}%</span>
            </div>
          </div>
        </div>

        {/* Cube Section */}
        <div className="space-y-2 pt-0">
          <h3 className="text-xs font-bold text-foreground">Cube</h3>

          <div className="grid grid-cols-6 gap-5 w-40 h-12">
            {completedCubeEvents.map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip open={mobileTooltip.isTooltipOpen(`cube-${event.id}`)}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        mobileTooltip.handleTooltipClick(`cube-${event.id}`, e);
                        handleCubeClick(event);
                      }}
                      className="w-6 h-6 bg-neutral-900 border border-neutral-800 rounded-md flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-500 transition-all cursor-pointer group relative"
                    >
                      <div className="text-md">▣</div>
                      <div className="absolute inset-0 cube-dialog-glow opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none rounded"></div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">{event.title}</div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}