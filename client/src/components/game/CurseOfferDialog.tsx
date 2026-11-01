import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/game/state";
import {
  CURSE_IDS,
  clampCurseChoices,
  isCurseId,
  type CurseId,
} from "@/game/rules/curses";
import { useUiTranslation } from "@/i18n/useUiTranslation";
import { SidePanelSectionIcon } from "@/components/game/panels/SidePanelSectionIcon";
import {
  destroyedChromeMaskStyle,
  gameChromeDialogClassName,
  chromeRuleColorStyle,
  useDestroyedChrome,
} from "@/components/game/gameChrome";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function CurseOfferDialog() {
  const isOpen = useGameStore((s) => s.curseOfferDialogOpen);
  if (!isOpen) return null;
  return <CurseOfferDialogOpen />;
}

function CurseOfferDialogOpen() {
  const { t } = useUiTranslation();
  const chromeOn = useDestroyedChrome();
  const confirmCurses = useGameStore((s) => s.confirmCurses);
  const chosen = useGameStore((s) => s.chosenCurses);
  const allowance = clampCurseChoices(
    useGameStore((s) => s.curseChoices),
  );
  const [selected, setSelected] = useState<ReadonlySet<CurseId>>(() => {
    const initial = new Set<CurseId>();
    for (const id of chosen ?? []) {
      if (!isCurseId(id)) continue;
      initial.add(id);
      if (initial.size >= allowance) break;
    }
    return initial;
  });

  const [linesShown, setLinesShown] = useState(() =>
    prefersReducedMotion() ? 3 : 0,
  );
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? CURSE_IDS.length : 0,
  );
  const [continueShown, setContinueShown] = useState(() =>
    prefersReducedMotion(),
  );
  const [closing, setClosing] = useState(false);
  const pendingIdsRef = useRef<CurseId[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setLinesShown(3);
      setShown(CURSE_IDS.length);
      setContinueShown(true);
      return;
    }
    const lineWaitMs = 500;
    const lineFadeMs = 500;
    const lineStaggerMs = 500;
    const cardStaggerMs = 500;
    const continueDelayMs = 500;
    const lineStarts = [
      lineWaitMs,
      lineWaitMs + lineStaggerMs,
      lineWaitMs + lineStaggerMs * 2,
    ];
    const cardsStartMs = lineStarts[2] + lineFadeMs;
    const timers = [
      ...lineStarts.map((start, index) =>
        window.setTimeout(() => setLinesShown(index + 1), start),
      ),
      ...CURSE_IDS.map((_, index) =>
        window.setTimeout(
          () => setShown(index + 1),
          cardsStartMs + index * cardStaggerMs,
        ),
      ),
      window.setTimeout(
        () => setContinueShown(true),
        cardsStartMs +
          (CURSE_IDS.length - 1) * cardStaggerMs +
          continueDelayMs,
      ),
    ];
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      confirmCurses(pendingIdsRef.current);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [closing, confirmCurses]);

  const remaining = Math.max(0, allowance - selected.size);

  const toggle = (id: CurseId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= allowance) return prev;
      next.add(id);
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
        .curse-offer-card[aria-pressed="true"] {
          outline: 1px solid #ef4444;
          outline-offset: 0;
        }
        .curse-offer-open-eye {
          transform: translateY(-2px) scale(0.98);
        }
        .curse-offer-closed-eye {
          opacity: 0.8;
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
          animation: curse-offer-title-pulse 4.8s ease-in-out infinite;
        }
        @keyframes curse-offer-backdrop-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .curse-offer-backdrop-out {
          animation: curse-offer-backdrop-out 1.5s ease-out forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .curse-offer-title {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black p-3",
          closing && "curse-offer-backdrop-out",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="curse-offer-title"
        data-testid="curse-offer-dialog"
      >
        <div className="flex max-h-full min-h-0 w-full max-w-[min(98vw,80rem)] flex-col items-center overflow-hidden py-2">
          <div className="mb-4 flex flex-col items-center gap-1">
            <div
              className={cn(
                "transition-opacity duration-500 ease-out",
                linesShown >= 1 ? "opacity-100" : "opacity-0",
              )}
            >
              <h2
                id="curse-offer-title"
                className="curse-offer-title text-center text-2xl font-semibold tracking-wide text-red-600 sm:text-3xl"
              >
                {title}
              </h2>
            </div>
            <p
              className={cn(
                "text-center text-sm text-white transition-opacity duration-500 ease-out sm:text-base",
                linesShown >= 2 ? "opacity-100" : "opacity-0",
              )}
            >
              {t("curseOffer.grant", {
                defaultValue:
                  "Each playthrough grants one curse choice (two choices if Cruel Mode).",
              })}
            </p>
            <p
              className={cn(
                "text-center text-sm text-white transition-opacity duration-500 ease-out sm:text-base",
                linesShown >= 3 ? "opacity-100" : "opacity-0",
              )}
            >
              {t("curseOffer.available", {
                count: remaining,
                defaultValue: "{{count}} available",
              })}
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            {Array.from(
              { length: Math.ceil(CURSE_IDS.length / 3) },
              (_, row) => row * 3,
            ).map((start) => (
              <div
                key={start}
                className="flex flex-wrap items-stretch justify-center gap-3"
              >
            {CURSE_IDS.slice(start, start + 3).map((curseId, offset) => {
              const index = start + offset;
              const isSelected = selected.has(curseId);
              const isShown = index < shown;
              const canSelect = isSelected || remaining > 0;
              const name = t(`curseOffer.cards.${curseId}.name`);
              const secondBoon =
                curseId === "blazesmith" ||
                curseId === "cunning_trader" ||
                curseId === "avid_apprentices" ||
                curseId === "full_larders" ||
                curseId === "sturdy_hands"
                  ? t(`curseOffer.cards.${curseId}.boon2`)
                  : "";
              const ruleColor = isSelected ? "#ef4444" : "#6b1515";

              return (
                <button
                  key={curseId}
                  type="button"
                  aria-pressed={isSelected}
                  aria-hidden={!isShown}
                  tabIndex={isShown ? 0 : -1}
                  onClick={() => {
                    if (!isShown || !canSelect) return;
                    toggle(curseId);
                  }}
                  className={cn(
                    "curse-offer-card group relative z-0 flex w-[13.5rem] flex-col overflow-visible rounded-lg bg-background p-2.5 text-left shadow-2xl transition-opacity duration-1000 ease-out sm:w-[16rem] sm:p-4",
                    isShown ? "opacity-100" : "pointer-events-none opacity-0",
                    canSelect ? "cursor-pointer" : "cursor-default",
                    chromeOn
                      ? `${gameChromeDialogClassName()} game-chrome-rule--round`
                      : cn(
                          "border transition-colors duration-500",
                          isSelected
                            ? "border-red-500"
                            : cn(
                                "border-red-950",
                                canSelect &&
                                  "hover:border-red-700 focus-visible:border-red-700",
                              ),
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
                        : cn(
                            "opacity-20",
                            canSelect &&
                              "group-hover:opacity-70 group-focus-visible:opacity-70",
                          ),
                    )}
                  />

                  <div className="mb-2 flex justify-center text-foreground">
                    <SidePanelSectionIcon
                      sectionId={isSelected ? "bonuses" : "blessings"}
                      sizeClassName="h-8 w-8 sm:h-10 sm:w-10"
                      className={isSelected ? "curse-offer-open-eye opacity-90" : "curse-offer-closed-eye"}
                    />
                  </div>

                  <h3 className="mb-2 text-center text-sm font-semibold leading-tight sm:text-base">
                    {name}
                  </h3>

                  <p className="min-h-[2.25rem] text-center text-xs leading-snug text-white">
                    {t(`curseOffer.cards.${curseId}.boon`)}
                  </p>
                  {secondBoon ? (
                    <p className="mt-1.5 min-h-[2.25rem] text-center text-xs leading-snug text-white">
                      {secondBoon}
                    </p>
                  ) : null}

                  <div
                    className="my-2 h-px w-full bg-red-800/80"
                    aria-hidden="true"
                  />

                  <p className="text-center text-xs leading-snug text-red-400">
                    {t("curseOffer.madness", { defaultValue: "+3 Madness" })}
                  </p>
                  <p className="mt-1.5 text-center text-xs italic leading-snug text-red-400">
                    {t(`curseOffer.cards.${curseId}.quote`)}
                  </p>
                </button>
              );
            })}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            button_id="curse-offer-continue"
            aria-hidden={!continueShown}
            tabIndex={continueShown ? 0 : -1}
            className={cn(
              "mt-4 min-w-[10rem] border-red-600 bg-red-600/10 text-foreground transition-opacity duration-500 ease-out",
              "hover:bg-red-600/20 hover:text-foreground",
              continueShown
                ? "opacity-100"
                : "pointer-events-none opacity-0",
            )}
            style={chromeRuleColorStyle("#dc2626")}
            onClick={() => {
              if (closing) return;
              const ids = [...selected];
              if (prefersReducedMotion()) {
                confirmCurses(ids);
                return;
              }
              pendingIdsRef.current = ids;
              setClosing(true);
            }}
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
