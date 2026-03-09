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
  };

const LOG_ENTRY_PULSE_MS = 30000;

function LogPanel() {
  const { log, timedEventTab } = useGameStore();
  const isBloodMoon =
    timedEventTab?.isActive && timedEventTab?.event?.title === "Blood Moon";
  const [readEntries, setReadEntries] = useState<Set<string>>(
    () => new Set(log.map((entry) => entry.id)),
  );
  const [pulsingEntries, setPulsingEntries] = useState<Set<string>>(new Set());
  const pulseTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);

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
    const visibleEntryIds = new Set(recentEntries.map((entry) => entry.id));

    // Only pulse the most recently added entry (first in reversed list = newest).
    const newestEntry = recentEntries[0];
    // Only add newest to pulse; do not stop previous pulses - let them finish.
    if (newestEntry && !readEntries.has(newestEntry.id) && !pulseTimersRef.current.has(newestEntry.id)) {
      setPulsingEntries((prev) => {
        const next = new Set(prev);
        next.add(newestEntry.id);
        return next;
      });

      const timerId = setTimeout(() => {
        setPulsingEntries((prev) => {
          const next = new Set(prev);
          next.delete(newestEntry.id);
          return next;
        });
        pulseTimersRef.current.delete(newestEntry.id);
      }, LOG_ENTRY_PULSE_MS);

      pulseTimersRef.current.set(newestEntry.id, timerId);
    }

    // Clear timers for entries no longer visible.
    pulseTimersRef.current.forEach((timerId, entryId) => {
      if (!visibleEntryIds.has(entryId)) {
        clearTimeout(timerId);
        pulseTimersRef.current.delete(entryId);
      }
    });
  }, [recentEntries, readEntries]);

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      pulseTimersRef.current.forEach((timerId) => clearTimeout(timerId));
      pulseTimersRef.current.clear();
    };
  }, []);

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
                  opacity = "opacity-60";
                } else if (index === recentEntries.length - 2) {
                  opacity = "opacity-70";
                } else if (index === recentEntries.length - 3) {
                  opacity = "opacity-80";
                } else if (index === recentEntries.length - 4) {
                  opacity = "opacity-90";
                }
              }

              const isUnread = !readEntries.has(typedEntry.id);
              const showNewIndicator = isUnread;
              const isPulsing = pulsingEntries.has(typedEntry.id);
              const pulseClass = isPulsing ? "animate-pulse" : "";

              const handleMouseEnter = () => {
                if (isUnread) {
                  const timerId = pulseTimersRef.current.get(typedEntry.id);
                  if (timerId) {
                    clearTimeout(timerId);
                    pulseTimersRef.current.delete(typedEntry.id);
                  }
                  setPulsingEntries((prev) => {
                    const next = new Set(prev);
                    next.delete(typedEntry.id);
                    return next;
                  });
                  setReadEntries((prev) => new Set(prev).add(typedEntry.id));
                }
              };

              return (
                <div
                  key={typedEntry.id}
                  onMouseEnter={handleMouseEnter}
                  className={`flex items-start gap-2 text-foreground leading-relaxed py-0.5 ${opacity} ${pulseClass}`}
                >
                  {showNewIndicator ? (
                    <span
                      className={`mt-2 h-1 w-1 shrink-0 rounded-full bg-white ${isPulsing ? "animate-pulse" : ""}`}
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
            className={`absolute inset-0 bg-gradient-to-t to-transparent opacity-50 ${isBloodMoon ? "from-[hsl(0_50%_5%)]" : "from-background"}`}
          ></div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}

export default React.memo(LogPanel);
