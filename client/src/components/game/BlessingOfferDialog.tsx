import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { gameActionOutlineButtonClassName } from "@/components/CooldownButton";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/game/state";
import type { GameState } from "@shared/schema";
import { clothingEffects } from "@/game/rules/effects";
import { renderItemTooltip } from "@/game/rules/itemTooltips";
import {
  getInsightBlessingCost,
  getVisibleInsightBlessingOffers,
  type InsightBlessingId,
} from "@/game/rules/insightBlessings";
import { getEffectName } from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { SidePanelSectionIcon } from "@/components/game/panels/SidePanelSectionIcon";

export default function BlessingOfferDialog() {
  const { t } = useUiTranslation();
  const isOpen = useGameStore((s) => s.blessingOfferDialogOpen);
  const setBlessingOfferDialogOpen = useGameStore(
    (s) => s.setBlessingOfferDialogOpen,
  );
  const chooseInsightBlessing = useGameStore((s) => s.chooseInsightBlessing);
  const gameState = useGameStore() as unknown as GameState;

  const offered = getVisibleInsightBlessingOffers(gameState);
  const cost = getInsightBlessingCost(gameState);
  const canAfford = (gameState.resources.insight ?? 0) >= cost;

  const handleChoose = (blessingId: InsightBlessingId) => {
    chooseInsightBlessing(blessingId);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) setBlessingOfferDialogOpen(false);
      }}
    >
      <DialogContent
        className="max-w-[min(95vw,52rem)] border-border/60 bg-background/95 p-4 sm:p-6"
        skipViewportWidthClamp
        hideClose={false}
      >
        <DialogHeader className="mb-2 sm:mb-3">
          <DialogTitle className="text-base sm:text-lg">
            {t("blessingOffer.title", { defaultValue: "Choose a Blessing" })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("blessingOffer.srDescription", {
              defaultValue: "Select one of the offered blessings",
            })}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "flex flex-col items-stretch gap-3 sm:flex-row sm:items-stretch sm:justify-center",
            offered.length === 1 && "sm:max-w-xs sm:mx-auto",
          )}
        >
          {offered.map((blessingId) => {
            const effect = clothingEffects[blessingId];
            const title = getEffectName(
              "clothing",
              blessingId,
              effect?.name || blessingId,
            );

            return (
              <div
                key={blessingId}
                className={cn(
                  "group flex min-h-[14rem] flex-1 flex-col rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm",
                  "transition-all duration-200 ease-out",
                  "hover:-translate-y-1 hover:border-amber-500/50 hover:bg-card hover:shadow-lg hover:shadow-amber-900/20",
                  "focus-within:-translate-y-1 focus-within:border-amber-500/50",
                )}
                data-testid={`blessing-offer-card-${blessingId}`}
              >
                <div className="mb-3 flex justify-center text-foreground">
                  <SidePanelSectionIcon
                    sectionId="blessings"
                    sizeClassName="h-10 w-10"
                    className="opacity-90 transition-transform duration-200 group-hover:scale-110"
                  />
                </div>

                <h3 className="mb-2 text-center text-sm font-semibold leading-tight">
                  {title}
                </h3>

                <div className="mb-4 flex-1 text-center text-xs text-muted-foreground">
                  {renderItemTooltip(blessingId, "blessing", undefined, {
                    showTitle: false,
                    showDescription: false,
                    showEffects: true,
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={!canAfford}
                  button_id={`blessing-offer-choose-${blessingId}`}
                  className={cn(
                    "mt-auto w-full",
                    gameActionOutlineButtonClassName(!canAfford),
                  )}
                  onClick={() => handleChoose(blessingId)}
                >
                  {t("blessingOffer.chooseBlessing", {
                    defaultValue: "Choose Blessing",
                  })}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
