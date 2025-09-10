
import React from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/events';

export default function LogPanel() {
  const { log } = useGameStore();

  if (log.length === 0) {
    return (
      <div className="h-64 p-4 bg-slate-900 border border-border rounded-md">
        <div className="text-center text-muted-foreground text-sm">
          <p>Events and messages will appear here...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 p-4 bg-slate-900 border border-border rounded-md overflow-y-auto">
      <div className="space-y-3 font-mono text-sm">
        {log.map((entry: LogEntry) => (
          <div key={entry.id} className="border-l-2 border-amber-600 pl-3">
            <p className="text-amber-100 leading-relaxed">{entry.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
