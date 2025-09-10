
import React from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/events';
import CooldownButton from '@/components/CooldownButton';

export default function LogPanel() {
  const { log, applyEventChoice } = useGameStore();

  const handleChoice = (choiceId: string, eventId: string) => {
    applyEventChoice(choiceId, eventId);
  };

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
            
            {entry.choices && entry.choices.length > 0 && (
              <div className="mt-2 space-x-2">
                {entry.choices.map((choice) => (
                  <CooldownButton
                    key={choice.id}
                    onClick={() => handleChoice(choice.id, entry.id.split('-')[0])}
                    cooldownMs={(choice.cooldown || 1) * 1000}
                    variant="outline"
                    size="sm"
                    className="text-xs bg-slate-800 border-amber-600 text-amber-100 hover:bg-amber-900 hover:text-amber-50"
                  >
                    {choice.label}
                  </CooldownButton>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
