import React, { useEffect } from "react";
import { LogEntry } from "@/game/rules/events";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { audioManager } from "@/lib/audio";

interface CubeDialogProps {
  isOpen: boolean;
  event: LogEntry;
  onChoice: (choiceId: string) => void;
  fallbackExecutedRef: React.MutableRefObject<boolean>;
}

export default function CubeDialog({
  isOpen,
  event,
  onChoice,
  fallbackExecutedRef,
}: CubeDialogProps) {
  const eventChoices = event?.choices || [];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isOpen) {
      timeoutId = setTimeout(() => {
        audioManager.playLoopingSound('whisperingCube', 0.4);
      }, 500);
    } else {
      audioManager.stopLoopingSound('whisperingCube');
    }

    // Cleanup on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      audioManager.stopLoopingSound('whisperingCube');
    };
  }, [isOpen]);

  const handleClose = () => {
    audioManager.stopLoopingSound('whisperingCube');
    onChoice(eventChoices[0]?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="[&>button]:hidden border-2 border-gray-400 shadow-2xl p-6 w-[90vw] h-[19rem] max-w-[20rem] max-h-[19rem] flex flex-col overflow-visible z-[100]">
        <div className="absolute inset-0 -z-10 cube-dialog-glow pointer-events-none"></div>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {event.title || "Strange Encounter"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-end justify-center">
          <Button
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="px-8 border-2 border-gray-700 rounded-lg hover:bg-black/0 hover:text-gray-100 hover:border-gray-400"
            disabled={fallbackExecutedRef.current}
          >
            {eventChoices[0]?.label || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}