import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches `RewardDialog` icon wrapper so outcome glyphs read the same (size + white on amber/orange). */
export const OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS =
  "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-white leading-none translate-y-0.5" as const;

/** Madness ✺ in its ring — bottom-aligned via the ring container, not vertical translate. */
export const OUTCOME_DIALOG_MADNESS_ICON_CLASS =
  "font-noto-symbols-2 inline-flex text-4xl text-violet-300/90 leading-none" as const;

/** Insight 🟖 glyph in its ring — blue; translate nudges emoji down for optical center. */
export const OUTCOME_DIALOG_INSIGHT_ICON_CLASS =
  "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-blue-400 leading-none translate-y-1.5" as const;

export type OutcomeDialogVariant = "success" | "loss" | "madness" | "insight";

export interface OutcomeDialogEffectTheme {
  border: string;
  iconRing: string;
  glowRgb: string;
}

interface OutcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  successLog?: string;
  title: string;
  variant: OutcomeDialogVariant;
  /** When set, overrides variant border/ring/glow (e.g. village timed-effect announcements). */
  effectTheme?: OutcomeDialogEffectTheme;
  buttonText: string;
  buttonId: string;
  children?: React.ReactNode;
}

const variantStyles = {
  success: {
    border: "border-amber-600",
    glow: "reward-dialog-glow-success",
    iconRing: "border-amber-500/45 bg-amber-950/35",
  },
  loss: {
    border: "border-orange-800",
    glow: "reward-dialog-glow-loss",
    iconRing: "border-orange-700/45 bg-orange-950/25",
  },
  madness: {
    border: "border-violet-600",
    glow: "madness-dialog-glow",
    iconRing: "border-violet-500/45 bg-violet-950/35",
  },
  insight: {
    border: "border-blue-600",
    glow: "insight-dialog-glow",
    iconRing: "border-blue-500/45 bg-blue-950/35",
  },
} as const;

export default function OutcomeDialog({
  isOpen,
  onClose,
  icon,
  successLog,
  title,
  variant,
  effectTheme,
  buttonText,
  buttonId,
  children,
}: OutcomeDialogProps) {
  const variantStyle = variantStyles[variant];
  const border = effectTheme?.border ?? variantStyle.border;
  const iconRing = effectTheme?.iconRing ?? variantStyle.iconRing;
  const glowClass = effectTheme
    ? "outcome-dialog-effect-glow"
    : variantStyle.glow;
  const iconRingAlignMadness =
    !effectTheme && variant === "madness" ? "items-end pb-1.5" : "items-center";
  const iconUsesColoredGlyph =
    Boolean(effectTheme) || variant === "madness" || variant === "insight";
  // Empty fragments (e.g. RewardDialog with no items) must not count as body content.
  const hasBodyContent = React.Children.toArray(children).some(Boolean);

  return (
    <>
      <style>{`
        .reward-dialog-glow-success {
          animation: reward-glow-pulse-success 2.5s ease-in-out infinite;
        }
        .reward-dialog-glow-loss {
          animation: reward-glow-pulse-loss 2.5s ease-in-out infinite;
        }
        .madness-dialog-glow {
          animation: madness-glow-pulse 2.5s ease-in-out infinite;
        }
        .insight-dialog-glow {
          animation: insight-glow-pulse 2.5s ease-in-out infinite;
        }
        .outcome-dialog-effect-glow {
          animation: outcome-dialog-effect-glow-pulse 2.5s ease-in-out infinite;
        }
        @keyframes reward-glow-pulse-success {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(234, 179, 8, 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(234, 179, 8, 0.5); }
        }
        @keyframes reward-glow-pulse-loss {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(146, 64, 14, 0.35); }
          50% { box-shadow: 0 0 0px 0px rgba(146, 64, 14, 0.6); }
        }
        @keyframes madness-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(124, 58, 237, 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(124, 58, 237, 0.5); }
        }
        @keyframes insight-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(37, 99, 235, 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(37, 99, 235, 0.5); }
        }
        @keyframes outcome-dialog-effect-glow-pulse {
          0%, 100% { box-shadow: 0 0 15px 5px rgba(var(--outcome-dialog-glow-rgb), 0.25); }
          50% { box-shadow: 0 0 0px 0px rgba(var(--outcome-dialog-glow-rgb), 0.5); }
        }
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className={`[--adc-dialog-max-w:24rem] z-[70] [&>button]:hidden border-2 shadow-2xl ${border}`}
        >
          <div
            className={`absolute inset-0 -z-10 pointer-events-none ${glowClass}`}
            style={
              effectTheme
                ? ({
                  ["--outcome-dialog-glow-rgb" as string]:
                    effectTheme.glowRgb,
                } as React.CSSProperties)
                : undefined
            }
          />
          <DialogHeader>
            <div className="relative z-[1] flex w-full justify-center">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-full border-2",
                  iconRingAlignMadness,
                  iconRing,
                  !iconUsesColoredGlyph && "text-white",
                )}
              >
                {icon}
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-semibold text-foreground tracking-tight">
              {title}
            </DialogTitle>
            {successLog && (
              <div className="text-sm text-muted-foreground leading-relaxed mt-2 pb-2">
                {successLog}
              </div>
            )}
            {hasBodyContent ? (
              <div className="mt-2 h-px w-full bg-white/10" />
            ) : null}
          </DialogHeader>

          {hasBodyContent ? (
            <div className="text-sm pt-4 pb-2 space-y-1 text-left">{children}</div>
          ) : null}

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              variant="outline"
              className="text-xs h-8"
              button_id={buttonId}
            >
              {buttonText}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
