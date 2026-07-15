import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { startNewDemoGame } from "@/game/demoLimit";
import { useTranslation } from "react-i18next";

const STEAM_STORE_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/";

/** Blocking end-of-demo modal for Galaxy web demo and Steam desktop demo. */
export default function DemoTimeUpDialog() {
  const { t } = useTranslation("ui");
  const demoTimeUpDialogOpen = useGameStore(
    (state) => state.galaxyTimeUpDialogOpen,
  );

  const handleStartNewGame = () => {
    void startNewDemoGame();
  };

  return (
    <Dialog open={demoTimeUpDialogOpen} onOpenChange={() => { }}>
      <DialogContent
        className="max-w-md"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("galaxy.title")}</DialogTitle>
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
