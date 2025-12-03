import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { GAME_CONSTANTS } from "@/game/constants";

export default function LogPanel() {
  const { log } = useGameStore();
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const processedStrangersRef = useRef<Set<string>>(new Set());
  const topRef = useRef<HTMLDivElement>(null);
  const prevLogLengthRef = useRef(log.length);

  // Get only the last entries and reverse them so latest is at top
  const recentEntries = log.slice(-GAME_CONSTANTS.LOG_MAX_ENTRIES).reverse();

  // Log when stranger events appear
  useEffect(() => {
    const strangerEntries = recentEntries.filter(e => e.id.startsWith('stranger-approaches-'));
    if (strangerEntries.length > 0) {
      console.log('[LogPanel] Current stranger entries:', strangerEntries.map(e => e.id));
    }
  }, [recentEntries]);

  // Auto-scroll to top when new entries are added
  useEffect(() => {
    if (log.length > prevLogLengthRef.current && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth' });
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

      // Remove new villager entries after 60 seconds
      if (entry.id.startsWith('stranger-approaches-') && !processedStrangersRef.current.has(entry.id)) {
        const timerKey = `remove-${entry.id}`;
        console.log('[LogPanel] Setting up deletion timer for:', entry.id, 'at', Date.now());
        console.log('[LogPanel] Timer will fire in 60000ms (60 seconds)');
        console.log('[LogPanel] Expected fire time:', new Date(Date.now() + 6000).toLocaleTimeString());
        
        // Mark this stranger as processed
        processedStrangersRef.current.add(entry.id);
        
        const removeTimerId = setTimeout(() => {
          console.log('[LogPanel] ⏰ TIMER FIRED for:', entry.id, 'at', Date.now());
          console.log('[LogPanel] Current time:', new Date().toLocaleTimeString());
          const currentLog = useGameStore.getState().log;
          console.log('[LogPanel] Current log length before filter:', currentLog.length);
          console.log('[LogPanel] Looking for entry with id:', entry.id);
          
          const filteredLog = currentLog.filter((logEntry) => {
            const shouldKeep = logEntry.id !== entry.id;
            if (!shouldKeep) {
              console.log('[LogPanel] ✂️ Filtering out entry:', logEntry.id);
            }
            return shouldKeep;
          });
          
          console.log('[LogPanel] Log length after filter:', filteredLog.length);
          console.log('[LogPanel] Removed', currentLog.length - filteredLog.length, 'entries');
          
          useGameStore.setState({ log: filteredLog });
          timersRef.current.delete(timerKey);
          processedStrangersRef.current.delete(entry.id);
          console.log('[LogPanel] ✅ Cleanup complete for:', entry.id);
        }, 60000); // 60 seconds
        
        timersRef.current.set(timerKey, removeTimerId);
        console.log('[LogPanel] Timer registered in timersRef with key:', timerKey, 'total active timers:', timersRef.current.size);
      }
    });
  }, [log]); // Changed dependency to log instead of recentEntries

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('[LogPanel] Component unmounting, clearing', timersRef.current.size, 'active timers');
      timersRef.current.forEach((timerId) => clearTimeout(timerId));
      timersRef.current.clear();
      processedStrangersRef.current.clear();
    };
  }, []);

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
          
        </div >{/* Gradient overlay at bottom of content area */}
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-gradient-to-t from-background to-transparent"></div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}
