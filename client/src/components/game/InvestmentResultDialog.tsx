import React from "react";
import OutcomeDialog, {
  OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS,
} from "./OutcomeDialog";
import { cn, formatNumber } from "@/lib/utils";
import type {
  InvestmentOutcomeUiKind,
  InvestmentResultDialogPayload,
} from "@/game/rules/investmentHallTables";

interface InvestmentResultDialogProps {
  isOpen: boolean;
  data: InvestmentResultDialogPayload | null;
  onClose: () => void;
}

function OutcomeIcon({ kind }: { kind: InvestmentOutcomeUiKind }) {
  const cls = cn(OUTCOME_DIALOG_REWARD_STYLE_ICON_CLASS, "inline-block");
  switch (kind) {
    case "lucky_chance":
      return (
        <span className={cls} aria-hidden>
          ⇮
        </span>
      );
    case "wipeout":
      return (
        <span className={`${cls} rotate-180`} aria-hidden>
          ⇮
        </span>
      );
    case "partial_loss":
      return (
        <span className={cls} aria-hidden>
          ⇩
        </span>
      );
    case "success":
      return (
        <span className={cls} aria-hidden>
          ⇧
        </span>
      );
  }
}

export default function InvestmentResultDialog({
  isOpen,
  data,
  onClose,
}: InvestmentResultDialogProps) {
  if (!data) return null;

  const { kind, goldDelta, briefText } = data;
  const isLoss = kind === "partial_loss" || kind === "wipeout";

  const goldLine = (
    <div className="text-sm text-foreground tabular-nums">
      {goldDelta >= 0 ? "+" : "-"}
      {formatNumber(Math.abs(goldDelta))} Gold
    </div>
  );

  return (
    <OutcomeDialog
      isOpen={isOpen}
      onClose={onClose}
      icon={<OutcomeIcon kind={kind} />}
      successLog={briefText}
      title="Investment Result"
      variant={isLoss ? "loss" : "success"}
      buttonText="Continue"
      buttonId="investment-result-dialog-continue"
    >
      {goldLine}
    </OutcomeDialog>
  );
}
