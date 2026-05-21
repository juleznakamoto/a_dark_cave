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

interface EmailConfirmedDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailConfirmedDialog({
  isOpen,
  onClose,
}: EmailConfirmedDialogProps) {
  const { t } = useTranslation("ui");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">
            {t("emailConfirmed.title")}
          </DialogTitle>
          <DialogDescription className="py-2 space-y-2">
            <div className="text-center space-y-2">
              <div className="bg-green-600/10 border border-green-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-green-600">
                  {t("emailConfirmed.description")}
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full font-medium">
            {t("common:buttons.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
