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
import {
  PLAYLIGHT_FIRST_PURCHASE_DISCOUNT_PERCENT,
  PLAYLIGHT_WELCOME_GOLD,
} from "@/game/playlightRewards";
import { useTranslation } from "react-i18next";

export default function PlaylightWelcomeDialog() {
  const { t } = useTranslation(["ui", "common"]);
  const open = useGameStore((s) => s.playlightWelcomeDialogOpen);
  const discountLine = useGameStore(
    (s) => s.story?.seen?.playlightFirstPurchaseDiscountActive === true,
  );
  const welcomeReward = t("common:currency.goldAmount", {
    amount: PLAYLIGHT_WELCOME_GOLD,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          useGameStore.setState({ playlightWelcomeDialogOpen: false });
        }
      }}
    >
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle className="leading-6">
            {t("playlight.welcomeTitle")}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="py-2 space-y-3 text-sm text-muted-foreground">
              <p>{t("playlight.welcomeGift", { reward: welcomeReward })}</p>
              {discountLine ? (
                <p>
                  {t("playlight.welcomeDiscount", {
                    percent: PLAYLIGHT_FIRST_PURCHASE_DISCOUNT_PERCENT,
                  })}
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
            {t("buttons.continue", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
