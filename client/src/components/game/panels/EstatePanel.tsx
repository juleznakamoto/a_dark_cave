
import React from 'react';
import { useGameStore } from '@/game/state';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function EstatePanel() {
  const state = useGameStore();

  return (
    <ScrollArea className="h-full w-full">
      <div className="space-y-4 pb-4">
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">Estate</h3>
          <p className="text-sm text-muted-foreground">
            Your personal estate - coming soon!
          </p>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
