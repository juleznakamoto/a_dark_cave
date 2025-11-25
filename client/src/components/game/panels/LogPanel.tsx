import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GAME_CONSTANTS } from "@/game/constants";

export default function LogPanel() {
  const { log } = useGameStore();
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = log.slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES).reverse();

  // Scroll to top when new entries are added
  useEffect(() => {
    if (log.length > prevLogLengthRef.current) {
      const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
    prevLogLengthRef.current = log.length;
  }, [log.length]);

  useEffect(() => {
    // Check for new entries with visual effects
    recentEntries.forEach((entry) => {
      if (entry.visualEffect && !activeEffects.has(entry.id)) {
        setActiveEffects((prev) => new Set(prev).add(entry.id));

        // Remove effect after duration
        const duration = entry.visualEffect.duration * 1000;
        const timerId = setTimeout(() => {
          setActiveEffects((prev) => {
            const newSet = new Set(prev);
            newSet.delete(entry.id);
            return newSet;
          });
          timersRef.current.delete(entry.id);
        }, duration);
        
        timersRef.current.set(entry.id, timerId);
      }
    });

    // Cleanup function: clear all active timers
    return () => {
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, [recentEntries]);

  return (
    <div className="h-[18vh] min-h-[6rem] pt-2 overflow-hidden">
      <ScrollArea ref={scrollAreaRef} className="h-full w-full">
        <div className="px-3 relative">
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

              return (
                <div key={entry.id}>
                  <p
                    className={`text-foreground leading-relaxed ${opacity} ${effectClass}`}
                    style={
                      hasActiveEffect && entry.visualEffect
                        ? ({
                            "--effect-duration": `${entry.visualEffect.duration}s`,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {typeof entry.message === "string"
                      ? entry.message
                      : JSON.stringify(entry.message)}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Gradient overlay at bottom of content area */}
          <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-background to-transparent"></div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
