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
import {
  getEventTitle,
  getEventMessage,
  getEventChoiceLabel,
} from "@/i18n/resolveGameText";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("ui");
  // Guard against null/undefined event
  if (!event) {
    return null;
  }

  const eventChoices = event.choices || [];

  useEffect(() => {
    if (isOpen) {
      // Crossfade: BGM fades out while cube ambience fades in (same duration)
      audioManager.startEventAmbience(
        "whisperingCube",
        SOUND_VOLUME.whisperingCube,
      );
    } else {
      audioManager.stopEventAmbience("whisperingCube");
    }

    return () => {
      audioManager.stopEventAmbience("whisperingCube");
    };
  }, [isOpen]);

  const handleClose = async () => {
    onChoice(eventChoices[0]?.id);

    // Check if this is one of the final cube events (cube15a or cube15b)
    if (event?.id?.includes('cube15a') || event?.id?.includes('cube15b')) {
      const completionLogId = "game-finished";
      const completionMessage = t("cube.completionLog");

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

      useGameStore.setState((s) => ({
        story: {
          ...s.story,
          seen: {
            ...s.story.seen,
            cruelModeJourneyCompleteDiscount: true,
          },
        },
      }));

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

  const eventId = event.id?.split("-")?.[0] ?? event.id ?? "cube";
  const resolvedTitle =
    getEventTitle(eventId, event.title) ??
    event.title ??
    t("cube.fallbackTitle");
  const resolvedMessage =
    getEventMessage(eventId, event.message ?? "") ||
    event.message ||
    t("cube.fallbackMessage");
  const closeLabel =
    getEventChoiceLabel(
      eventId,
      eventChoices[0]?.id ?? "close",
      eventChoices[0]?.label ?? t("cube.close"),
    ) || t("cube.close");

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="[&>button]:hidden border-2 border-gray-400 shadow-2xl p-6 [--adc-dialog-max-w:22rem] h-[21rem] max-h-[21rem] flex flex-col overflow-visible z-[100]">
        <div className="absolute inset-0 -z-10 cube-dialog-glow pointer-events-none"></div>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {resolvedMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-end justify-center pt-4">
          <Button
            onClick={handleClose}
            variant="outline"
            size="sm"
            className="px-8 border-2 border-gray-700 rounded-lg hover:bg-black/0 hover:text-gray-100 hover:border-gray-400"
            disabled={fallbackExecutedRef.current}
            button_id={`cube-close-${event?.id || 'unknown'}`}
          >
            {closeLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}