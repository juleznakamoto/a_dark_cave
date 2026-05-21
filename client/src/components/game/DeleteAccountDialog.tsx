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

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteAccountDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation("ui");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isDeleting && onClose()}
    >
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">
            {t("deleteAccount.title")}
          </DialogTitle>
          <DialogDescription className="py-2 space-y-2 text-left">
            <p>{t("deleteAccount.description")}</p>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isDeleting}
            button_id="delete-account-cancel"
          >
            {t("deleteAccount.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
            disabled={isDeleting}
            button_id="delete-account-confirm"
          >
            {isDeleting
              ? t("deleteAccount.deleting")
              : t("deleteAccount.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
