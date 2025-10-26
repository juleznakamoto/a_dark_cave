import React from "react";
import { LogEntry } from "@/game/rules/events";
import { GameState } from "@shared/schema";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface MerchantDialogProps {
  event: LogEntry;
  gameState: GameState;
  timeRemaining: number | null;
  totalTime: number;
  progress: number;
  purchasedItems: Set<string>;
  fallbackExecutedRef: React.MutableRefObject<boolean>;
  onChoice: (choiceId: string) => void;
  hasScriptorium: boolean;
}

export default function MerchantDialog({
  event,
  gameState,
  timeRemaining,
  progress,
  purchasedItems,
  fallbackExecutedRef,
  onChoice,
}: MerchantDialogProps) {
  const eventChoices = event.choices || [];

  return (
    <DialogPortal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/0 animate-[fade-to-black_8s_ease-in-out_forwards]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg sm:max-w-md [&>button]:hidden",
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {event.title || "Strange Encounter"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400 mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Trade buttons and Say Goodbye button in 2-column grid */}
          <div className="grid grid-cols-2 gap-2">
            {eventChoices
              .filter(
                (choice) =>
                  choice.id.startsWith("trade_") &&
                  choice.id !== "say_goodbye",
              )
              .map((choice) => {
                // Check if choice can be afforded (for merchant trades)
                const testResult = choice.effect(gameState);
                const canAfford = Object.keys(testResult).length > 0;
                const isPurchased = purchasedItems.has(choice.id);

                const buttonContent = (
                  <Button
                    key={choice.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChoice(choice.id);
                    }}
                    variant="outline"
                    className={`w-full justify-center text-xs h-10 ${isPurchased ? "opacity-30" : ""}`}
                    disabled={
                      (timeRemaining !== null && timeRemaining <= 0) ||
                      fallbackExecutedRef.current ||
                      !canAfford ||
                      isPurchased
                    }
                  >
                    <span className="block text-left leading-tight">
                      {isPurchased ? `✓ ${choice.label}` : choice.label}
                    </span>
                  </Button>
                );

                // If there's cost info, wrap in HoverCard
                if (choice.cost && !isPurchased) {
                  return (
                    <HoverCard key={choice.id} openDelay={100} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div onFocus={(e) => e.preventDefault()}>{buttonContent}</div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-auto p-2" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <div className="text-xs whitespace-nowrap">
                          -{choice.cost}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                }

                return buttonContent;
              })}

            {/* Say Goodbye button in the same grid */}
            {eventChoices.find((choice) => choice.id === "say_goodbye") && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onChoice("say_goodbye");
                }}
                variant="outline"
                className="text-xs h-10 px-4"
                disabled={
                  (timeRemaining !== null && timeRemaining <= 0) ||
                  fallbackExecutedRef.current
                }
              >
                Say Goodbye
              </Button>
            )}
          </div>
        </div>

        {/* Timer bar for timed choices */}
        {event.isTimedChoice && timeRemaining !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground"></div>
            <Progress
              value={progress}
              className="h-2 timer-progress"
            />
          </div>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}