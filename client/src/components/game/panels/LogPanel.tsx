import React, { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollAreaWithIndicator } from "@/components/ui/scroll-area-with-indicator";
import { GAME_CONSTANTS } from "@/game/constants";
import {
  isNewVillagerLogEntry,
  resolveLogPanelMessage,
} from "@/i18n/logDisplay";

// Extended log entry type to support "production" type if it exists in the data
type ExtendedLogEntry =
  | LogEntry
  | {
    message: string;
    type: "production";
    id: string;
    timestamp: number;
  };

const MARK_READ_HOVER_MS = 300;

function LogPanel() {
  const { i18n } = useTranslation("ui");
  const { log, timedEventTab } = useGameStore();
  const isBloodMoon =
    timedEventTab?.isActive && timedEventTab?.event?.title === "Blood Moon";
  const [readEntries, setReadEntries] = useState<Set<string>>(
    () => new Set(log.map((entry) => entry.id)),
  );
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);
  const markReadTimeoutsRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  useEffect(() => {
    return () => {
      markReadTimeoutsRef.current.forEach(clearTimeout);
      markReadTimeoutsRef.current.clear();
    };
  }, []);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = useMemo(
    () => log.slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES).reverse(),
    [log, i18n.language],
  );

  // Auto-scroll to top when new entries are added
  useEffect(() => {
    if (log.length > prevLogLengthRef.current && topRef.current) {
      topRef.current.scrollIntoView({ behavior: "smooth" });
    }
    prevLogLengthRef.current = log.length;
  }, [log.length]);

  return (
    <div className="h-[18vh] min-h-[6rem] md:h-full md:min-h-0 pt-2 md:pt-0 overflow-hidden">
      <ScrollAreaWithIndicator
        className="h-full w-full"
        showIndicatorWhen={recentEntries.length >= 8}
        scrollAreaId="event-log"
      >
        <div className="pl-1 relative">
          <div ref={topRef} />
          <div className="space-y-1 text-xs pb-1">
            {recentEntries.map((entry: any, index: number) => {
              const typedEntry = entry as ExtendedLogEntry;
              const isUnread = !readEntries.has(typedEntry.id);

              let opacity = "";
              if (!isUnread) {
                opacity = "opacity-70";
              } else if (recentEntries.length >= GAME_CONSTANTS.LOG_MAX_ENTRIES) {
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
              const showNewIndicator = isUnread;
              const isNewVillager = isNewVillagerLogEntry(typedEntry as LogEntry);
              const blinkClass = isUnread ? "animate-pulse" : "";

              const startMarkReadTimer = () => {
                if (!isUnread) return;

                const existing = markReadTimeoutsRef.current.get(typedEntry.id);
                if (existing) clearTimeout(existing);

                const timeout = setTimeout(() => {
                  markReadTimeoutsRef.current.delete(typedEntry.id);
                  setReadEntries((prev) => new Set(prev).add(typedEntry.id));
                }, MARK_READ_HOVER_MS);

                markReadTimeoutsRef.current.set(typedEntry.id, timeout);
              };

              const cancelMarkReadTimer = () => {
                const timeout = markReadTimeoutsRef.current.get(typedEntry.id);
                if (timeout) {
                  clearTimeout(timeout);
                  markReadTimeoutsRef.current.delete(typedEntry.id);
                }
              };

              return (
                <div
                  key={typedEntry.id}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "touch") return;
                    startMarkReadTimer();
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "touch") return;
                    cancelMarkReadTimer();
                  }}
                  onPointerDown={(e) => {
                    if (e.pointerType !== "touch") return;
                    startMarkReadTimer();
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType !== "touch") return;
                    cancelMarkReadTimer();
                  }}
                  onPointerCancel={cancelMarkReadTimer}
                  className={`flex items-start gap-2 text-foreground leading-relaxed py-0.5 ${opacity} ${blinkClass}`}
                >
                  {showNewIndicator ? (
                    <span
                      className={`mt-2 h-1 w-1 shrink-0 rounded-full ${isNewVillager ? "bg-white" : "bg-primary"
                        }`}
                      aria-hidden={true}
                    />
                  ) : (
                    <span className="w-1 shrink-0" aria-hidden={true} />
                  )}
                  <span className="flex-1 min-w-0">
                    {resolveLogPanelMessage(typedEntry as LogEntry)}
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
      </ScrollAreaWithIndicator>
    </div>
  );
}

export default React.memo(LogPanel);
