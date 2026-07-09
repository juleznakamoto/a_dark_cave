import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/game/state";
import { useTranslation } from "react-i18next";

const STEAM_STORE_URL =
  "https://store.steampowered.com/app/4882240/A_Dark_Cave/";

export default function GalaxyTimeUpDialog() {
  const { t } = useTranslation("ui");
  const galaxyTimeUpDialogOpen = useGameStore(
    (state) => state.galaxyTimeUpDialogOpen,
  );

  return (
    <Dialog open={galaxyTimeUpDialogOpen} onOpenChange={() => { }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("dialogs.galaxy.title")}</DialogTitle>
          <DialogDescription>{t("dialogs.galaxy.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild>
            <a
              href={STEAM_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("dialogs.galaxy.wishlistButton")}
            </a>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("dialogs.galaxy.releaseNote")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
