
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function InactivityDialog() {
  const handleReload = () => {
    console.log('[INACTIVITY] User clicked reload button');
    window.location.reload();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle>Game Stopped Due to Inactivity</DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            <p>You have been inactive for 15 minutes.</p>
            <p>The game has been stopped and your progress has been saved.</p>
            <p className="font-semibold">Please reload the page to continue playing.</p>
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
