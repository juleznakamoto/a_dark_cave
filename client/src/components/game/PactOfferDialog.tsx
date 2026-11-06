import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/game/state";
import {
  PACT_IDS,
  arePactsEnabled,
  clampPactChoices,
  isPactId,
  type PactId,
} from "@/game/rules/pacts";
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

/** Ignore subpixel rounding from fractional display scale. */
const VIEWPORT_PIN_SLOP_PX = 4;

type ViewportBox = {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
};

/**
 * `inset: 0` and `100dvh` follow the layout viewport. Browser zoom and Linux
 * display scaling can leave that taller than the window the player can see,
 * and the document itself does not scroll. Pin the shell to the visual
 * viewport when the visible window is shorter or shifted.
 */
export function pactOfferViewportStyle(
  visual: ViewportBox | null,
  layout: { width: number; height: number },
): CSSProperties | undefined {
  if (!visual || visual.width <= 0 || visual.height <= 0) return undefined;
  const widthShort = layout.width - visual.width > VIEWPORT_PIN_SLOP_PX;
  const heightShort = layout.height - visual.height > VIEWPORT_PIN_SLOP_PX;
  const shifted =
    Math.abs(visual.offsetTop) > 0.5 || Math.abs(visual.offsetLeft) > 0.5;
  if (!widthShort && !heightShort && !shifted) return undefined;
  return {
    top: visual.offsetTop,
    left: visual.offsetLeft,
    width: visual.width,
    height: visual.height,
    maxHeight: visual.height,
    right: "auto",
    bottom: "auto",
  };
}

function sameViewportStyle(
  a: CSSProperties | undefined,
  b: CSSProperties | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.maxHeight === b.maxHeight
  );
}

