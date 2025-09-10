
import React from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/events';

export default function LogPanel() {
  const { log } = useGameStore();

  // Get only the last 10 entries
  const recentEntries = log.slice(-10);

  return (
    <div className="space-y-3 text-sm">
      {recentEntries.map((entry: LogEntry) => (
        <div key={entry.id} className="border-l-2 border-amber-600 pl-3">
          <p className="text-foreground leading-relaxed">{entry.message}</p>
        </div>
      ))}
    </div>
  );
}
