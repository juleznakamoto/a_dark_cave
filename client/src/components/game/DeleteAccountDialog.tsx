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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isDeleting && onClose()}
    >
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">Delete account</DialogTitle>
          <DialogDescription className="py-2 space-y-2 text-left">
            <p>
              Deleting your account is permanent and cannot be undone. Your
              account, including your login credentials, purchases, leaderboard
              entries, and save games, will be deleted.
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
