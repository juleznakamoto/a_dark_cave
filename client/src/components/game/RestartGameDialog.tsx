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
          <DialogDescription asChild className="py-2">
            <div className="text-center">
              <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3">
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
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            button_id="restart-cancel"
          >
            {t("restart.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
            button_id="restart-confirm"
          >
            {t("restart.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
