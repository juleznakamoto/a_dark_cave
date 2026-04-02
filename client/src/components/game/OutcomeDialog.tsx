import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Matches `RewardDialog` icon wrapper so outcome glyphs read the same (size + white on amber/orange). */
export const OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS =
  "text-4xl text-white leading-none" as const;

export type OutcomeDialogVariant = "success" | "loss" | "madness";

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
      `}</style>
      <Dialog open={isOpen} onOpenChange={() => { }}>
        <DialogContent
          className={`w-[95vw] sm:max-w-sm z-[70] [&>button]:hidden border-2 shadow-2xl ${border}`}
        >
          <div className={`absolute inset-0 -z-10 pointer-events-none ${glow}`} />
          <DialogHeader className="text-center sm:text-center">
            <div className="relative z-[1] flex justify-center">
              <div
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2",
                  iconRing,
                  variant !== "madness" && "text-white",
                )}
              >
                {icon}
              </div>
            </div>
            <DialogTitle className="text-center text-lg font-semibold text-foreground tracking-tight">
              {title}
            </DialogTitle>
            {successLog && (
              <div className="text-sm text-foreground text-center px-2 pb-0 pt-0">
                {successLog}
              </div>
            )}
            <div className="my-2 h-px w-full bg-white/10" />
          </DialogHeader>

          <div className="text-sm pb-2 space-y-1">{children}</div>

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
