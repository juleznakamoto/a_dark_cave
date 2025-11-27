import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/game/state';

export default function InactivityDialog() {
  const { inactivityReason } = useGameStore();

  const handleReload = () => {
    console.log('[INACTIVITY] User clicked reload button');
    window.location.reload();
  };

  const isMultiTab = inactivityReason === 'multitab';
  const isTimeout = inactivityReason === 'timeout';

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle className="leading-6">
            {isMultiTab && 'Game stopped due another tab being active'}
            {isTimeout && 'Game stopped due to inactivity'}
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            {isMultiTab && (
              <>
                <p>This game is being played in another tab or on another device.</p>
                <p>The game can only run in one place at a time to prevent save conflicts.</p>
                <p className="font-semibold">Please close the other instance and click "Reload Page" to continue playing here.</p>
              </>
            )}
            {isTimeout && (
              <>
                <p>You have been inactive for 15 minutes.</p>
                <p>To prevent bad events from happening the game has been stopped and your progress has been saved.</p>
                <p className="font-semibold">Please reload the page to continue playing.</p>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <Button onClick={handleReload} className="w-full">
            Reload Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}