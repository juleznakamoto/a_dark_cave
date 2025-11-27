
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function MultiTabDialog() {
  const handleReload = () => {
    console.log('[MULTI-TAB] User clicked reload button');
    window.location.reload();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle>Game Stopped - Another Tab is Active</DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            <p>You have this game open in multiple tabs.</p>
            <p>The game can only run in one tab at a time to prevent conflicts.</p>
            <p className="font-semibold">Please reload this page to continue playing here, or switch to the other tab.</p>
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
