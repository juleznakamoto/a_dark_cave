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

export default function PlaylightWelcomeDialog() {
  const open = useGameStore((s) => s.playlightWelcomeDialogOpen);
  const discountLine = useGameStore(
    (s) => s.story?.seen?.playlightFirstPurchaseDiscountActive === true,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          useGameStore.setState({ playlightWelcomeDialogOpen: false });
        }
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">Welcome, Playlight player</DialogTitle>
          <DialogDescription asChild>
            <div className="py-2 space-y-3 text-sm text-muted-foreground">
              <p>
                Thanks for using Playlight.{" "}
                <span className="text-foreground font-medium">
                  100 Gold
                </span>{" "}
                has been added to your inventory as a welcome gift.
              </p>
              {discountLine ? (
                <p>
                  You also get{" "}
                  <span className="text-foreground font-medium">
                    10% off your first purchase
                  </span>{" "}
                  in the shop. The discount is applied automatically.
                </p>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() =>
              useGameStore.setState({ playlightWelcomeDialogOpen: false })
            }
            className="w-full font-medium"
            button_id="playlight-welcome-continue"
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
