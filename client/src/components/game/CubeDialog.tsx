import React from "react";
import { LogEntry } from "@/game/rules/events";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="[&>button]:hidden border-2 border-gray-400 shadow-2xl p-6 !w-[20rem] !h-[19rem] max-w-[20rem] max-h-[19rem] flex flex-col overflow-visible z-[100]">
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
            onClick={() => onChoice(eventChoices[0]?.id)}
            variant="outline"
            size="sm"
            className="px-8 border-2 border-gray-400 rounded-lg hover:bg-gray-400 hover:text-gray-900"
            disabled={fallbackExecutedRef.current}
          >
            {eventChoices[0]?.label || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}