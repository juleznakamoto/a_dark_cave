import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SteamDemoEndStoreCta } from "@/components/game/SteamDemoStoreLink";
import { GameUiIcon } from "@/components/game/GameUiIcon";
import { EndScreenShaderBackground } from "@/components/ui/animated-shader-hero";
import { useGameStore } from "@/game/state";
import { startNewDemoGame } from "@/game/demoLimit";
import { openGameFeedbackForm } from "@/lib/gameFeedbackForm";
import { useUiTranslation } from "@/i18n/useUiTranslation";

/** Blocking end-of-demo modal for Galaxy web demo and Steam desktop demo. */
export default function DemoTimeUpDialog({
  /** Dev `/dev/demo-end`: force open and no-op Start New Game. */
  preview = false,
}: {
  preview?: boolean;
} = {}) {
  const { t } = useUiTranslation();
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
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="pr-0">{t("galaxy.title")}</DialogTitle>
          <DialogDescription>{t("galaxy.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <SteamDemoEndStoreCta />
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
