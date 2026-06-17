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

/** Insight 🟖 glyph in its ring — blue to match the Insight resource styling. */
export const OUTCOME_DIALOG_INSIGHT_ICON_CLASS =
  "font-noto-symbols-2 inline-flex items-center justify-center text-4xl text-blue-400 leading-none translate-y-0.5" as const;

export type OutcomeDialogVariant = "success" | "loss" | "madness" | "insight";

interface OutcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  successLog?: string;
  title: string;
  variant: OutcomeDialogVariant;
  buttonText: string;
  buttonId: string;
  children: React.ReactNode;
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
  buttonText,
  buttonId,
  children,
}: OutcomeDialogProps) {
  const { border, glow, iconRing } = variantStyles[variant];

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
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className={`[--adc-dialog-max-w:24rem] z-[70] [&>button]:hidden border-2 shadow-2xl ${border}`}
        >
          <div className={`absolute inset-0 -z-10 pointer-events-none ${glow}`} />
          <DialogHeader>
            <div className="relative z-[1] flex w-full justify-center">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 justify-center rounded-full border-2",
                  variant === "madness" ? "items-end pb-1.5" : "items-center",
                  iconRing,
                  variant !== "madness" && variant !== "insight" && "text-white",
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
            <div className="my-2 h-px w-full bg-white/10" />
          </DialogHeader>

          <div className="text-sm pb-2 space-y-1 text-left">{children}</div>

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
