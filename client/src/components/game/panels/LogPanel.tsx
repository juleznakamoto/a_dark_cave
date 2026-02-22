import React, { useEffect, useState, useRef, useMemo } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GAME_CONSTANTS } from "@/game/constants";

function LogPanel() {
  const { log, timedEventTab } = useGameStore();
  const isBloodMoon =
    timedEventTab?.isActive && timedEventTab?.event?.title === "Blood Moon";
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [readEntries, setReadEntries] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);
  const firstShownRef = useRef<Map<string, number>>(new Map());

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

    // Cleanup only on unmount
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, [recentEntries]);

  return (
    <div className="h-[18vh] min-h-[6rem] pt-2 overflow-hidden">
      <ScrollArea className="h-full w-full">
        <div className="px-3 relative ">
          <div ref={topRef} />
          <div className="space-y-1 text-xs">
            {recentEntries.map((entry: LogEntry, index: number) => {
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
              const hasActiveEffect = activeEffects.has(entry.id);
              const effectClass =
                hasActiveEffect && entry.visualEffect
                  ? `log-${entry.visualEffect.type}`
                  : "";

              // Track when entry was first shown (for 300ms minimum before hover can dismiss)
              if (!firstShownRef.current.has(entry.id)) {
                firstShownRef.current.set(entry.id, Date.now());
              }
              const firstShown = firstShownRef.current.get(entry.id) ?? 0;
              const isUnread = !readEntries.has(entry.id);
              const showNewIndicator = isUnread;

              const handleMouseEnter = () => {
                if (Date.now() - firstShown >= 300) {
                  setReadEntries((prev) => new Set(prev).add(entry.id));
                }
              };

              // Log the indicator status to debug
              if (showNewIndicator) {
                // console.log("Showing indicator for:", entry.id);
              }

              return (
                <div
                  key={entry.id}
                  onMouseEnter={handleMouseEnter}
                  className={`flex items-start gap-2 text-foreground leading-relaxed py-0.5 ${opacity} ${effectClass}`}
                  style={
                    hasActiveEffect && entry.visualEffect
                      ? ({
                          "--effect-duration": `${entry.visualEffect.duration}s`,
                        } as React.CSSProperties)
                      : undefined
                  }
                >
                  {showNewIndicator ? (
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary animate-pulse"
                      aria-hidden={true}
                    />
                  ) : (
                    <span className="w-1.5 shrink-0" aria-hidden={true} />
                  )}
                  <span className="flex-1 min-w-0">
                    {typeof entry.message === "string"
                      ? entry.message
                      : JSON.stringify(entry.message)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Gradient overlay at bottom of content area */}
        <div className="absolute bottom-[-1px] left-0 right-0 h-12 pointer-events-none overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-t to-transparent ${isBloodMoon ? 'from-[hsl(0_50%_5%)]' : 'from-background'}`}></div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

export default React.memo(LogPanel);