function usePactOfferViewportStyle(): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties | undefined>();

  useEffect(() => {
    const sync = () => {
      const visual = window.visualViewport;
      const next = pactOfferViewportStyle(
        visual
          ? {
              offsetTop: visual.offsetTop,
              offsetLeft: visual.offsetLeft,
              width: visual.width,
              height: visual.height,
            }
          : null,
        { width: window.innerWidth, height: window.innerHeight },
      );
      setStyle((prev) => (sameViewportStyle(prev, next) ? prev : next));
    };

    sync();
    const visual = window.visualViewport;
    visual?.addEventListener("resize", sync);
    visual?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    return () => {
      visual?.removeEventListener("resize", sync);
      visual?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return style;
}

const PACT_EYE_BLINK_MS = 300;
const PACT_EYE_BLINK_GAP_MIN_MS = 10_000;
const PACT_EYE_BLINK_GAP_MAX_MS = 30_000;

function nextPactEyeBlinkDelayMs(): number {
  const span = PACT_EYE_BLINK_GAP_MAX_MS - PACT_EYE_BLINK_GAP_MIN_MS;
  return PACT_EYE_BLINK_GAP_MIN_MS + Math.random() * span;
}

/** Open while the card is chosen. Closes for one blink, then opens again. */
export function PactOfferEye({ open }: { open: boolean }) {
  const [blinking, setBlinking] = useState(false);

  useEffect(() => {
    if (!open || prefersReducedMotion()) {
      setBlinking(false);
      return;
    }

    let alive = true;
    let closeTimer = 0;
    let reopenTimer = 0;

    const schedule = () => {
      closeTimer = window.setTimeout(() => {
        if (!alive) return;
        setBlinking(true);
        reopenTimer = window.setTimeout(() => {
          if (!alive) return;
          setBlinking(false);
          schedule();
        }, PACT_EYE_BLINK_MS);
      }, nextPactEyeBlinkDelayMs());
    };

    schedule();
    return () => {
      alive = false;
      window.clearTimeout(closeTimer);
      window.clearTimeout(reopenTimer);
    };
  }, [open]);

  const closed = !open || blinking;

  return (
    <SidePanelSectionIcon
      sectionId={closed ? "blessings" : "bonuses"}
      sizeClassName="h-8 w-8 sm:h-10 sm:w-10"
      className={closed ? "pact-offer-closed-eye" : "pact-offer-open-eye opacity-90"}
    />
  );
}

export default function PactOfferDialog() {
  const isOpen = useGameStore((s) => s.pactOfferDialogOpen);
  if (!arePactsEnabled() || !isOpen) return null;
  return <PactOfferDialogOpen />;
}

function PactOfferDialogOpen() {
  const { t } = useUiTranslation();
  const chromeOn = useDestroyedChrome();
  const viewportStyle = usePactOfferViewportStyle();
  const confirmPacts = useGameStore((s) => s.confirmPacts);
  const chosen = useGameStore((s) => s.chosenPacts);
  const allowance = clampPactChoices(
    useGameStore((s) => s.pactChoices),
  );
  const [selected, setSelected] = useState<ReadonlySet<PactId>>(() => {
    const initial = new Set<PactId>();
    for (const id of chosen ?? []) {
      if (!isPactId(id)) continue;
      initial.add(id);
      if (initial.size >= allowance) break;
    }
    return initial;
  });

  const [linesShown, setLinesShown] = useState(() =>
    prefersReducedMotion() ? 3 : 0,
  );
  const [shown, setShown] = useState(() =>
    prefersReducedMotion() ? PACT_IDS.length : 0,
  );
  const [continueShown, setContinueShown] = useState(() =>
    prefersReducedMotion(),
  );
  const [closing, setClosing] = useState(false);
  const pendingIdsRef = useRef<PactId[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setLinesShown(3);
      setShown(PACT_IDS.length);
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
      ...PACT_IDS.map((_, index) =>
        window.setTimeout(
          () => setShown(index + 1),
          cardsStartMs + index * cardStaggerMs,
        ),
      ),
      window.setTimeout(
        () => setContinueShown(true),
        cardsStartMs +
          (PACT_IDS.length - 1) * cardStaggerMs +
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
      confirmPacts(pendingIdsRef.current);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [closing, confirmPacts]);

  const remaining = Math.max(0, allowance - selected.size);

  const toggle = (id: PactId) => {
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

  const title = t("pactOffer.title", {
    defaultValue: "Choose your Pacts",
  });

  return createPortal(
    <>
      <style>{`
        .pact-offer-card-glow {
          box-shadow: 0 0 15px 5px rgba(220, 38, 38, 0.4);
        }
        .pact-offer-card[aria-pressed="true"] {
          outline: 2px solid #ef4444;
          outline-offset: -2px;
        }
        .pact-offer-card.pact-offer-card--open:not([aria-pressed="true"]):hover,
        .pact-offer-card.pact-offer-card--open:not([aria-pressed="true"]):focus-visible {
          outline: 1px solid var(--adc-chrome-rule-color, #6b1515);
          outline-offset: 0;
        }
        .pact-offer-open-eye {
          transform: translateY(-2px) scale(0.98);
        }
        .pact-offer-closed-eye {
          opacity: 0.8;
        }
        @keyframes pact-offer-title-pulse {
          0%, 100% {
            opacity: 0.45;
            text-shadow: 0 0 8px rgba(220, 38, 38, 0.25);
          }
          50% {
            opacity: 1;
            text-shadow: 0 0 18px rgba(220, 38, 38, 0.9);
          }
        }
        .pact-offer-title {
          animation: pact-offer-title-pulse 4.8s ease-in-out infinite;
        }
        @keyframes pact-offer-backdrop-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .pact-offer-backdrop-out {
          animation: pact-offer-backdrop-out 1.5s ease-out forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .pact-offer-title {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
      <div
        className={cn(
          // Scroll this shell. Centering it with overflow hidden clips the
          // title and Continue on short windows, browser zoom, and Linux
          // display scaling, and the document cannot scroll to them.
          "fixed inset-0 z-50 h-dvh max-h-dvh overflow-x-hidden overflow-y-auto overscroll-y-contain scrollbar-hide bg-black",
          closing && "pact-offer-backdrop-out",
        )}
        style={viewportStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pact-offer-title"
        data-testid="pact-offer-dialog"
      >
        <div className="flex min-h-full w-full justify-center">
        <div className="m-auto flex w-full max-w-[min(98vw,80rem)] flex-col items-center px-3 py-2">
          <div className="mb-4 flex flex-col items-center gap-1">
            <div
              className={cn(
                "transition-opacity duration-500 ease-out",
                linesShown >= 1 ? "opacity-100" : "opacity-0",
              )}
            >
              <h2
                id="pact-offer-title"
                className="pact-offer-title text-center text-2xl font-semibold tracking-wide text-red-600 sm:text-3xl"
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
              {t("pactOffer.grant", {
                defaultValue:
                  "Each playthrough grants one pact choice (two choices if Cruel Mode).",
              })}
            </p>
            <p
              className={cn(
                "text-center text-sm text-white transition-opacity duration-500 ease-out sm:text-base",
                linesShown >= 3 ? "opacity-100" : "opacity-0",
              )}
            >
              {t("pactOffer.available", {
                count: remaining,
                defaultValue: "{{count}} available",
              })}
            </p>
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            {Array.from(
              { length: Math.ceil(PACT_IDS.length / 3) },
              (_, row) => row * 3,
            ).map((start) => (
              <div
                key={start}
                className="flex flex-wrap items-stretch justify-center gap-3"
              >
            {PACT_IDS.slice(start, start + 3).map((pactId, offset) => {
              const index = start + offset;
              const isSelected = selected.has(pactId);
              const isShown = index < shown;
              const canSelect = isSelected || remaining > 0;
              const name = t(`pactOffer.cards.${pactId}.name`);
              const secondBoon =
                pactId === "blazesmith" ||
                pactId === "cunning_trader" ||
                pactId === "avid_apprentices" ||
                pactId === "full_larders" ||
                pactId === "sturdy_hands"
                  ? t(`pactOffer.cards.${pactId}.boon2`)
                  : "";
              const ruleColor = isSelected ? "#ef4444" : "#6b1515";

              return (
                <button
                  key={pactId}
                  type="button"
                  aria-pressed={isSelected}
                  aria-hidden={!isShown}
                  tabIndex={isShown ? 0 : -1}
                  onClick={() => {
                    if (!isShown || !canSelect) return;
                    toggle(pactId);
                  }}
                  className={cn(
                    "pact-offer-card group relative z-0 flex w-[13.5rem] flex-col overflow-visible rounded-lg bg-background p-2 text-left shadow-2xl transition-opacity duration-1000 ease-out sm:w-[16rem] sm:p-2.5",
                    canSelect && "pact-offer-card--open",
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
                          ...destroyedChromeMaskStyle(`pact-offer-${pactId}`),
                          ...chromeRuleColorStyle(ruleColor),
                          // Stay on the solid hairline. Pact cards do not
                          // follow the player's madness chrome stage.
                          "--adc-chrome-solid": 1,
                          "--adc-chrome-from": 0,
                          "--adc-chrome-to": 0,
                        }
                      : undefined
                  }
                  data-testid={`pact-offer-card-${pactId}`}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0 -z-10 rounded-lg transition-opacity duration-500 pact-offer-card-glow",
                      isSelected
                        ? "opacity-100"
                        : cn(
                            "opacity-20",
                            canSelect &&
                              "group-hover:opacity-70 group-focus-visible:opacity-70",
                          ),
                    )}
                  />

                  <div className="mb-1 flex justify-center text-foreground">
                    <PactOfferEye open={isSelected} />
                  </div>

                  <h3
                    className={cn(
                      "mb-1 flex h-6 items-start justify-center text-center text-sm font-semibold leading-tight text-red-500 sm:text-base",
                      isSelected ? "opacity-100" : "opacity-[0.85]",
                    )}
                  >
                    <span className="w-full">{name}</span>
                  </h3>

                  <p className="flex h-[2.75rem] items-center text-center text-xs leading-snug text-white">
                    <span className="w-full">{t(`pactOffer.cards.${pactId}.boon`)}</span>
                  </p>
                  <p className="mt-1 flex h-[2.75rem] items-center text-center text-xs leading-snug text-white">
                    <span className="w-full">{secondBoon}</span>
                  </p>
                  <p className="mt-1 flex h-[2.75rem] items-center text-center text-xs italic leading-snug text-muted-foreground">
                    <span className="w-full">{t(`pactOffer.cards.${pactId}.quote`)}</span>
                  </p>

                  <div
                    className="my-1.5 h-px w-full shrink-0 bg-red-800/80"
                    aria-hidden="true"
                  />

                  <p className="flex h-6 shrink-0 items-start justify-center text-center text-xs leading-snug text-red-400">
                    <span className="w-full">
                      {t("pactOffer.madness", { defaultValue: "+3 Madness" })}
                    </span>
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
            button_id="pact-offer-continue"
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
                confirmPacts(ids);
                return;
              }
              pendingIdsRef.current = ids;
              setClosing(true);
            }}
            data-testid="pact-offer-continue"
          >
            {t("pactOffer.continue", { defaultValue: "Continue" })}
          </Button>
        </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
