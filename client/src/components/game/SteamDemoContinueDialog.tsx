import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiTranslation } from "@/i18n/useUiTranslation";

/**
 * Start-screen only. The game loop is not running, so this flag stays in
 * page state (not GAME_DIALOG_REGISTRY).
 */
interface SteamDemoContinueDialogProps {
  isOpen: boolean;
  busy?: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

export default function SteamDemoContinueDialog({
  isOpen,
  busy = false,
  onContinue,
  onStartNew,
}: SteamDemoContinueDialogProps) {
  const { t } = useUiTranslation();

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent
        className="[--adc-dialog-max-w:28rem] z-[70]"
        hideClose
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="leading-6">
            {t("startScreen.demoContinueTitle", {
              defaultValue: "A save from the Demo was found.",
            })}
          </DialogTitle>
          <DialogDescription>
            {t("startScreen.demoContinueDescription", {
              defaultValue:
                "Would you like to continue your journey, or start a new one?",
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex w-full flex-col gap-2 pt-3 sm:flex-col sm:space-x-0">
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={onContinue}
            data-testid="button-demo-continue-journey"
          >
            {t("startScreen.demoContinueJourney", {
              defaultValue: "Continue your journey",
            })}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={onStartNew}
            data-testid="button-demo-start-new-journey"
          >
            {t("startScreen.demoStartNewJourney", {
              defaultValue: "Start a new journey",
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
