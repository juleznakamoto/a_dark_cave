import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SteamDemoEndStoreCta } from "@/components/game/SteamDemoStoreLink";
import { FooterSocialIcon } from "@/components/game/FooterSocialIcon";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { EndScreenShaderBackground } from "@/components/ui/animated-shader-hero";
import { useGameStore } from "@/game/state";
import { startNewDemoGame } from "@/game/demoLimit";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import { isItchEdition, shouldOfferSteamDemoReview } from "@/lib/edition";
import { openSteamReview } from "@/lib/openSteamReview";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { ITCH_RATE_URL } from "@shared/publicPages";
import { STEAM_DEMO_APP_ID } from "@shared/steamReview";

/** Blocking end-of-demo modal for Galaxy web demo and Steam desktop demo. */
export default function DemoTimeUpDialog({
  /** Dev `/dev/demo-end`: force open and no-op Start New Game. */
  preview = false,
}: {
  preview?: boolean;
} = {}) {
  const { t } = useUiTranslation();
  const storeOpen = useGameStore((state) => state.galaxyTimeUpDialogOpen);
  const devGameMode = useGameStore((state) => state.devGameMode);
  // `/dev/demo-end` is the Steam demo ending preview, so the review button is always on.
  const showSteamReview = preview || shouldOfferSteamDemoReview(devGameMode);
  const dismissDemoEndDialog = useGameStore((state) => state.dismissDemoEndDialog);
  const open = storeOpen;

  const handleStartNewGame = () => {
    if (preview) return;
    void startNewDemoGame();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (preview || nextOpen) return;
    dismissDemoEndDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-md bg-black/90 backdrop-blur-sm"
        hideClose
        hideOverlay
        layerZIndex={preview ? 70 : 50}
        customBackground={
          open ? (
            <EndScreenShaderBackground
              className={
                preview
                  ? "fixed inset-0 z-[69] h-full w-full object-cover touch-none pointer-events-none"
                  : "fixed inset-0 z-[45] h-full w-full object-cover touch-none pointer-events-none"
              }
            />
          ) : null
        }
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("galaxy.title")}</DialogTitle>
          <DialogDescription>{t("galaxy.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <SteamDemoEndStoreCta />
          {showSteamReview && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                void openSteamReview(STEAM_DEMO_APP_ID);
              }}
              button_id="demo-end-steam-review"
              data-testid="button-demo-end-steam-review"
              className="inline-flex items-center gap-1.5"
            >
              <FooterSocialIcon
                platform="steam"
                variant="brand"
                className="h-4 w-4 shrink-0"
              />
              {t("endScreen.writeReview", { defaultValue: "Write a review" })}
            </Button>
          )}
          {isItchEdition() && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                window.open(ITCH_RATE_URL, "_blank", "noopener,noreferrer");
              }}
              data-testid="button-demo-end-rate-itch"
              className="inline-flex items-center gap-1.5"
            >
              <FooterSocialIcon
                platform="itch"
                variant="brand"
                className="h-4 w-4 shrink-0"
              />
              {t("endScreen.rateOnItch", { defaultValue: "Rate on itch.io" })}
            </Button>
          )}
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              dismissDemoEndDialog();
            }}
            data-testid="button-demo-end-see-whats-next"
            className="inline-flex items-center gap-1.5"
          >
            <GameUiIcon
              name="unlockedPadlock"
              sizeClassName="w-4 h-4"
              className="opacity-100"
            />
            {t("galaxy.seeWhatsNextButton", {
              defaultValue: "See what's coming",
            })}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => openGameFeedbackForm("demoEnd")}
            data-testid="button-demo-end-feedback"
            className="inline-flex items-center gap-1.5"
          >
            <GameUiIcon
              name="feedback"
              sizeClassName="w-4 h-4"
              className="opacity-100"
            />
            {t("galaxy.feedbackButton", { defaultValue: "Feedback" })}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={handleStartNewGame}
            button_id="demo-end-new-game"
            className="inline-flex items-center gap-1.5"
          >
            <GameUiIcon
              name="newGame"
              sizeClassName="w-4 h-4"
              className="opacity-100"
            />
            {t("galaxy.startNewGameButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
