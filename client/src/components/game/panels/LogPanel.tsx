import React, { useEffect, useState } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function LogPanel() {
  const { log } = useGameStore();
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());

  // Get only the last 10 entries and reverse them so latest is at top
  const recentEntries = log.slice(-10).reverse();

  useEffect(() => {
    // Check for new entries with visual effects
    recentEntries.forEach((entry) => {
      if (entry.visualEffect && !activeEffects.has(entry.id)) {
        setActiveEffects(prev => new Set(prev).add(entry.id));
        
        // Remove effect after duration
        const duration = entry.visualEffect.duration * 1000;
        setTimeout(() => {
          setActiveEffects(prev => {
            const newSet = new Set(prev);
            newSet.delete(entry.id);
            return newSet;
          });
        }, duration);
      }
    });
  }, [recentEntries]);

  return (
    <div className="h-[18vh] min-h-[6rem] pt-2">
      <ScrollArea className="h-full max-h-full">
        <div>
          <div className="space-y-1 text-xs">
            {recentEntries.map((entry: LogEntry, index: number) => {

              let opacity = "";
              if (recentEntries.length >= 10) {
                if (index === recentEntries.length - 1) {
                  opacity = "opacity-20";
                } else if (index === recentEntries.length - 2) {
                  opacity = "opacity-40";
                } else if (index === recentEntries.length - 3) {
                  opacity = "opacity-60";
                }else if (index === recentEntries.length - 4) {
                  opacity = "opacity-80";
                }
              }

              // Determine if this entry has an active visual effect
              const hasActiveEffect = activeEffects.has(entry.id);
              const effectClass = hasActiveEffect && entry.visualEffect 
                ? `log-${entry.visualEffect.type}` 
                : '';

              return (
                <div key={entry.id} className="pl-3">
                  <p 
                    className={`text-foreground leading-relaxed ${opacity} ${effectClass}`}
                    style={hasActiveEffect && entry.visualEffect ? {
                      '--effect-duration': `${entry.visualEffect.duration}s`
                    } as React.CSSProperties : undefined}
                  >
                    {typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
}