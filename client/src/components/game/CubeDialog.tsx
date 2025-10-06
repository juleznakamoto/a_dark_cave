
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
      <DialogContent className="sm:max-w-none [&>button]:hidden border-4 border-gray-400 rounded-none shadow-2xl w-[28rem] h-[28rem] max-w-[28rem] max-h-[28rem] min-w-[28rem] min-h-[28rem] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {event.title || "Strange Encounter"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-end pb-4">
          <Button
            onClick={() => onChoice(eventChoices[0]?.id)}
            variant="outline"
            className="w-full"
            disabled={fallbackExecutedRef.current}
          >
            {eventChoices[0]?.label || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
