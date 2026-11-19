import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { playHaptic } from "@/lib/haptics";
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
import { PactOfferEye } from "@/components/game/PactOfferDialog";
import {
  destroyedChromeMaskStyle,
  gameChromeDialogClassName,
  chromeRuleColorStyle,
  useDestroyedChrome,
} from "@/components/game/gameChrome";

/** Two lines of text-xs / leading-snug, including the text-size setting. */
const BLESSING_CARD_DESCRIPTION_MIN_H =
  "min-h-[calc(2.75*(0.8125rem+var(--adc-text-delta,0px)))]";

export default function BlessingOfferDialog() {
  const isOpen = useGameStore((s) => s.blessingOfferDialogOpen);
  if (!isOpen) return null;
  return <BlessingOfferDialogOpen />;
}

function BlessingOfferDialogOpen() {
  const { t } = useUiTranslation();
  const chromeOn = useDestroyedChrome();
  const chooseInsightBlessing = useGameStore((s) => s.chooseInsightBlessing);
  const insight = useGameStore((s) => s.resources.insight ?? 0);
  const gameState = useGameStore.getState() as unknown as GameState;
  const [selectedId, setSelectedId] = useState<InsightBlessingId | null>(null);

  const offered = getVisibleInsightBlessingOffers(gameState);
  const cost = getInsightBlessingCost(gameState);
  const canAfford = insight >= cost;
  const canConfirm = selectedId != null && canAfford;

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <style>{`
        .blessing-offer-card-glow {
          box-shadow: 0 0 15px 5px rgba(37, 99, 235, 0.4);
        }
        .blessing-offer-card[aria-pressed="true"] {
          outline: 2px solid #2563eb;
          outline-offset: -2px;
        }
        .blessing-offer-card.blessing-offer-card--open:not([aria-pressed="true"]):hover,
        .blessing-offer-card.blessing-offer-card--open:not([aria-pressed="true"]):focus-visible {
          outline: 1px solid #1d4ed8;
          outline-offset: 0;
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 overflow-x-hidden overflow-y-auto bg-black/80 animate-fade-in"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t("blessingOffer.title", {
          defaultValue: "Choose a Blessing",
        })}
      >
        <div className="flex min-h-full w-full justify-center">
          <div className="m-auto flex w-full max-w-[min(96vw,52rem)] flex-col items-center">
            <div className="flex w-full flex-row flex-wrap items-stretch justify-center gap-2 sm:gap-3">
              {offered.map((blessingId) => {
                const effect = clothingEffects[blessingId];
                const title = getEffectName(
                  "clothing",
                  blessingId,
                  effect?.name || blessingId,
                );
                const isSelected = selectedId === blessingId;

                return (
                  <button
                    key={blessingId}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (!canAfford) return;
                      setSelectedId((current) =>
                        current === blessingId ? null : blessingId,
                      );
                      playHaptic("button");
                    }}
                    className={cn(
                      "blessing-offer-card group relative z-0 flex w-[13.5rem] flex-col overflow-visible rounded-lg bg-background p-3 text-left shadow-2xl sm:w-[16rem] sm:p-5",
                      canAfford && "blessing-offer-card--open cursor-pointer",
                      !canAfford && "cursor-default",
                      chromeOn
                        ? `${gameChromeDialogClassName()} game-chrome-rule--round`
                        : cn(
                            "border transition-colors duration-500",
                            isSelected
                              ? "border-blue-600"
                              : cn(
                                  "border-border",
                                  canAfford &&
                                    "hover:border-blue-600 focus-visible:border-blue-600",
                                ),
                          ),
                    )}
                    style={
                      chromeOn
                        ? {
                            ...destroyedChromeMaskStyle(
                              `blessing-offer-${blessingId}`,
                            ),
                            ...chromeRuleColorStyle(
                              isSelected ? "#2563eb" : "#1e3a8a",
                            ),
                          }
                        : undefined
                    }
                    data-testid={`blessing-offer-card-${blessingId}`}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 -z-10 rounded-lg transition-opacity duration-500 blessing-offer-card-glow",
                        isSelected
                          ? "opacity-100"
                          : cn(
                              "opacity-20",
                              canAfford &&
                                "group-hover:opacity-70 group-focus-visible:opacity-70",
                            ),
                      )}
                    />

                    <div className="mb-3 flex justify-center text-foreground">
                      <PactOfferEye open={isSelected} blink={false} />
                    </div>

                    <h3
                      className={cn(
                        "mb-2 text-center text-sm font-semibold leading-tight sm:text-base",
                        isSelected ? "opacity-100" : "opacity-[0.85]",
                      )}
                    >
                      {title}
                    </h3>

                    <div
                      className={cn(
                        "text-center text-xs leading-snug text-muted-foreground",
                        BLESSING_CARD_DESCRIPTION_MIN_H,
                      )}
                    >
                      {renderItemTooltip(blessingId, "blessing", undefined, {
                        showTitle: false,
                        showDescription: false,
                        showEffects: true,
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={!canConfirm}
              button_id="blessing-offer-continue"
              className={cn(
                // Solid stand-in for blue-600 at 10% (hover 20%) on the black dialog.
                "mt-4 min-w-[10rem] border-blue-600 bg-[#040a18] text-foreground",
                "hover:bg-[#07142f] hover:text-foreground",
                // The shared button variant fades disabled controls. These colors
                // match that 60% fade on the black dialog without using opacity.
                "disabled:opacity-100",
                !canConfirm &&
                  "border-[#0e1632] bg-[#02060e] text-[#8c8b8b] hover:border-[#0e1632] hover:bg-[#02060e] hover:text-[#8c8b8b]",
              )}
              style={chromeRuleColorStyle(canConfirm ? "#2563eb" : "#0e1632")}
              onClick={() => {
                if (!selectedId || !canAfford) return;
                chooseInsightBlessing(selectedId);
              }}
              data-testid="blessing-offer-continue"
            >
              {t("blessingOffer.continue", { defaultValue: "Continue" })}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
