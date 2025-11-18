import React from "react";
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

export default function EstatePanel() {
  const { events, setEventDialog, setIdleModeDialog } = useGameStore();
  const mobileTooltip = useMobileTooltip();
  const state = useGameStore.getState();

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

    // Immediately save to Supabase so user can close tab
    const { saveGame } = await import("@/game/save");
    const currentState = useGameStore.getState();
    await saveGame(currentState, currentState.playTime);

    setIdleModeDialog(true);
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 pb-4">
        {/* Sleep Mode Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Sleep</h3>
          <p className="text-sm text-muted-foreground">
            Villagers work while you sleep
          </p>
          <Button
            onClick={handleActivateIdleMode}
            disabled={!canActivateIdle}
            size="sm"
            variant="outline"
            className="w-24 h-8"
          >
            Go to Sleep
          </Button>
          {!canActivateIdle && (
            <p className="text-xs text-muted-foreground italic">
              Requires positive wood and food production
            </p>
          )}
        </div>

        {/* Cube Section */}
        <div className="space-y-2 pt-4 border-t border-border">
          <h3 className="text-xs font-bold text-foreground">Cube</h3>

          {completedCubeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No cube memories yet...
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-3 w-40 h-12">
              {completedCubeEvents.map((event) => (
                <TooltipProvider key={event.id}>
                  <Tooltip
                    open={mobileTooltip.isTooltipOpen(`cube-${event.id}`)}
                  >
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          mobileTooltip.handleTooltipClick(
                            `cube-${event.id}`,
                            e,
                          );
                          handleCubeClick(event);
                        }}
                        className="w-6 h-6 bg-neutral-900 border border-neutral-400 rounded flex items-center justify-center hover:bg-neutral-800 hover:border-neutral-300 transition-all cursor-pointer group relative"
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
          )}
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
