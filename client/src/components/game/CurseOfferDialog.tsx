import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/game/state";
import {
  CRUEL_CURSE_IDS,
  isCruelCurseId,
  type CruelCurseId,
} from "@/game/rules/cruelCurses";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { SidePanelSectionIcon } from "@/components/game/panels/SidePanelSectionIcon";
import {
  destroyedChromeMaskStyle,
  gameChromeDialogClassName,
  chromeRuleColorStyle,
  useDestroyedChrome,
} from "@/components/game/gameChrome";

export default function CurseOfferDialog() {
  const isOpen = useGameStore((s) => s.curseOfferDialogOpen);
  if (!isOpen) return null;
  return <CurseOfferDialogOpen />;
}

function CurseOfferDialogOpen() {
  const { t } = useUiTranslation();
  const chromeOn = useDestroyedChrome();
  const confirmCruelCurses = useGameStore((s) => s.confirmCruelCurses);
  const chosen = useGameStore((s) => s.chosenCruelCurses);
  const [selected, setSelected] = useState<ReadonlySet<CruelCurseId>>(() => {
    const initial = new Set<CruelCurseId>();
    for (const id of chosen ?? []) {
      if (isCruelCurseId(id)) initial.add(id);
    }
    return initial;
  });

  const [shown, setShown] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setShown(CRUEL_CURSE_IDS.length + 1);
      return;
    }
    const timers = CRUEL_CURSE_IDS.map((_, index) =>
      window.setTimeout(() => setShown(index + 1), 500 * (index + 1)),
    );
    timers.push(
      window.setTimeout(
        () => setShown(CRUEL_CURSE_IDS.length + 1),
        500 * (CRUEL_CURSE_IDS.length + 1),
      ),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  const toggle = (id: CruelCurseId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (typeof document === "undefined") {
    return null;
  }

  const title = t("curseOffer.title", {
    defaultValue: "Choose your Curses",
  });

  return createPortal(
    <>
      <style>{`
        .curse-offer-card-glow {
          box-shadow: 0 0 15px 5px rgba(220, 38, 38, 0.4);
        }
        @keyframes curse-offer-title-pulse {
          0%, 100% {
            opacity: 0.45;
            text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 18px rgba(220, 38, 38, 0.9);
          }
        }
        .curse-offer-title {
          animation: curse-offer-title-pulse 3.2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .curse-offer-title {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in p-3"
        role="dialog"
        aria-modal="true"
        aria-labelledby="curse-offer-title"
        data-testid="curse-offer-dialog"
      >
        <div className="flex max-h-[100dvh] w-full max-w-[min(96vw,56rem)] flex-col items-center overflow-y-auto py-4">
          <h2
            id="curse-offer-title"
            className="curse-offer-title mb-5 text-center text-2xl font-semibold tracking-wide text-red-600 sm:mb-6 sm:text-3xl"
          >
            {title}
          </h2>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch sm:justify-center">
            {CRUEL_CURSE_IDS.map((curseId, index) => {
              const isSelected = selected.has(curseId);
              const isShown = index < shown;
              const name = t(`curseOffer.cards.${curseId}.name`);
              const ruleColor = isSelected ? "#ef4444" : "#991b1b";

              return (
                <button
                  key={curseId}
                  type="button"
                  aria-pressed={isSelected}
                  aria-hidden={!isShown}
                  tabIndex={isShown ? 0 : -1}
                  onClick={() => {
                    if (!isShown) return;
                    toggle(curseId);
                  }}
                  className={cn(
                    "curse-offer-card group relative z-0 flex w-[13.5rem] flex-col overflow-visible rounded-lg bg-background p-3 text-left shadow-2xl transition-opacity duration-500 ease-out sm:w-[16rem] sm:p-5",
                    isShown ? "opacity-100" : "pointer-events-none opacity-0",
                    chromeOn
                      ? `${gameChromeDialogClassName()} game-chrome-rule--round`
                      : cn(
                          "border transition-colors duration-500",
                          isSelected
                            ? "border-red-500"
                            : "border-red-900 hover:border-red-600 focus-visible:border-red-600",
                        ),
                  )}
                  style={
                    chromeOn
                      ? {
                          ...destroyedChromeMaskStyle(`curse-offer-${curseId}`),
                          ...chromeRuleColorStyle(ruleColor),
                        }
                      : undefined
                  }
                  data-testid={`curse-offer-card-${curseId}`}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 -z-10 rounded-lg transition-opacity duration-500 curse-offer-card-glow",
                      isSelected
                        ? "opacity-100"
                        : "opacity-40 group-hover:opacity-100 group-focus-visible:opacity-100",
                    )}
                  />

                  <div className="mb-3 flex justify-center text-foreground">
                    <SidePanelSectionIcon
                      sectionId="blessings"
                      sizeClassName="h-8 w-8 sm:h-10 sm:w-10"
                      className="opacity-90"
                    />
                  </div>

                  <h3 className="mb-3 text-center text-sm font-semibold leading-tight sm:text-base">
                    {name}
                  </h3>

                  <p className="min-h-[2.5rem] text-center text-xs leading-snug text-red-400">
                    {t(`curseOffer.cards.${curseId}.curse`)}
                  </p>

                  <div
                    className="my-3 h-px w-full bg-red-800/80"
                    aria-hidden="true"
                  />

                  <p className="min-h-[2.5rem] text-center text-xs leading-snug text-amber-100/90">
                    {t(`curseOffer.cards.${curseId}.boon`)}
                  </p>
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            button_id="curse-offer-continue"
            aria-hidden={shown <= CRUEL_CURSE_IDS.length}
            tabIndex={shown > CRUEL_CURSE_IDS.length ? 0 : -1}
            className={cn(
              "mt-6 min-w-[10rem] border-red-600 bg-red-600/10 text-foreground transition-opacity duration-500 ease-out",
              "hover:bg-red-600/20 hover:text-foreground",
              shown > CRUEL_CURSE_IDS.length
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
            style={chromeRuleColorStyle("#dc2626")}
            onClick={() => confirmCruelCurses([...selected])}
            data-testid="curse-offer-continue"
          >
            {t("curseOffer.continue", { defaultValue: "Continue" })}
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
