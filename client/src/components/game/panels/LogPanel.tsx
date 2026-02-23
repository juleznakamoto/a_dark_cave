import React, { useEffect, useState, useRef, useMemo } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GAME_CONSTANTS } from "@/game/constants";

// Extended log entry type to support "production" type if it exists in the data
type ExtendedLogEntry =
  | LogEntry
  | {
      message: string;
      type: "production";
      id: string;
      timestamp: number;
      visualEffect?: { type: "glow" | "pulse"; duration: number };
    };

function LogPanel() {
  const { log, timedEventTab } = useGameStore();
  const isBloodMoon =
    timedEventTab?.isActive && timedEventTab?.event?.title === "Blood Moon";
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [readEntries, setReadEntries] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = useMemo(
    () => log.slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES).reverse(),
    [log],
  );

  // Auto-scroll to top when new entries are added
  useEffect(() => {
    if (log.length > prevLogLengthRef.current && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevLogLengthRef.current = log.length;
  }, [log.length]);

  useEffect(() => {
    // Check for new entries with visual effects
    recentEntries.forEach((entry) => {
      if (entry.visualEffect && !activeEffects.has(entry.id)) {
        setActiveEffects((prev) => new Set(prev).add(entry.id));

        // Remove effect after duration
        const timerId = setTimeout(() => {
          setActiveEffects((prev) => {
            const newSet = new Set(prev);
            newSet.delete(entry.id);
            return newSet;
          });
          timersRef.current.delete(entry.id);
        }, 0);

        timersRef.current.set(entry.id, timerId);
      }
    });

    // Cleanup
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, [recentEntries]);

  return (
    <div className="h-[18vh] min-h-[6rem] pt-2 overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="px-3 relative ">
          <div ref={topRef} />
          <div className="space-y-1 text-xs">
            {recentEntries.map((entry: any, index: number) => {
              const typedEntry = entry as ExtendedLogEntry;
              let opacity = "";
              if (recentEntries.length >= GAME_CONSTANTS.LOG_MAX_ENTRIES) {
                if (index === recentEntries.length - 1) {
                  opacity = "opacity-20";
                } else if (index === recentEntries.length - 2) {
                  opacity = "opacity-40";
                } else if (index === recentEntries.length - 3) {
                  opacity = "opacity-60";
                } else if (index === recentEntries.length - 4) {
                  opacity = "opacity-80";
                }
              }

              // Determine if this entry has an active visual effect
              const hasActiveEffect = activeEffects.has(typedEntry.id);
              const effectClass =
                hasActiveEffect && typedEntry.visualEffect
                  ? `log-${typedEntry.visualEffect.type}`
                  : "";

              const isUnread = !readEntries.has(typedEntry.id);
              const showNewIndicator = isUnread;

              const handleMouseEnter = () => {
                if (readEntries.has(typedEntry.id)) return;
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = setTimeout(() => {
                  setReadEntries((prev) => new Set(prev).add(typedEntry.id));
                }, 300);
              };

              const handleMouseLeave = () => {
                if (hoverTimerRef.current) {
                  clearTimeout(hoverTimerRef.current);
                  hoverTimerRef.current = null;
                }
              };

              return (
                <div
                  key={typedEntry.id}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className={`flex items-start gap-2 text-foreground leading-relaxed py-0.5 ${opacity} ${effectClass}`}
                  style={
                    hasActiveEffect && typedEntry.visualEffect
                      ? ({
                          "--effect-duration": `${typedEntry.visualEffect.duration}s`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {showNewIndicator ? (
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white animate-pulse"
                      aria-hidden={true}
                    />
                  ) : (
                    <span className="w-1 shrink-0" aria-hidden={true} />
                  )}
                  <span className="flex-1 min-w-0">
                    {typeof typedEntry.message === "string"
                      ? typedEntry.message
                      : JSON.stringify(typedEntry.message)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Gradient overlay at bottom of content area */}
        <div className="absolute bottom-[-1px] left-0 right-0 h-12 pointer-events-none overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-t to-transparent ${isBloodMoon ? "from-[hsl(0_50%_5%)]" : "from-background"}`}
          ></div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

export default React.memo(LogPanel);
