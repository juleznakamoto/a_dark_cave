import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";

export default function GamblerForfeitNoticeDialog() {
  const notice = useGameStore((s) => s.gamblerForfeitNotice);
  const clearGamblerForfeitNotice = useGameStore(
    (s) => s.clearGamblerForfeitNotice,
  );

  return (
    <Dialog
      open={notice != null}
      onOpenChange={(open) => {
        if (!open) clearGamblerForfeitNotice();
      }}
    >
      <DialogContent
        className="z-[75] sm:max-w-sm border-2 border-amber-900/50"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">Gambler forfeit</DialogTitle>
          <DialogDescription asChild>
            <div className="text-xs text-muted-foreground space-y-3">
              <p>
                You left before the dice game finished. The obsessed gambler took
                your silence as forfeit.
              </p>
              {notice != null && (
                <p className="font-medium text-red-900 dark:text-red-400 tabular-nums">
                  Bet forfeited: {notice.wager} Gold
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-900/50"
            onClick={() => clearGamblerForfeitNotice()}
            button_id="gambler-forfeit-notice-ok"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
