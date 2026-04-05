import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">Delete account</DialogTitle>
          <DialogDescription className="py-2 space-y-2 text-left">
            <p>
              This permanently deletes your login, purchases record, leaderboard
              entry, and analytics tied to your account. Your device save will be
              cleared.
            </p>
            <p className="text-muted-foreground text-sm">
              An anonymized copy of your cloud progress may be kept for aggregate
              game statistics (no account link).
            </p>
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
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            variant="destructive"
            className="flex-1"
            disabled={isDeleting}
            button_id="delete-account-confirm"
          >
            {isDeleting ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
