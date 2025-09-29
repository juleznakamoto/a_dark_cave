import React from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/rules/events";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function LogPanel() {
  const { log } = useGameStore();

  // Get only the last 10 entries and reverse them so latest is at top
  const recentEntries = log.slice(-10).reverse();

  return (
    <div className="h-48">
      <ScrollArea className="h-full max-h-full">
        <div className="p-4">
          <div className="space-y-2 text-sm">
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

              return (
                <div key={entry.id} className="pl-3">
                  <p className={`text-foreground leading-relaxed ${opacity}`}>
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