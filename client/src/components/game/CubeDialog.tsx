import React, { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LogEntry } from "@/game/rules/events";
import { cubeEvents } from "@/game/rules/eventsCube";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { chromeRuleColorStyle, useDestroyedChrome } from "@/components/game/gameChrome";
import { Button } from "@/components/ui/button";
import { audioManager, SOUND_VOLUME } from "@/lib/audio";
import { shouldDismissEventWithoutApplying } from "@/game/demoLimit";
import {
  getAdjacentUnlockedCubeEventIds,
  isDemoEndCubeEventCompleted,
} from "@/game/demoEndCatalog";
import { useGameStore } from "@/game/state"; // Import useGameStore
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { navigateSpa } from "@/lib/spaNavigate";
import { buildLocalizedEventLogEntry } from "@/i18n/buildEventLogEntry";
import {
  getEventTitle,
  getEventMessage,
  getEventChoiceLabel,
} from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import {
  cubeHeartbeatBoxShadow,
  heartbeatGlowIntensity,
} from "@/components/game/cubeHeartbeatGlow";
import { cubeMemorySwipeDirection } from "@/components/game/cubeMemorySwipe";

function CubeEventArrow({
  direction,
  label,
  onClick,
}: {
  direction: "previous" | "next";
  label: string;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      data-testid={`cube-event-${direction}`}
      data-direction={direction}
      onClick={onClick}
      className={cn(
        // Inside the dialog so a click is not treated as an outside press.
        // The cube is translated, so fixed would stick to the frame anyway.
        // Center with top, not translate. The open click lock sets
        // `transform: none` on buttons, which would drop a translate and
        // jump the arrow up when the button becomes clickable.
        // ~30% larger than the old h-11 / h-6 (2.75rem / 1.5rem).
        "cube-event-arrow absolute z-30 flex h-[3.575rem] w-[3.575rem] items-center justify-center text-muted-foreground opacity-70 transition-[opacity,color] hover:text-white hover:opacity-100",
      )}
    >
      <Icon className="h-[1.95rem] w-[1.95rem]" aria-hidden />
    </button>
  );
}

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
  const { t } = useUiTranslation();
  const chromeOn = useDestroyedChrome();
  const glowRef = useRef<HTMLDivElement>(null);
  const swipeSurfaceRef = useRef<HTMLDivElement>(null);
  const pagingRef = useRef({
    viewOnly: false,
    previousId: null as string | null,
    nextId: null as string | null,
    show: (_targetId: string, _trackId: string) => {},
  });
  const events = useGameStore((s) => s.events);
  const relics = useGameStore((s) => s.relics);

  useEffect(() => {
    if (isOpen) {
      // Crossfade: BGM fades out while cube hum and heartbeat fade in.
      audioManager.startEventAmbience(
        "whisperingCube",
        SOUND_VOLUME.whisperingCube,
      );
      audioManager.startEventAmbience("heartbeat", SOUND_VOLUME.heartbeat);
    } else {
      audioManager.stopEventAmbience("whisperingCube");
      audioManager.stopEventAmbience("heartbeat");
    }

    return () => {
      audioManager.stopEventAmbience("whisperingCube");
      audioManager.stopEventAmbience("heartbeat");
    };
  }, [isOpen]);

  // The CSS lub-dub is a different tempo. Follow the file so each thump lights the frame.
  useEffect(() => {
    if (!isOpen) return;
    let frame = 0;
    const tick = () => {
      const node = glowRef.current;
      const fraction = audioManager.getLoopFraction("heartbeat");
      if (node) {
        if (fraction == null) {
          node.style.animation = "";
          node.style.boxShadow = "";
        } else {
          node.style.animation = "none";
          node.style.boxShadow = cubeHeartbeatBoxShadow(
            heartbeatGlowIntensity(fraction),
          );
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      const node = glowRef.current;
      if (!node) return;
      node.style.animation = "";
      node.style.boxShadow = "";
    };
  }, [isOpen]);

  // Estate rereads: a sideways finger swipe pages the memory. Buttons keep
  // their own taps, so Close and the arrows are not swipes.
  useEffect(() => {
    const node = swipeSurfaceRef.current;
    if (!node || !isOpen) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const stopTracking = () => {
      tracking = false;
    };

    const onStart = (touchEvent: TouchEvent) => {
      if (touchEvent.touches.length !== 1) {
        tracking = false;
        return;
      }
      const target = touchEvent.target;
      if (target instanceof Element && target.closest("button")) {
        tracking = false;
        return;
      }
      const touch = touchEvent.touches[0];
      if (!touch) return;
      tracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    };

    const onEnd = (touchEvent: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const paging = pagingRef.current;
      if (!paging.viewOnly) return;
      const touch = touchEvent.changedTouches[0];
      if (!touch) return;
      const direction = cubeMemorySwipeDirection(
        touch.clientX - startX,
        touch.clientY - startY,
      );
      if (!direction) return;
      const targetId = direction === "next" ? paging.nextId : paging.previousId;
      if (!targetId) return;
      touchEvent.preventDefault();
      paging.show(
        targetId,
        direction === "next"
          ? `cube-swipe-next-${targetId}`
          : `cube-swipe-prev-${targetId}`,
      );
    };

    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchend", onEnd, { passive: false });
    node.addEventListener("touchcancel", stopTracking);
    return () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchend", onEnd);
      node.removeEventListener("touchcancel", stopTracking);
    };
  }, [isOpen, event?.id]);

  // Guard against null/undefined event
  if (!event) {
    return null;
  }

  const eventChoices = event.choices || [];

  const handleClose = async () => {
    onChoice(eventChoices[0]?.id);

    if (shouldDismissEventWithoutApplying(useGameStore.getState(), event)) {
      return;
    }

    const baseEventId = event?.id?.split("-")?.[0] ?? "";
    const cruelMode = useGameStore.getState().cruelMode;
    // Normal: recognition (15). Cruel: skull-device epilogue (16) before end screen.
    const isFinalCubeEvent = cruelMode
      ? baseEventId === "cube16a" || baseEventId === "cube16b"
      : baseEventId === "cube15a" || baseEventId === "cube15b";

    if (isFinalCubeEvent) {
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
        navigateSpa("/end-screen");
      }, 500);
    }
  };

  const eventId = event.eventId || event.id?.split("-")?.[0] || "cube";
  // Archive rereads only. A live cube still has to be closed so its choice applies.
  const { previousId, nextId } = event.viewOnly
    ? getAdjacentUnlockedCubeEventIds({ events, relics }, eventId)
    : { previousId: null, nextId: null };

  const showUnlockedCube = (targetId: string) => {
    const eventDef = cubeEvents[targetId];
    if (!eventDef) return;
    const state = useGameStore.getState();
    if (!state.eventDialog.isOpen || !state.eventDialog.currentEvent?.viewOnly) return;
    if (!isDemoEndCubeEventCompleted(state, targetId)) return;
    const logEntry: LogEntry = {
      ...buildLocalizedEventLogEntry(targetId, eventDef, state),
      viewOnly: true,
      skipSound: true,
    };
    useGameStore.setState((current) => ({
      eventDialog: {
        ...current.eventDialog,
        isOpen: true,
        currentEvent: logEntry,
      },
    }));
  };
  const canPage = Boolean(previousId || nextId);
  pagingRef.current = {
    viewOnly: Boolean(event.viewOnly),
    previousId,
    nextId,
    show: (targetId, trackId) => {
      useGameStore.getState().trackButtonClick(trackId);
      showUnlockedCube(targetId);
    },
  };
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
      <DialogContent
        ref={swipeSurfaceRef}
        openClickLockKey={event.id}
        // Estate rereads are a deliberate open. Close and the paging arrows
        // stay live, including when an arrow swaps in the next memory.
        openClickLockMs={event.viewOnly ? 0 : undefined}
        className={cn(
          "cube-dialog-content [&>.adc-dialog-close]:hidden border-2 border-gray-400 shadow-2xl flex flex-col overflow-visible z-[100]",
          canPage && "cube-dialog-content--paging",
        )}
        style={chromeRuleColorStyle("#9ca3af")}
      >
        {previousId && (
          <CubeEventArrow
            direction="previous"
            label={t("cube.previous", { defaultValue: "Previous cube" })}
            onClick={() => {
              useGameStore.getState().trackButtonClick(`cube-prev-${previousId}`);
              showUnlockedCube(previousId);
            }}
          />
        )}
        {nextId && (
          <CubeEventArrow
            direction="next"
            label={t("cube.next", { defaultValue: "Next cube" })}
            onClick={() => {
              useGameStore.getState().trackButtonClick(`cube-next-${nextId}`);
              showUnlockedCube(nextId);
            }}
          />
        )}
        <div
          ref={glowRef}
          className="absolute inset-0 -z-10 cube-dialog-glow pointer-events-none rounded-[inherit]"
        ></div>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="pr-0 text-lg font-semibold">
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
            {resolvedMessage}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 items-end justify-center pt-4">
          <Button
            onClick={handleClose}
            variant="outline"
            size="sm"
            className={
              chromeOn
                ? "px-8 rounded-lg hover:bg-black/0 hover:text-gray-100"
                : "px-8 rounded-lg border-2 border-gray-400 hover:bg-black/0 hover:text-gray-100 hover:border-gray-300"
            }
            style={chromeOn ? chromeRuleColorStyle("#9ca3af") : undefined}
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