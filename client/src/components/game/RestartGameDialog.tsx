import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { useSteamEditionActive } from "@/hooks/useSteamEditionActive";

interface RestartGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RestartGameDialog({
  isOpen,
  onClose,
  onConfirm,
}: RestartGameDialogProps) {
  const { t } = useUiTranslation();
  const isSteamEdition = useSteamEditionActive();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">{t("restart.title")}</DialogTitle>
        </DialogHeader>

        <DialogDescription asChild className="py-2">
          <div className="w-full text-center">
            <div className="w-full rounded-lg border border-red-600/50 bg-red-600/5 p-3">
              <p className="text-md font-medium text-red-600">
                {isSteamEdition
                  ? t("restart.warning")
                  : t("restart.warningWeb", {
                    defaultValue:
                      "Starting a new game will erase your current progress and reset all achievements except Epic Achievements.",
                  })}
              </p>
            </div>
          </div>
        </DialogDescription>

        <DialogFooter className="grid w-full grid-cols-2 gap-2 sm:space-x-0">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
            button_id="restart-cancel"
          >
            {t("restart.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="w-full"
            button_id="restart-confirm"
          >
            {t("restart.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
