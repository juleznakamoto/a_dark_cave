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
import { logger } from '@/lib/logger';

export default function InactivityDialog() {
  const { inactivityReason } = useGameStore();

  const handleReload = () => {
    logger.log('[INACTIVITY] User clicked reload button');
    window.location.reload();
  };

  const isMultiTab = inactivityReason === 'multitab';
  const isTimeout = inactivityReason === 'timeout';

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle className="leading-6">
            {isMultiTab && 'Another Login detected'}
            {isTimeout && 'Game stopped due to inactivity'}
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            {isMultiTab && (
              <>
                <p>Your account was logged in from another device or browser.</p>
                <p>To protect your save data, only one active session is allowed at a time.</p>
                <p className="font-semibold mt-3">If this was you:</p>
                <p className="ml-4">• Close the other session and reload this page</p>
                <p className="font-semibold mt-2">If this wasn't you:</p>
                <p className="ml-4">• Change your password immediately</p>
                <p className="ml-4">• Then reload this page to continue</p>
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