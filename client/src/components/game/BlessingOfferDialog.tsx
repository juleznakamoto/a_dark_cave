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
        <div
          className={cn(
            "flex w-full max-w-[min(96vw,52rem)] flex-row items-stretch justify-center gap-2 sm:gap-3",
            offered.length === 1 && "max-w-xs",
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
                  "group relative z-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-visible rounded-lg border-2 border-border bg-background p-2.5 shadow-2xl sm:min-h-[14rem] sm:p-4",
                  "hover:border-blue-600 focus-within:border-blue-600",
                )}
                data-testid={`blessing-offer-card-${blessingId}`}
              >
                <div className="pointer-events-none absolute inset-0 -z-10 rounded-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 blessing-offer-card-glow" />

                <div className="mb-2 flex justify-center text-foreground sm:mb-3">
                  <SidePanelSectionIcon
                    sectionId="blessings"
                    sizeClassName="h-7 w-7 sm:h-10 sm:w-10"
                    className="opacity-90"
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
                  onClick={() => chooseInsightBlessing(blessingId)}
                >
                  {t("blessingOffer.chooseBlessing", {
                    defaultValue: "Choose Blessing",
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
