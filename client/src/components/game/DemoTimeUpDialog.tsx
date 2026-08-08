import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { useGameStore } from "@/game/state";
import { startNewDemoGame } from "@/game/demoLimit";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import { useTranslation } from "react-i18next";

const STEAM_STORE_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/";

/** Blocking end-of-demo modal for Galaxy web demo and Steam desktop demo. */
export default function DemoTimeUpDialog({
  /** Dev `/dev/demo-end`: force open and no-op Start New Game. */
  preview = false,
}: {
  preview?: boolean;
} = {}) {
  const { t } = useTranslation("ui");
  const storeOpen = useGameStore((state) => state.galaxyTimeUpDialogOpen);
  const open = preview || storeOpen;

  const handleStartNewGame = () => {
    if (preview) return;
    void startNewDemoGame();
  };

  return (
    <Dialog open={open} onOpenChange={() => { }}>
      <DialogContent
        className="max-w-md"
        hideClose
        layerZIndex={preview ? 70 : undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="pr-0">{t("galaxy.title")}</DialogTitle>
          <DialogDescription>{t("galaxy.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild>
            <a
              href={STEAM_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("galaxy.wishlistButton")}
            </a>
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
          <Button variant="outline" onClick={handleStartNewGame}>
            {t("galaxy.startNewGameButton")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("galaxy.releaseNote")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
