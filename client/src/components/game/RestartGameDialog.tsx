import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("ui");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">{t("restart.title")}</DialogTitle>
          <DialogDescription className="py-2 space-y-2">
            <div className="text-center space-y-2">
              <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-red-600">
                  {t("restart.warning")}
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
