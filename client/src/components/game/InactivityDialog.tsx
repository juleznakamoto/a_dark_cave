
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
          <DialogTitle>
            {isMultiTab && 'Game Stopped - Another Tab is Active'}
            {isTimeout && 'Game Stopped Due to Inactivity'}
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            {isMultiTab && (
              <>
                <p>You have this game open in multiple tabs.</p>
                <p>The game can only run in one tab at a time to prevent conflicts.</p>
                <p className="font-semibold">Please reload this page to continue playing here, or switch to the other tab.</p>
              </>
            )}
            {isTimeout && (
              <>
                <p>You have been inactive for 15 minutes.</p>
                <p>The game has been stopped and your progress has been saved.</p>
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
