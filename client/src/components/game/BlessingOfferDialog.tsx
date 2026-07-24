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
} from "@/game/rules/insightBlessings";
import { getEffectName } from "@/i18n/resolveGameText";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { SidePanelSectionIcon } from "@/components/game/panels/SidePanelSectionIcon";

export default function BlessingOfferDialog() {
  const { t } = useUiTranslation();
  const isOpen = useGameStore((s) => s.blessingOfferDialogOpen);
  const chooseInsightBlessing = useGameStore((s) => s.chooseInsightBlessing);
  const gameState = useGameStore() as unknown as GameState;

  const offered = getVisibleInsightBlessingOffers(gameState);
  const cost = getInsightBlessingCost(gameState);
  const canAfford = (gameState.resources.insight ?? 0) >= cost;

  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <style>{`
        .blessing-offer-card-glow {
          animation: insight-glow-pulse 2.5s ease-in-out infinite;
        }
        @keyframes insight-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(37, 99, 235, 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(37, 99, 235, 0.5); }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-3"
        role="dialog"
        aria-modal="true"
        aria-label={t("blessingOffer.title", {
          defaultValue: "Choose a Blessing",
        })}
      >
        <div className="flex max-w-[min(96vw,52rem)] flex-row items-stretch justify-center gap-3">
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
                  "group relative z-0 flex w-[13.5rem] flex-col overflow-visible rounded-lg border border-border bg-background p-4 shadow-2xl sm:w-[16rem] sm:p-5",
                  "transition-colors duration-500 hover:border-blue-600 focus-within:border-blue-600",
                )}
                data-testid={`blessing-offer-card-${blessingId}`}
              >
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100 blessing-offer-card-glow" />

                <div className="mb-3 flex justify-center text-foreground">
                  <SidePanelSectionIcon
                    sectionId="blessings"
                    sizeClassName="h-9 w-9 sm:h-10 sm:w-10"
                    className="opacity-90"
                  />
                </div>

                <h3 className="mb-2 text-center text-sm font-semibold leading-tight sm:text-base">
                  {title}
                </h3>

                <div className="mb-4 text-center text-xs leading-snug text-muted-foreground">
                  {renderItemTooltip(blessingId, "blessing", undefined, {
                    showTitle: false,
                    showDescription: false,
                    showEffects: true,
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canAfford}
                  button_id={`blessing-offer-choose-${blessingId}`}
                  className={cn(
                    "mt-auto w-full",
                    gameActionOutlineButtonClassName(!canAfford),
                  )}
                  onClick={() => chooseInsightBlessing(blessingId)}
                >
                  {t("blessingOffer.chooseBlessing", {
                    defaultValue: "Choose",
                  })}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </>,
    document.body,
  );
}
