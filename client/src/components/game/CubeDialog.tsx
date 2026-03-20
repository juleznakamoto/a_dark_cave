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
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { useGameStore } from "@/game/state"; // Import useGameStore
import { logger } from "@/lib/logger";

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
  // Guard against null/undefined event
  if (!event) {
    return null;
  }

  const eventChoices = event.choices || [];

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (isOpen) {
      timeoutId = setTimeout(() => {
        audioManager.playLoopingSound('whisperingCube', SOUND_VOLUME.whisperingCube);
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

  const handleClose = async () => {
    audioManager.stopLoopingSound('whisperingCube');
    onChoice(eventChoices[0]?.id);

    // Check if this is one of the final cube events (cube15a or cube15b)
    if (event?.id?.includes('cube15a') || event?.id?.includes('cube15b')) {
      const completionLogId = "game-finished";
      const completionMessage =
        "You have finished this journey. Stay here or start a new game. Maybe in Cruel Mode, if you dare.";

      const currentState = useGameStore.getState();
      const hasCompletionLog = currentState.log.some(
        (entry) => entry.id === completionLogId,
      );

      if (!hasCompletionLog) {
        currentState.addLogEntry({
          id: completionLogId,
          message: completionMessage,
          timestamp: Date.now(),
          type: "system",
        });
      }

      // Save the game state before navigating
      const { saveGame } = await import('@/game/save');
      const state = useGameStore.getState();

      try {
        await saveGame(state, false); // Force save, not autosave
      } catch (error) {
        logger.error('[CUBE] Failed to save game state before end screen:', error);
      }

      // Navigate to end screen page after save completes
      setTimeout(() => {
        window.location.href = "/end-screen";
      }, 500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="[&>button]:hidden border-2 border-gray-400 shadow-2xl p-6 w-[95vw] h-[19rem] max-w-[20rem] max-h-[19rem] flex flex-col overflow-visible z-[100]">
        <div className="absolute inset-0 -z-10 cube-dialog-glow pointer-events-none"></div>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {event.title || "The Whispering Cube"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {event.message || "The cube whispers ancient secrets..."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-end justify-center">
          <Button
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="px-8 border-2 border-gray-700 rounded-lg hover:bg-black/0 hover:text-gray-100 hover:border-gray-400"
            disabled={fallbackExecutedRef.current}
            button_id={`cube-close-${event?.id || 'unknown'}`}
          >
            {eventChoices[0]?.label || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}