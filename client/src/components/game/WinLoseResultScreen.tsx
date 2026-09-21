import { motion } from "framer-motion";
import React from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type WinLoseResultKind = "victory" | "defeat";

export type WinLoseResultLine = { key: string; text: string; className: string };

const DEFEAT_LINES_START = 1.8;
const DEFEAT_LINE_STAGGER = 1.0;
const VICTORY_LINES_START = 1.8;
const VICTORY_LINE_STAGGER = 0.3;

/** Keep the fight / dice board up after a win or loss so the last action can be read. */
export const WIN_LOSE_BOARD_HOLD_MS = 1500;

/** Compact win/lose screen. Sizes the dialog to the title, result lines, and Continue. */
export function WinLoseResultScreen({
  kind,
  title,
  lines,
  onContinue,
  continueLabel,
  continueButtonId = "combat-end-fight",
}: {
  kind: WinLoseResultKind;
  title: string;
  lines: WinLoseResultLine[];
  onContinue: () => void;
  continueLabel: string;
  continueButtonId?: string;
}) {
  const isDefeat = kind === "defeat";
  const linesStart = isDefeat ? DEFEAT_LINES_START : VICTORY_LINES_START;
  const lineStagger = isDefeat ? DEFEAT_LINE_STAGGER : VICTORY_LINE_STAGGER;
  const buttonDelay =
    linesStart + Math.max(0, lines.length - 1) * lineStagger + 0.4 + 0.5;

  return (
    <div className="flex flex-col items-center">
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <motion.span
        className={
          isDefeat
            ? "font-sans text-red-700 text-xl tracking-[0.25em] uppercase select-none defeat-text-pulse"
            : "font-sans text-white text-xl tracking-[0.25em] uppercase select-none"
        }
        initial={{ opacity: 0 }}
        animate={isDefeat ? { opacity: [0, 1, 0.8] } : { opacity: 1 }}
        transition={{
          duration: isDefeat ? 2 : 1.2,
          delay: 0.3,
          ease: "easeInOut",
        }}
      >
        {title}
      </motion.span>

      <div className="mt-5 flex flex-col items-center gap-1 text-center">
        {lines.map((line, i) => (
          <motion.p
            key={line.key}
            className={line.className}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.4,
              delay: linesStart + i * lineStagger,
            }}
          >
            {line.text}
          </motion.p>
        ))}
      </div>

      <motion.div
        className="mt-6 w-full"
        initial={{ opacity: 0, pointerEvents: "none" }}
        animate={{
          opacity: 1,
          transitionEnd: { pointerEvents: "auto" },
        }}
        transition={{
          duration: 0.5,
          delay: buttonDelay,
        }}
      >
        <Button
          onClick={onContinue}
          className="w-full"
          variant="outline"
          button_id={continueButtonId}
        >
          {continueLabel}
        </Button>
      </motion.div>
    </div>
  );
}
