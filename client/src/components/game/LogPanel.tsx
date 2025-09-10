import React from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/events";

export default function LogPanel() {
  const { log } = useGameStore();

  // Get only the last 10 entries
  const recentEntries = log.slice(-10);

  return (
    <div className="space-y-3 text-sm">
      {recentEntries.map((entry: LogEntry, index: number) => {
        const isThirdLast = index === recentEntries.length - 3;
        const isSecondLast = index === recentEntries.length - 2;
        const isLast = index === recentEntries.length - 1;

        let opacity = "";
        if (recentEntries.length >= 10) {
          if (isLast) {
            opacity = "opacity-40";
          } else if (isSecondLast) {
            opacity = "opacity-60";
          } else if (isThirdLast) {
            opacity = "opacity-80";
          }
        }

        return (
          <div key={entry.id} className="border-l-2 border-transparent pl-3">
            <p className={`text-foreground leading-relaxed ${opacity}`}>
              {entry.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
