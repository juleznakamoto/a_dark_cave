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
import { useMobileButtonTooltip } from "@/hooks/useMobileTooltip";
import { getTotalPopulationEffects } from "@/game/population";
import { Progress } from "@/components/ui/progress";

// Sleep upgrade configurations
const SLEEP_LENGTH_UPGRADES = [
  { level: 0, hours: 2, cost: 0, currency: null },
  { level: 1, hours: 4, cost: 250, currency: "gold" },
  { level: 2, hours: 6, cost: 500, currency: "gold" },
  { level: 3, hours: 8, cost: 750, currency: "gold" },
  { level: 4, hours: 10, cost: 1000, currency: "gold" },
  { level: 5, hours: 12, cost: 1250, currency: "gold" },
];

const SLEEP_INTENSITY_UPGRADES = [
  { level: 0, percentage: 10, cost: 0, currency: null },
  { level: 1, percentage: 12.5, cost: 250, currency: "gold" },
  { level: 2, percentage: 15, cost: 500, currency: "gold" },
  { level: 3, percentage: 17.5, cost: 1000, currency: "gold" },
  { level: 4, percentage: 20, cost: 1500, currency: "gold" },
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
  const mobileTooltip = useMobileButtonTooltip();
  const cubeTooltip = useMobileTooltip();
  const state = useGameStore.getState();
  const hoveredTooltips = useGameStore((state) => state.hoveredTooltips || {});
  const setHoveredTooltip = useGameStore((state) => state.setHoveredTooltip);
  const hoverTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

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

  // Generic upgrade handler
  const handleUpgrade = (
    upgradeType: 'length' | 'intensity',
    upgrades: typeof SLEEP_LENGTH_UPGRADES | typeof SLEEP_INTENSITY_UPGRADES,
    levelKey: 'lengthLevel' | 'intensityLevel'
  ) => {
    const currentLevel = sleepUpgrades[levelKey];
    if (currentLevel >= 5) return;

    const nextUpgrade = upgrades[currentLevel + 1];
    const currency = nextUpgrade.currency as 'gold' | 'silver';
    
    if (resources[currency] >= nextUpgrade.cost) {
      useGameStore.setState({
        sleepUpgrades: {
          ...sleepUpgrades,
          [levelKey]: currentLevel + 1,
        },
        resources: {
          ...resources,
          [currency]: resources[currency] - nextUpgrade.cost,
        },
      });
    }
  };

  const handleSleepLengthUpgrade = () => 
    handleUpgrade('length', SLEEP_LENGTH_UPGRADES, 'lengthLevel');

  const handleSleepIntensityUpgrade = () => 
    handleUpgrade('intensity', SLEEP_INTENSITY_UPGRADES, 'intensityLevel');

  const currentLengthUpgrade = SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel];
  const nextLengthUpgrade =
    SLEEP_LENGTH_UPGRADES[sleepUpgrades.lengthLevel + 1];
  const canUpgradeLength =
    sleepUpgrades.lengthLevel < 5 &&
    resources.gold >= (nextLengthUpgrade?.cost || 0);

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
          <TooltipProvider>
            <Tooltip open={mobileTooltip.isTooltipOpen("sleep-button")}>
              <TooltipTrigger asChild>
                <div
                  className="inline-block"
                  onClick={mobileTooltip.isMobile ? (e) => {
                    mobileTooltip.handleWrapperClick("sleep-button", !canActivateIdle, false, e);
                  } : undefined}
                  onTouchStart={mobileTooltip.isMobile ? (e) => {
                    mobileTooltip.handleTouchStart("sleep-button", !canActivateIdle, false, e);
                  } : undefined}
                  onTouchEnd={mobileTooltip.isMobile ? (e) => {
                    mobileTooltip.handleTouchEnd("sleep-button", !canActivateIdle, handleActivateIdleMode, e);
                  } : undefined}
                  onMouseDown={mobileTooltip.isMobile ? (e) => {
                    mobileTooltip.handleMouseDown("sleep-button", !canActivateIdle, false, e);
                  } : undefined}
                  onMouseUp={mobileTooltip.isMobile ? (e) => {
                    mobileTooltip.handleMouseUp("sleep-button", !canActivateIdle, handleActivateIdleMode, e);
                  } : undefined}
                >
                  <Button
                    onClick={mobileTooltip.isMobile && mobileTooltip.isTooltipOpen("sleep-button") ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    } : handleActivateIdleMode}
                    disabled={!canActivateIdle}
                    size="xs"
                    variant="outline"
                    className="hover:bg-transparent hover:text-foreground"
                    button_id="activate-sleep-mode"
                  >
                    Sleep
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs whitespace-nowrap">
                  {canActivateIdle ? (
                    <div>Enter sleep mode to progress while away</div>
                  ) : (
                    <div>Requires positive wood and food production</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Sleep Upgrades Section */}
        <div className="w-64 space-y-3 pt-2">
          {/* Sleep Length Upgrade */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Sleep Length
              </span>
              {sleepUpgrades.lengthLevel < 5 ? (
                <TooltipProvider>
                  <Tooltip open={mobileTooltip.isTooltipOpen("upgrade-length-button")}>
                    <TooltipTrigger asChild>
                      <div
                        className="inline-block"
                        onClick={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleWrapperClick("upgrade-length-button", !canUpgradeLength, false, e);
                        } : undefined}
                        onTouchStart={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleTouchStart("upgrade-length-button", !canUpgradeLength, false, e);
                        } : undefined}
                        onTouchEnd={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleTouchEnd("upgrade-length-button", !canUpgradeLength, handleSleepLengthUpgrade, e);
                        } : undefined}
                        onMouseDown={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleMouseDown("upgrade-length-button", !canUpgradeLength, false, e);
                        } : undefined}
                        onMouseUp={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleMouseUp("upgrade-length-button", !canUpgradeLength, handleSleepLengthUpgrade, e);
                        } : undefined}
                      >
                        <Button
                          onClick={mobileTooltip.isMobile && mobileTooltip.isTooltipOpen("upgrade-length-button") ? (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          } : handleSleepLengthUpgrade}
                          disabled={!canUpgradeLength}
                          size="xs"
                          variant="outline"
                          className="hover:bg-transparent hover:text-foreground"
                          button_id="upgrade-sleep-length"
                        >
                          Improve
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs whitespace-nowrap">
                        <div>+{nextLengthUpgrade.hours - currentLengthUpgrade.hours}h</div>
                        <div className="border-t border-border my-1" />
                        <div className={resources.gold >= nextLengthUpgrade.cost ? "" : "text-muted-foreground"}>
                          -{nextLengthUpgrade.cost} Gold
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
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
              {sleepUpgrades.intensityLevel < 5 ? (
                <TooltipProvider>
                  <Tooltip open={mobileTooltip.isTooltipOpen("upgrade-intensity-button")}>
                    <TooltipTrigger asChild>
                      <div
                        className="inline-block"
                        onClick={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleWrapperClick("upgrade-intensity-button", !canUpgradeIntensity, false, e);
                        } : undefined}
                        onTouchStart={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleTouchStart("upgrade-intensity-button", !canUpgradeIntensity, false, e);
                        } : undefined}
                        onTouchEnd={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleTouchEnd("upgrade-intensity-button", !canUpgradeIntensity, handleSleepIntensityUpgrade, e);
                        } : undefined}
                        onMouseDown={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleMouseDown("upgrade-intensity-button", !canUpgradeIntensity, false, e);
                        } : undefined}
                        onMouseUp={mobileTooltip.isMobile ? (e) => {
                          mobileTooltip.handleMouseUp("upgrade-intensity-button", !canUpgradeIntensity, handleSleepIntensityUpgrade, e);
                        } : undefined}
                      >
                        <Button
                          onClick={mobileTooltip.isMobile && mobileTooltip.isTooltipOpen("upgrade-intensity-button") ? (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          } : handleSleepIntensityUpgrade}
                          disabled={!canUpgradeIntensity}
                          size="xs"
                          variant="outline"
                          className="hover:bg-transparent hover:text-foreground"
                          button_id="upgrade-sleep-intensity"
                        >
                          Improve
                        </Button>
                      </div>
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
              ) : null}
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
        <div className="space-y-2 pt-1">
          <h3 className="text-xs font-bold text-foreground">Cube</h3>

          <div className="grid grid-cols-6 gap-5 w-40 h-12 gap-y-3">
            {completedCubeEvents.map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip open={cubeTooltip.isTooltipOpen(`cube-${event.id}`)}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        cubeTooltip.handleTooltipClick(`cube-${event.id}`, e);
                        useGameStore.getState().trackButtonClick(`cube-${event.id}`);
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