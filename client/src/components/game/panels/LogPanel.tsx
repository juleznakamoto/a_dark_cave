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
  const { log } = useGameStore();
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
    <div className="h-full min-h-0 overflow-hidden">
      <ScrollAreaWithIndicator
        className="h-full w-full"
        showIndicatorWhen={recentEntries.length >= 8}
        scrollAreaId="event-log"
      >
        <div className="pl-0 relative">
          <div ref={topRef} />
          <div className="space-y-1 text-xs pb-1">
            {recentEntries.map((entry: any, index: number) => {
              const typedEntry = entry as ExtendedLogEntry;
              const isUnread = !readEntries.has(typedEntry.id);

              let opacity = "";
              if (!isUnread) {
                opacity = "opacity-60";
              } else if (
                recentEntries.length >= GAME_CONSTANTS.LOG_MAX_ENTRIES
              ) {
                if (index === recentEntries.length - 1) {
                  opacity = "opacity-40";
                } else if (index === recentEntries.length - 2) {
                  opacity = "opacity-45";
                } else if (index === recentEntries.length - 3) {
                  opacity = "opacity-50";
                } else if (index === recentEntries.length - 4) {
                  opacity = "opacity-55";
                }
              }
              const showNewIndicator = isUnread;
              const isNewVillager = isNewVillagerLogEntry(
                typedEntry as LogEntry,
              );
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
                  className="group flex items-start gap-2 text-foreground leading-relaxed py-0.5"
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
                  <span
                    className={`flex-1 min-w-0 group-hover:opacity-100 group-hover:animate-none ${opacity} ${blinkClass}`}
                  >
                    {resolveLogPanelMessage(typedEntry as LogEntry)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollAreaWithIndicator>
    </div>
  );
}

export default React.memo(LogPanel);
