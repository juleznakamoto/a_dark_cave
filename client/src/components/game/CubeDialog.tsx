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
      <DialogContent className="[&>button]:hidden border-0 rounded-none shadow-2xl p-6 !w-[20rem] !h-[20rem] max-w-[20rem] max-h-[20rem] flex flex-col cube-dialog-glow">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {event.title || "Strange Encounter"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex items-end justify-center pb-2">
          <Button
            onClick={() => onChoice(eventChoices[0]?.id)}
            variant="outline"
            size="sm"
            className="px-8 border-2 border-gray-400 rounded-none"
            disabled={fallbackExecutedRef.current}
          >
            {eventChoices[0]?.label || "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}