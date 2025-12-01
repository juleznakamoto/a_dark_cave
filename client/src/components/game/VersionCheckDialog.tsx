
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface VersionCheckDialogProps {
  isOpen: boolean;
  onReload: () => void;
}

export default function VersionCheckDialog({ isOpen, onReload }: VersionCheckDialogProps) {
  const handleReload = () => {
    logger.log('[VERSION] User clicked reload button for new version');
    onReload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideClose={true}>
        <DialogHeader>
          <DialogTitle className="leading-6">
            New Version Available
          </DialogTitle>
          <DialogDescription className="py-4 space-y-2">
            <p>A new version of the game is available with improvements and bug fixes.</p>
            <p className="font-semibold">Please reload the page to get the latest version.</p>
            <p className="text-sm opacity-70">Your progress will be saved automatically before reloading.</p>
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
