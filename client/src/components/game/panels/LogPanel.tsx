import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function LogPanel() {
  const { log } = useGameStore();
  const [newEntryIds, setNewEntryIds] = useState<Set<string>>(new Set());
  const previousLogLength = useRef(log.length);

  // Get only the last 10 entries and reverse them so latest is at top
  const recentEntries = log.slice(-10).reverse();

  // Track new entries and apply blur effect
  useEffect(() => {
    if (log.length > previousLogLength.current) {
      // Get the new entries (those added since last check)
      const newEntries = log.slice(previousLogLength.current);
      const newIds = new Set(newEntries.map(entry => entry.id));
      
      setNewEntryIds(newIds);
      
      // Remove blur after 500ms
      const timer = setTimeout(() => {
        setNewEntryIds(new Set());
      }, 500);

      previousLogLength.current = log.length;
      
      return () => clearTimeout(timer);
    }
  }, [log.length]);

  return (
    <div className="h-48">
      <ScrollArea className="h-full max-h-full">
        <div className="p-4">
          <div className="space-y-2 text-sm">
            {recentEntries.map((entry: LogEntry, index: number) => {
              const isNewEntry = newEntryIds.has(entry.id);

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

              return (
                <div key={entry.id} className="pl-3">
                  <p className={`text-foreground leading-relaxed transition-all duration-500 ${opacity} ${
                    isNewEntry ? 'blur-sm' : 'blur-none'
                  }`}>
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