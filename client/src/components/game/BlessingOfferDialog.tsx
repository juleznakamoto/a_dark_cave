import { createPortal } from "react-dom";
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

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-3"
      role="dialog"
      aria-modal="true"
      aria-label={t("blessingOffer.title", {
        defaultValue: "Choose a Blessing",
      })}
      onClick={() => setBlessingOfferDialogOpen(false)}
    >
      <div
        className={cn(
          "flex w-full max-w-[min(96vw,52rem)] flex-row items-stretch justify-center gap-2 sm:gap-3",
          offered.length === 1 && "max-w-xs",
        )}
        onClick={(e) => e.stopPropagation()}
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
                "group flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/70 bg-card/90 p-2.5 shadow-lg sm:min-h-[14rem] sm:p-4",
                "transition-all duration-200 ease-out",
                "hover:-translate-y-1 hover:border-amber-500/50 hover:bg-card hover:shadow-xl hover:shadow-amber-900/20",
                "focus-within:-translate-y-1 focus-within:border-amber-500/50",
              )}
              data-testid={`blessing-offer-card-${blessingId}`}
            >
              <div className="mb-2 flex justify-center text-foreground sm:mb-3">
                <SidePanelSectionIcon
                  sectionId="blessings"
                  sizeClassName="h-7 w-7 sm:h-10 sm:w-10"
                  className="opacity-90 transition-transform duration-200 group-hover:scale-110"
                />
              </div>

              <h3 className="mb-1 text-center text-xs font-semibold leading-tight sm:mb-2 sm:text-sm">
                {title}
              </h3>

              <div className="mb-2 flex-1 text-center text-[11px] leading-snug text-muted-foreground sm:mb-4 sm:text-xs">
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
                  "mt-auto w-full px-1",
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
    </div>,
    document.body,
  );
}
