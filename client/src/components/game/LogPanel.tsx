
import React from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/events';

export default function LogPanel() {
  const { log } = useGameStore();

  // Get only the last 10 entries
  const recentEntries = log.slice(-10);

  return (
    <div className="space-y-3 text-sm">
      {recentEntries.map((entry: LogEntry, index: number) => {
        const isSecondLast = index === recentEntries.length - 2;
        const isLast = index === recentEntries.length - 1;
        
        let opacity = "";
        if (isLast) {
          opacity = "opacity-50";
        } else if (isSecondLast) {
          opacity = "opacity-75";
        }
        
        return (
          <div key={entry.id} className="border-l-2 border-transparent pl-3">
            <p className={`text-foreground leading-relaxed ${opacity}`}>{entry.message}</p>
          </div>
        );
      })}
    </div>
  );
}
