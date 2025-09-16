import React from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/events";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function LogPanel() {
  const { log } = useGameStore();

  // Get only the last 8 entries and reverse them so latest is at top
  const recentEntries = log.slice(-8).reverse();

  return (
    <div className="h-48">
      <ScrollArea className="h-full max-h-full">
        <div className="p-4">
          <div className="space-y-2 text-sm">
            {recentEntries.map((entry: LogEntry, index: number) => {
              const isThirdLast = index === recentEntries.length - 3;
              const isSecondLast = index === recentEntries.length - 2;
              const isLast = index === recentEntries.length - 1;

              let opacity = "";
              if (recentEntries.length >= 8) {
                if (isLast) {
                  opacity = "opacity-40";
                } else if (isSecondLast) {
                  opacity = "opacity-60";
                } else if (isThirdLast) {
                  opacity = "opacity-80";
                }
              }

              return (
                <div key={entry.id} className="pl-3">
                  <p className={`text-foreground leading-relaxed ${opacity}`}>
                    {entry.message}
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