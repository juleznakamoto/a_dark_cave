import React from "react";
import { useGameStore } from "@/game/state";
import { LogEntry } from "@/game/events";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function LogPanel() {
  const { logs } = useGameStore();

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events yet...</p>
        ) : (
          logs.slice(-50).map((log) => {
            // Debug log message to identify problematic objects
            if (typeof log.message === 'object') {
              console.error('Log message is an object:', log.message);
              console.error('Log object:', log);
            }

            return (
              <div
                key={log.id}
                className="text-xs p-2 rounded bg-muted/30 border-l-2 border-primary/20"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {log.type}
                  </span>
                </div>
                <p className="text-foreground leading-relaxed">
                  {typeof log.message === 'object' 
                    ? JSON.stringify(log.message) 
                    : log.message
                  }
                </p>
              </div>
            );
          })
        )}
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}